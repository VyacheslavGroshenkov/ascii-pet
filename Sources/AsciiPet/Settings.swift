import Foundation

enum PetSize: Int, CaseIterable {
    case small = 96
    case medium = 128
    case large = 176

    var title: L10n.Key {
        switch self {
        case .small: .small
        case .medium: .medium
        case .large: .large
        }
    }
}

enum Backdrop: String, CaseIterable {
    case clear, dark, light

    var title: L10n.Key {
        switch self {
        case .clear: .noBackdrop
        case .dark: .dark
        case .light: .light
        }
    }
}

/// Интервал автосмены анимации, секунды; 0 — выключено.
enum Cycle: Int, CaseIterable {
    case off = 0
    case s30 = 30
    case m1 = 60
    case m5 = 300

    var title: L10n.Key {
        switch self {
        case .off: .switchOff
        case .s30: .every30s
        case .m1: .everyMinute
        case .m5: .every5m
        }
    }
}

/// Настройки в UserDefaults; новые значения по умолчанию — через `register`.
struct Settings {
    private let defaults = UserDefaults.standard

    init() {
        defaults.register(defaults: [
            "piece": Pieces.all.first?.id ?? "",
            "size": PetSize.medium.rawValue,
            "backdrop": Backdrop.clear.rawValue,
            "cycle": Cycle.m1.rawValue,
            // Сам не прыгает: прыжки раз в несколько секунд отвлекают; включаются в меню.
            "hops": false,
        ])
    }

    var piece: String {
        get { defaults.string(forKey: "piece") ?? "" }
        nonmutating set { defaults.set(newValue, forKey: "piece") }
    }

    var language: Language {
        get { Language.saved }
        nonmutating set { defaults.set(newValue.rawValue, forKey: "language") }
    }

    var size: PetSize {
        get { PetSize(rawValue: defaults.integer(forKey: "size")) ?? .medium }
        nonmutating set { defaults.set(newValue.rawValue, forKey: "size") }
    }

    var backdrop: Backdrop {
        get { Backdrop(rawValue: defaults.string(forKey: "backdrop") ?? "") ?? .clear }
        nonmutating set { defaults.set(newValue.rawValue, forKey: "backdrop") }
    }

    var cycle: Cycle {
        get { Cycle(rawValue: defaults.integer(forKey: "cycle")) ?? .m1 }
        nonmutating set { defaults.set(newValue.rawValue, forKey: "cycle") }
    }

    var hops: Bool {
        get { defaults.bool(forKey: "hops") }
        nonmutating set { defaults.set(newValue, forKey: "hops") }
    }

    /// Куда питомца переставили: точка пола под его правым краем, в координатах экрана.
    /// nil — правый нижний угол основного экрана.
    var anchor: CGPoint? {
        get {
            guard let xy = defaults.array(forKey: "anchor") as? [Double], xy.count == 2 else { return nil }
            return CGPoint(x: xy[0], y: xy[1])
        }
        nonmutating set {
            if let p = newValue { defaults.set([Double(p.x), Double(p.y)], forKey: "anchor") } else { defaults.removeObject(forKey: "anchor") }
        }
    }
}
