import AppKit

/// Прозрачная панель поверх окон: не забирает фокус, видна на всех рабочих столах
/// и поверх полноэкранных приложений.
final class PetWindow: NSPanel {
    init() {
        super.init(contentRect: .zero, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        isOpaque = false
        backgroundColor = .clear
        hasShadow = false
        level = .floating
        collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary, .ignoresCycle]
        isMovable = false
        hidesOnDeactivate = false
        isReleasedWhenClosed = false
        animationBehavior = .none
    }

    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
}

/// Хост слоёв питомца; мышь отдаёт контроллеру.
final class PetView: NSView {
    var onPress: (() -> Void)?
    var onRelease: ((_ inside: Bool) -> Void)?
    var onMenu: ((NSEvent) -> Void)?
    var hitTest: ((NSPoint) -> Bool)?

    override init(frame: NSRect) {
        super.init(frame: frame)
        // Слой задаётся до wantsLayer — layer-hosting view: слоями управляем сами.
        layer = CALayer()
        wantsLayer = true
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }

    override func mouseDown(with event: NSEvent) {
        if event.modifierFlags.contains(.control) { onMenu?(event); return }
        onPress?()
    }

    override func mouseUp(with event: NSEvent) {
        if event.modifierFlags.contains(.control) { return }
        onRelease?(hitTest?(convert(event.locationInWindow, from: nil)) ?? false)
    }

    override func rightMouseDown(with event: NSEvent) { onMenu?(event) }
}
