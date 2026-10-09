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

    /// Мышь: нажали на питомца — `pressed`; подержали или потянули — подняли и несут (`carried`),
    /// `offset` — от курсора до точки, за которую питомец стоит.
    private enum Grab {
        case none
        case pressed(at: CFTimeInterval, from: CGPoint)
        case carried(offset: CGPoint)
    }
    private var grab = Grab.none
    private var pressed: Bool { if case .none = grab { false } else { true } }
    private static let holdTime = 0.3
    private static let dragSlop: CGFloat = 4

    /// Точка пола под правым краем питомца в координатах экрана: по ней раскладывается окно,
    /// за неё питомца переносят, её и запоминают.
    private var anchor = CGPoint.zero

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
    private var bodyState: (y: CGFloat, sx: CGFloat, sy: CGFloat, tilt: CGFloat) = (0, 1, 1, 0)

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
        view.onDrag = { [weak self] in self?.drag() }
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
        // Смена плотности пикселей (окно перенесли на другой монитор) — только резкость слоёв, без перекладки:
        // иначе питомец посреди переноса отпрыгнул бы на сохранённое место.
        center.addObserver(self, selector: #selector(backingChanged), name: NSWindow.didChangeBackingPropertiesNotification, object: window)
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
        if pressed, NSEvent.pressedMouseButtons & 1 == 0 { release(inside: false) }
        // Подержали, не двигая, — поднимаем: дальше его можно нести.
        if case .pressed(let at, _) = grab, now - at >= Self.holdTime { pickUp() }
        updateMousePassthrough()

        if now >= nextFrameAt {
            renderFrame(at: now)
            let step = 1 / fps
            nextFrameAt = now - nextFrameAt > step ? now + step : nextFrameAt + step
        }

        stepHop(now)

        if hop == nil, !pressed {
            let cycle = settings.cycle
            // Сам прыгает, только если прыжки включены и не включено «Уменьшить движение»; по клику — всегда.
            let hopsOnOwn = settings.hops && !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion
            if cycle != .off, now - shownSince >= Double(cycle.rawValue) {
                // Автосмена без прыжков — плавной сменой на месте.
                let next = (pieceIndex + 1) % Pieces.all.count
                if hopsOnOwn { jump(swapTo: next) } else { swap(to: next) }
            } else if hopsOnOwn, now >= nextIdleHopAt {
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
            switch grab {
            case .none: applyBody(y: 0, sx: 1, sy: 1)
            case .pressed: applyBody(y: 0, sx: 1.07, sy: 0.9)
            // Подняли: чуть над полом, крупнее и покачивается, как в руке.
            case .carried: applyBody(y: 7, sx: 1.05, sy: 1.05, tilt: CGFloat(sin(now * 9)) * 0.06)
            }
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

    private func applyBody(y: CGFloat, sx: CGFloat, sy: CGFloat, tilt: CGFloat = 0) {
        // В покое значения не меняются — не коммитим транзакцию Core Animation на каждом тике.
        guard (y, sx, sy, tilt) != bodyState else { return }
        bodyState = (y, sx, sy, tilt)
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        let lifted = CATransform3DRotate(CATransform3DMakeTranslation(0, y, 0), tilt, 0, 0, 1)
        body.transform = CATransform3DScale(lifted, sx, sy, 1)
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
        // Схватить можно и в прыжке: прыжок обрывается, а обещанная им смена анимации — нет.
        if let target = hop?.swapTo { swap(to: target) }
        hop = nil
        extraHops = 0
        grab = .pressed(at: CACurrentMediaTime(), from: NSEvent.mouseLocation)
        updateTickRate()
    }

    private func drag() {
        let mouse = NSEvent.mouseLocation
        switch grab {
        case .none:
            break
        case .pressed(_, let from):
            // Потянули, не дожидаясь удержания, — тоже поднимаем.
            if hypot(mouse.x - from.x, mouse.y - from.y) > Self.dragSlop { pickUp() }
        case .carried(let offset):
            anchor = clamped(CGPoint(x: mouse.x - offset.x, y: mouse.y - offset.y))
            placeWindow()
        }
    }

    private func pickUp() {
        let mouse = NSEvent.mouseLocation
        grab = .carried(offset: CGPoint(x: mouse.x - anchor.x, y: mouse.y - anchor.y))
    }

    /// Короткий клик меняет анимацию; если питомца несли — он встаёт на новое место и его запоминаем.
    private func release(inside: Bool) {
        switch grab {
        case .none:
            return
        case .pressed:
            grab = .none
            if inside { next() } else { updateTickRate() }
        case .carried:
            grab = .none
            settings.anchor = anchor
            // Плюх: сразу последняя фаза прыжка — приземление.
            hop = Hop(start: CACurrentMediaTime() - crouch - airTime(maxHop), height: maxHop, swapTo: nil)
            updateTickRate()
        }
    }

    // MARK: - Окно и оформление

    private func layoutWindow() {
        let size = NSSize(width: box + pad * 2, height: floorY + box + maxHop + pad * 2)
        // Пока питомца несут, место задаёт курсор, а не сохранённая точка.
        if case .carried = grab { anchor = clamped(anchor) } else { anchor = clamped(settings.anchor ?? cornerAnchor()) }
        window.setFrame(NSRect(origin: windowOrigin(size), size: size), display: false)
        view.frame = NSRect(origin: .zero, size: size)
        backingChanged()
        layoutBody()
    }

    @objc private func backingChanged() {
        let scale = window.backingScaleFactor
        for layer in [view.layer!, floorShadow, body, bubble, glow, ink, art] {
            layer.contentsScale = scale
        }
        art.setNeedsDisplay()
    }

    private func placeWindow() {
        window.setFrameOrigin(windowOrigin(window.frame.size))
    }

    /// Правый край тела питомца — на `anchor.x`, пол — на `anchor.y` (см. layoutBody).
    private func windowOrigin(_ size: NSSize) -> NSPoint {
        NSPoint(x: anchor.x + pad - size.width, y: anchor.y - floorY)
    }

    /// Правый нижний угол основного экрана — место по умолчанию.
    private func cornerAnchor() -> CGPoint {
        guard let area = NSScreen.screens.first?.visibleFrame else { return .zero }
        return CGPoint(x: area.maxX - 4 - pad, y: area.minY + 2 + floorY)
    }

    /// Питомец целиком в видимой области экрана, на котором стоит: не под Dock и не за краем.
    /// Точка вне экранов (щель между мониторами, отключённый монитор) прижимается к ближайшему.
    private func clamped(_ p: CGPoint) -> CGPoint {
        let distance = { (f: CGRect) in hypot(max(f.minX - p.x, 0, p.x - f.maxX), max(f.minY - p.y, 0, p.y - f.maxY)) }
        let screen = NSScreen.screens.min { distance($0.frame) < distance($1.frame) }
        guard let area = screen?.visibleFrame else { return p }
        return CGPoint(x: min(max(p.x, area.minX + box), area.maxX),
                       y: min(max(p.y, area.minY), area.maxY - box))
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
        let lang = settings.language
        let t = { (key: L10n.Key) in L10n.text(key, lang) }

        let current = NSMenuItem(title: Pieces.all[pieceIndex].title(lang), action: nil, keyEquivalent: "")
        current.isEnabled = false
        menu.addItem(current)
        menu.addItem(item(t(.nextAnimation), #selector(nextAction)))

        let pieces = NSMenu()
        for (i, style) in Pieces.all.enumerated() {
            pieces.addItem(item(style.title(lang), #selector(pickPiece(_:)), tag: i, on: i == pieceIndex))
        }
        menu.addItem(submenu(t(.animation), pieces))
        menu.addItem(.separator())

        let cycles = NSMenu()
        for cycle in Cycle.allCases {
            cycles.addItem(item(t(cycle.title), #selector(pickCycle(_:)), tag: cycle.rawValue, on: cycle == settings.cycle))
        }
        menu.addItem(submenu(t(.autoSwitch), cycles))

        let sizes = NSMenu()
        for size in PetSize.allCases {
            sizes.addItem(item(t(size.title), #selector(pickSize(_:)), tag: size.rawValue, on: size == settings.size))
        }
        menu.addItem(submenu(t(.size), sizes))
        let corner = item(t(.backToCorner), #selector(backToCorner))
        // Переставить — зажать питомца мышью и перенести; вернуть можно отсюда.
        corner.isEnabled = settings.anchor != nil
        menu.addItem(corner)

        let backdrops = NSMenu()
        for (i, backdrop) in Backdrop.allCases.enumerated() {
            backdrops.addItem(item(t(backdrop.title), #selector(pickBackdrop(_:)), tag: i, on: backdrop == settings.backdrop))
        }
        menu.addItem(submenu(t(.backdrop), backdrops))

        menu.addItem(item(t(.hops), #selector(toggleHops), on: settings.hops))
        let login = item(t(.launchAtLogin), #selector(toggleLogin), on: SMAppService.mainApp.status == .enabled)
        // Регистрация входа работает только у собранного .app.
        login.isEnabled = Bundle.main.bundleURL.pathExtension == "app"
        menu.addItem(login)

        // Названия языков — на самих языках, поэтому этот пункт найдётся при любом текущем.
        let languages = NSMenu()
        for (i, language) in Language.allCases.enumerated() {
            languages.addItem(item(language.name, #selector(pickLanguage(_:)), tag: i, on: language == lang))
        }
        menu.addItem(submenu(t(.language), languages))
        menu.addItem(.separator())
        menu.addItem(item(t(.source), #selector(openSource)))
        let quit = NSMenuItem(title: t(.quit), action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
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
        // Правый клик посреди переноса: ставим питомца там, где он сейчас, а не бросаем.
        if case .carried = grab { release(inside: false) }
        grab = .none
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

    @objc private func pickLanguage(_ sender: NSMenuItem) {
        settings.language = Language.allCases[sender.tag]
    }

    @objc private func backToCorner() {
        settings.anchor = nil
        layoutWindow()
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
