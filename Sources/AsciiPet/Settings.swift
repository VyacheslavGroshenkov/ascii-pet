import Foundation

enum PetSize: Int, CaseIterable {
    case small = 96
    case medium = 128
    case large = 176

    var title: String {
        switch self {
        case .small: "Маленький"
        case .medium: "Средний"
        case .large: "Большой"
        }
    }
}

enum Backdrop: String, CaseIterable {
    case clear, dark, light

    var title: String {
        switch self {
        case .dark: "Тёмный"
        case .light: "Светлый"
        case .clear: "Без фона"
        }
    }
}

/// Интервал автосмены анимации, секунды; 0 — выключено.
enum Cycle: Int, CaseIterable {
    case off = 0
    case s30 = 30
    case m1 = 60
    case m5 = 300

    var title: String {
        switch self {
        case .off: "Не менять"
        case .s30: "Каждые 30 секунд"
        case .m1: "Каждую минуту"
        case .m5: "Каждые 5 минут"
        }
    }
}

/// Настройки в UserDefaults; новые значения по умолчанию — через `register`.
struct Settings {
    private let defaults = UserDefaults.standard

    init() {
        defaults.register(defaults: [
            "piece": Pieces.all[0].id,
            "size": PetSize.medium.rawValue,
            "backdrop": Backdrop.clear.rawValue,
            "cycle": Cycle.m1.rawValue,
            "hops": true,
        ])
    }

    var piece: String {
        get { defaults.string(forKey: "piece") ?? Pieces.all[0].id }
        nonmutating set { defaults.set(newValue, forKey: "piece") }
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
}
