import AppKit
import JavaScriptCore
import QuartzCore
import ServiceManagement

/// Питомец в правом нижнем углу: проигрывает анимацию, подпрыгивает, по клику меняет анимацию.
///
/// Слои (снизу вверх): тень на «полу» → body (якорь снизу по центру, к нему применяется прыжок)
/// → bubble (подложка) → glow (свечение/обводка) → ink (градиент) с маской art (глифы кадра).
@MainActor
final class PetController: NSObject {
    private let engine: PieceEngine
    private let settings = Settings()
    private let window = PetWindow()
    private let view = PetView(frame: .zero)

    private let floorShadow = CAGradientLayer()
    private let body = CALayer()
    private let bubble = CALayer()
    private let glow = CALayer()
    private let ink = CAGradientLayer()
    private let art = AsciiLayer()

    private var pieceIndex = 0
    private var frame: JSValue?
    private var meta = PieceMeta(cols: 1, rows: 1, fps: 15)
    private var pieceStart: CFTimeInterval = 0
    private var nextFrameAt: CFTimeInterval = 0
    private var shownSince: CFTimeInterval = 0

    private struct Hop {
        let start: CFTimeInterval
        let height: CGFloat
        var swapTo: Int?
    }
    private var hop: Hop?
    private var extraHops = 0
    private var nextIdleHopAt: CFTimeInterval = 0
    private var pressed = false

    /// Анимации рассчитаны на 15–30 к/с; в миниатюре 20 не отличить от 30, а процессора уходит на треть меньше.
    private static let maxFps = 20.0
    /// Доля ядра, которую можно отдать JS анимации. Лёгкие в неё не упираются,
    /// тяжёлые (костёр считает кадр 5–6 мс) получают меньше кадров, но не меньше minFps.
    private static let jsBudget = 0.08
    private static let minFps = 10.0
    /// Средняя цена кадра в JS, секунды (скользящее среднее).
    private var frameCost = 0.0
    private var baseFps: Double { min(max(meta.fps, 1), Self.maxFps) }
    private var fps: Double {
        guard frameCost > 0 else { return baseFps }
        return min(baseFps, max(Self.jsBudget / frameCost, Self.minFps))
    }
    private var bodyState: (y: CGFloat, sx: CGFloat, sy: CGFloat) = (0, 1, 1)

    private var timer: Timer?
    private var tickRate: Double = 0
    private var asleep = false

    // Геометрия, пересчитывается от размера питомца.
    private var box: CGFloat { CGFloat(settings.size.rawValue) }
    private var inset: CGFloat { (box * 0.07).rounded() }
    private let pad: CGFloat = 12
    private let floorY: CGFloat = 10
    private var maxHop: CGFloat { min(box * 0.32, 52) }

    init(engine: PieceEngine) {
        self.engine = engine
        super.init()
        pieceIndex = Pieces.index(of: settings.piece) ?? 0

        window.contentView = view
        view.onPress = { [weak self] in self?.press() }
        view.onRelease = { [weak self] inside in self?.release(inside: inside) }
        view.onMenu = { [weak self] event in self?.showContextMenu(event) }
        view.hitTest = { [weak self] point in self?.bodyContains(point) ?? false }

        let root = view.layer!
        for layer in [floorShadow, body, bubble, glow, ink, art] as [CALayer] {
            layer.actions = ["position": NSNull(), "bounds": NSNull(), "transform": NSNull(), "opacity": NSNull()]
        }
        root.addSublayer(floorShadow)
        root.addSublayer(body)
        body.addSublayer(bubble)
        body.addSublayer(glow)
        glow.addSublayer(ink)
        ink.mask = art
        body.anchorPoint = CGPoint(x: 0.5, y: 0)

        floorShadow.type = .radial
        floorShadow.colors = [NSColor(white: 0, alpha: 0.32).cgColor, NSColor(white: 0, alpha: 0).cgColor]
        floorShadow.startPoint = CGPoint(x: 0.5, y: 0.5)
        floorShadow.endPoint = CGPoint(x: 1, y: 1)
        // Ось градиента — сверху вниз (в слоях macOS y растёт вверх).
        ink.startPoint = CGPoint(x: 0.5, y: 1)
        ink.endPoint = CGPoint(x: 0.5, y: 0)

        let center = NotificationCenter.default
        center.addObserver(self, selector: #selector(screensChanged), name: NSApplication.didChangeScreenParametersNotification, object: nil)
        center.addObserver(self, selector: #selector(screensChanged), name: NSWindow.didChangeBackingPropertiesNotification, object: window)
        center.addObserver(self, selector: #selector(visibilityChanged), name: NSWindow.didChangeOcclusionStateNotification, object: window)
        let workspace = NSWorkspace.shared.notificationCenter
        workspace.addObserver(self, selector: #selector(screensSlept), name: NSWorkspace.screensDidSleepNotification, object: nil)
        workspace.addObserver(self, selector: #selector(screensWoke), name: NSWorkspace.screensDidWakeNotification, object: nil)
    }

    func start() {
        layoutWindow()
        load(pieceIndex)
        applyBackdrop()
        window.orderFrontRegardless()
        let now = CACurrentMediaTime()
        // Поздороваться прыжком вскоре после запуска.
        nextIdleHopAt = now + 0.8
        updateTickRate()
    }

    // MARK: - Анимация

    private func load(_ index: Int) {
        let style = Pieces.all[index]
        guard let meta = engine.meta(of: style.id), let frame = engine.makeFrame(of: style.id) else {
            NSLog("AsciiPet: no piece %@", style.id)
            return
        }
        pieceIndex = index
        settings.piece = style.id
        self.meta = meta
        self.frame = frame
        frameCost = 0
        let now = CACurrentMediaTime()
        pieceStart = now
        shownSince = now
        nextFrameAt = now
        art.setGrid(cols: meta.cols, rows: meta.rows)
        layoutBody()
        applyInk()
        renderFrame(at: now)
        updateTickRate()
    }

    private func renderFrame(at now: CFTimeInterval) {
        guard let frame else { return }
        let started = CACurrentMediaTime()
        let text = engine.render(frame, at: now - pieceStart, paper: settings.backdrop == .light)
        let cost = CACurrentMediaTime() - started
        frameCost = frameCost == 0 ? cost : frameCost * 0.9 + cost * 0.1
        if let text { art.show(text) }
    }

    @objc private func tick() {
        let now = CACurrentMediaTime()
        // mouseUp мог уйти другому окну — не залипаем в «нажатом» состоянии на 60 Гц.
        if pressed, NSEvent.pressedMouseButtons & 1 == 0 {
            pressed = false
            updateTickRate()
        }
        updateMousePassthrough()

        if now >= nextFrameAt {
            renderFrame(at: now)
            let step = 1 / fps
            nextFrameAt = now - nextFrameAt > step ? now + step : nextFrameAt + step
        }

        stepHop(now)

        if hop == nil, !pressed {
            let cycle = settings.cycle
            if cycle != .off, now - shownSince >= Double(cycle.rawValue) {
                jump(swapTo: (pieceIndex + 1) % Pieces.all.count)
            } else if settings.hops, now >= nextIdleHopAt {
                // Иногда — двойной прыжок.
                extraHops = Double.random(in: 0..<1) < 0.3 ? 1 : 0
                jump()
            }
        }
    }

    /// Пока идёт прыжок — 60 Гц, в покое — частота кадров анимации: питомец не греет процессор.
    private func updateTickRate() {
        // В покое — частота анимации без учёта бюджета: таймер не пересоздаётся от колебаний цены кадра,
        // лишние тики просто пропускают отрисовку.
        let rate = asleep ? 0 : (hop != nil || pressed ? 60 : max(baseFps, 10))
        guard rate != tickRate else { return }
        tickRate = rate
        timer?.invalidate()
        timer = nil
        guard rate > 0 else { return }
        let timer = Timer(timeInterval: 1 / rate, target: self, selector: #selector(tick), userInfo: nil, repeats: true)
        timer.tolerance = 0.1 / rate
        RunLoop.main.add(timer, forMode: .common)
        self.timer = timer
    }

    // MARK: - Прыжок

    private let crouch = 0.09, landing = 0.2

    private func jump(swapTo: Int? = nil) {
        let height = swapTo == nil ? maxHop * CGFloat.random(in: 0.55...1) : maxHop
        hop = Hop(start: CACurrentMediaTime(), height: height, swapTo: swapTo)
        updateTickRate()
    }

    private func airTime(_ height: CGFloat) -> Double { 0.5 * Double((height / maxHop).squareRoot()) }

    private func stepHop(_ now: CFTimeInterval) {
        guard var hop else {
            applyBody(y: 0, sx: pressed ? 1.07 : 1, sy: pressed ? 0.9 : 1)
            return
        }
        let air = airTime(hop.height)
        let τ = now - hop.start
        var y: CGFloat = 0, sx: CGFloat = 1, sy: CGFloat = 1

        if τ < crouch {
            // Присел перед прыжком.
            let k = CGFloat(sin(.pi / 2 * τ / crouch))
            sx = 1 + 0.1 * k
            sy = 1 - 0.13 * k
        } else if τ < crouch + air {
            let p = (τ - crouch) / air
            y = hop.height * CGFloat(4 * p * (1 - p))
            // Вытянут на взлёте и перед приземлением, нормален в верхней точке.
            let s = CGFloat(abs(2 * p - 1))
            sx = 1 - 0.05 * s
            sy = 1 + 0.08 * s
            if p >= 0.5, let target = hop.swapTo {
                hop.swapTo = nil
                self.hop = hop
                swap(to: target)
            }
        } else if τ < crouch + air + landing {
            // Приземлился: сплющился и пружинит обратно.
            let q = (τ - crouch - air) / landing
            let k = CGFloat(sin(.pi * q) * (1 - 0.3 * q))
            sx = 1 + 0.12 * k
            sy = 1 - 0.15 * k
        } else {
            self.hop = nil
            if extraHops > 0 {
                extraHops -= 1
                jump()
            } else {
                nextIdleHopAt = now + Double.random(in: 5...11)
                updateTickRate()
            }
            applyBody(y: 0, sx: 1, sy: 1)
            return
        }
        applyBody(y: y, sx: sx, sy: sy)
    }

    private func applyBody(y: CGFloat, sx: CGFloat, sy: CGFloat) {
        // В покое значения не меняются — не коммитим транзакцию Core Animation на каждом тике.
        guard (y, sx, sy) != bodyState else { return }
        bodyState = (y, sx, sy)
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        body.transform = CATransform3DScale(CATransform3DMakeTranslation(0, y, 0), sx, sy, 1)
        // Тень на полу сжимается и бледнеет, когда питомец в воздухе.
        let lift = maxHop > 0 ? min(y / maxHop, 1) : 0
        floorShadow.transform = CATransform3DMakeScale((1 - 0.45 * lift) * sx, 1 - 0.3 * lift, 1)
        floorShadow.opacity = Float(1 - 0.6 * lift)
        CATransaction.commit()
    }

    private func swap(to index: Int) {
        let fade = CATransition()
        fade.type = .fade
        fade.duration = 0.18
        body.add(fade, forKey: "swap")
        load(index)
    }

    // MARK: - Мышь

    private func bodyContains(_ point: NSPoint) -> Bool {
        body.frame.insetBy(dx: -2, dy: -2).contains(point)
    }

    /// Прозрачная часть окна не должна перехватывать клики у окон под ней.
    private func updateMousePassthrough() {
        // Пока кнопка зажата, окно должно получить mouseUp, даже если курсор ушёл с питомца.
        let inside = pressed || bodyContains(window.mouseLocationOutsideOfEventStream)
        if window.ignoresMouseEvents == inside { window.ignoresMouseEvents = !inside }
    }

    private func press() {
        guard hop == nil else { return }
        pressed = true
        updateTickRate()
    }

    private func release(inside: Bool) {
        guard pressed else { return }
        pressed = false
        if inside {
            next()
        } else {
            updateTickRate()
        }
    }

    // MARK: - Окно и оформление

    private func layoutWindow() {
        guard let screen = NSScreen.screens.first else { return }
        let size = NSSize(width: box + pad * 2, height: floorY + box + maxHop + pad * 2)
        let area = screen.visibleFrame
        let origin = NSPoint(x: area.maxX - size.width - 4, y: area.minY + 2)
        window.setFrame(NSRect(origin: origin, size: size), display: false)
        view.frame = NSRect(origin: .zero, size: size)
        let scale = window.backingScaleFactor
        for layer in [view.layer!, floorShadow, body, bubble, glow, ink, art] {
            layer.contentsScale = scale
        }
        layoutBody()
    }

    /// Ячейка вдвое выше своей ширины (как у символа) — так задуманы все анимации ascii.rest.
    private func layoutBody() {
        let inner = box - inset * 2
        let cell = min(inner / CGFloat(meta.cols), inner / CGFloat(meta.rows * 2))
        let artSize = CGSize(width: cell * CGFloat(meta.cols), height: cell * 2 * CGFloat(meta.rows))
        let bodySize = CGSize(width: artSize.width + inset * 2, height: artSize.height + inset * 2)
        let width = view.bounds.width

        CATransaction.begin()
        CATransaction.setDisableActions(true)
        // Правый край прижат к углу экрана, ширина зависит от пропорций анимации.
        body.bounds = CGRect(origin: .zero, size: bodySize)
        body.position = CGPoint(x: width - pad - bodySize.width / 2, y: floorY)
        bubble.frame = body.bounds
        bubble.cornerRadius = min(16, box * 0.12)
        bubble.shadowPath = CGPath(roundedRect: bubble.bounds, cornerWidth: bubble.cornerRadius,
                                   cornerHeight: bubble.cornerRadius, transform: nil)
        glow.frame = body.bounds
        ink.frame = CGRect(origin: CGPoint(x: inset, y: inset), size: artSize)
        art.frame = ink.bounds
        let shadowWidth = bodySize.width * 0.8
        floorShadow.bounds = CGRect(x: 0, y: 0, width: shadowWidth, height: 10)
        floorShadow.position = CGPoint(x: body.position.x, y: floorY)
        CATransaction.commit()
    }

    private func applyInk() {
        let style = Pieces.all[pieceIndex]
        let dim = settings.backdrop == .light
        // На светлой подложке пастельные цвета не читаются — затемняем.
        let top = dim ? style.top.blended(withFraction: 0.45, of: .black)! : style.top
        let bottom = dim ? style.bottom.blended(withFraction: 0.35, of: .black)! : style.bottom
        ink.colors = [top.cgColor, bottom.cgColor]
        if settings.backdrop == .dark { glow.shadowColor = style.bottom.cgColor }
    }

    private func applyBackdrop() {
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        switch settings.backdrop {
        case .dark:
            bubble.isHidden = false
            bubble.backgroundColor = NSColor(white: 0.06, alpha: 0.8).cgColor
            bubble.borderColor = NSColor(white: 1, alpha: 0.1).cgColor
            bubble.borderWidth = 1
            bubble.shadowOpacity = 0.3
            // Свечение цветом анимации.
            glow.shadowOpacity = 0.6
            glow.shadowRadius = 3
            glow.shadowOffset = .zero
        case .light:
            bubble.isHidden = false
            bubble.backgroundColor = NSColor(white: 0.97, alpha: 0.88).cgColor
            bubble.borderColor = NSColor(white: 0, alpha: 0.08).cgColor
            bubble.borderWidth = 1
            bubble.shadowOpacity = 0.22
            glow.shadowOpacity = 0
        case .clear:
            bubble.isHidden = true
            // Без подложки — тёмная обводка, чтобы читалось на любых обоях.
            glow.shadowColor = NSColor.black.cgColor
            glow.shadowOpacity = 0.9
            glow.shadowRadius = 1.2
            glow.shadowOffset = CGSize(width: 0, height: -0.5)
        }
        bubble.shadowColor = NSColor.black.cgColor
        bubble.shadowRadius = 6
        bubble.shadowOffset = CGSize(width: 0, height: -2)
        CATransaction.commit()
        applyInk()
        renderFrame(at: CACurrentMediaTime())
    }

    @objc private func screensChanged() {
        layoutWindow()
    }

    @objc private func visibilityChanged() {
        // Окно не видно (экран заблокирован и т. п.) — не тратим кадры.
        asleep = !window.occlusionState.contains(.visible)
        updateTickRate()
    }

    @objc private func screensSlept() {
        asleep = true
        updateTickRate()
    }

    @objc private func screensWoke() {
        asleep = !window.occlusionState.contains(.visible)
        updateTickRate()
    }

    // MARK: - Меню

    func populate(_ menu: NSMenu) {
        menu.removeAllItems()
        menu.autoenablesItems = false

        let current = NSMenuItem(title: Pieces.all[pieceIndex].title, action: nil, keyEquivalent: "")
        current.isEnabled = false
        menu.addItem(current)
        menu.addItem(item("Следующая анимация", #selector(nextAction)))

        let pieces = NSMenu()
        for (i, style) in Pieces.all.enumerated() {
            pieces.addItem(item(style.title, #selector(pickPiece(_:)), tag: i, on: i == pieceIndex))
        }
        menu.addItem(submenu("Анимация", pieces))
        menu.addItem(.separator())

        let cycles = NSMenu()
        for cycle in Cycle.allCases {
            cycles.addItem(item(cycle.title, #selector(pickCycle(_:)), tag: cycle.rawValue, on: cycle == settings.cycle))
        }
        menu.addItem(submenu("Смена анимаций", cycles))

        let sizes = NSMenu()
        for size in PetSize.allCases {
            sizes.addItem(item(size.title, #selector(pickSize(_:)), tag: size.rawValue, on: size == settings.size))
        }
        menu.addItem(submenu("Размер", sizes))

        let backdrops = NSMenu()
        for (i, backdrop) in Backdrop.allCases.enumerated() {
            backdrops.addItem(item(backdrop.title, #selector(pickBackdrop(_:)), tag: i, on: backdrop == settings.backdrop))
        }
        menu.addItem(submenu("Фон", backdrops))

        menu.addItem(item("Подпрыгивать", #selector(toggleHops), on: settings.hops))
        let login = item("Запускать при входе", #selector(toggleLogin), on: SMAppService.mainApp.status == .enabled)
        // Регистрация входа работает только у собранного .app.
        login.isEnabled = Bundle.main.bundleURL.pathExtension == "app"
        menu.addItem(login)
        menu.addItem(.separator())
        menu.addItem(item("Анимации: ascii.rest ↗", #selector(openSource)))
        let quit = NSMenuItem(title: "Выйти", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        menu.addItem(quit)
    }

    private func item(_ title: String, _ action: Selector, tag: Int = 0, on: Bool = false) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: action, keyEquivalent: "")
        item.target = self
        item.tag = tag
        item.state = on ? .on : .off
        return item
    }

    private func submenu(_ title: String, _ menu: NSMenu) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: nil, keyEquivalent: "")
        item.submenu = menu
        return item
    }

    private func showContextMenu(_ event: NSEvent) {
        pressed = false
        let menu = NSMenu()
        populate(menu)
        NSMenu.popUpContextMenu(menu, with: event, for: view)
    }

    @objc func nextAction() { next() }

    func next() {
        jump(swapTo: (pieceIndex + 1) % Pieces.all.count)
    }

    @objc private func pickPiece(_ sender: NSMenuItem) {
        guard sender.tag != pieceIndex else { return }
        jump(swapTo: sender.tag)
    }

    @objc private func pickCycle(_ sender: NSMenuItem) {
        settings.cycle = Cycle(rawValue: sender.tag) ?? .off
        shownSince = CACurrentMediaTime()
    }

    @objc private func pickSize(_ sender: NSMenuItem) {
        settings.size = PetSize(rawValue: sender.tag) ?? .medium
        layoutWindow()
    }

    @objc private func pickBackdrop(_ sender: NSMenuItem) {
        settings.backdrop = Backdrop.allCases[sender.tag]
        applyBackdrop()
    }

    @objc private func toggleHops() {
        settings.hops.toggle()
        nextIdleHopAt = CACurrentMediaTime() + 1
    }

    @objc private func toggleLogin() {
        do {
            if SMAppService.mainApp.status == .enabled {
                try SMAppService.mainApp.unregister()
            } else {
                try SMAppService.mainApp.register()
            }
        } catch {
            NSLog("AsciiPet: login item: %@", error.localizedDescription)
        }
    }

    @objc private func openSource() {
        NSWorkspace.shared.open(URL(string: "https://ascii.rest")!)
    }
}
