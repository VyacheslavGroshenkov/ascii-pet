import Foundation

/// Язык меню. По умолчанию английский; переключается в меню и применяется сразу.
/// Новый язык: case здесь, его название в `name` и перевод каждой строки в `L10n.table`.
enum Language: String, CaseIterable {
    case en, ru, zh

    /// Название на самом языке — так его узнают в списке при любом текущем языке.
    var name: String {
        switch self {
        case .en: "English"
        case .ru: "Русский"
        case .zh: "中文"
        }
    }

    /// Сохранённый выбор. Читается без `Settings`, потому что нужен и до загрузки анимаций (для ошибки).
    static var saved: Language {
        Language(rawValue: UserDefaults.standard.string(forKey: "language") ?? "") ?? .en
    }
}

enum L10n {
    enum Key: CaseIterable {
        case nextAnimation, animation, language
        case autoSwitch, switchOff, every30s, everyMinute, every5m
        case size, small, medium, large, backToCorner
        case backdrop, noBackdrop, dark, light
        case hops, launchAtLogin, source, quit, loadFailed
    }

    /// Строка на языке `language`; если перевода нет — по-английски.
    static func text(_ key: Key, _ language: Language) -> String {
        let row = table[key] ?? [:]
        return row[language] ?? row[.en] ?? "\(key)"
    }

    // Переводы стоят рядом, чтобы при правке одного языка было видно остальные.
    private static let table: [Key: [Language: String]] = [
        .nextAnimation: [.en: "Next Animation", .ru: "Следующая анимация", .zh: "下一个动画"],
        .animation: [.en: "Animation", .ru: "Анимация", .zh: "动画"],
        .language: [.en: "Language", .ru: "Язык", .zh: "语言"],
        .autoSwitch: [.en: "Switch Animations", .ru: "Смена анимаций", .zh: "自动切换"],
        .switchOff: [.en: "Never", .ru: "Не менять", .zh: "不切换"],
        .every30s: [.en: "Every 30 Seconds", .ru: "Каждые 30 секунд", .zh: "每 30 秒"],
        .everyMinute: [.en: "Every Minute", .ru: "Каждую минуту", .zh: "每分钟"],
        .every5m: [.en: "Every 5 Minutes", .ru: "Каждые 5 минут", .zh: "每 5 分钟"],
        .size: [.en: "Size", .ru: "Размер", .zh: "大小"],
        .small: [.en: "Small", .ru: "Маленький", .zh: "小"],
        .medium: [.en: "Medium", .ru: "Средний", .zh: "中"],
        .large: [.en: "Large", .ru: "Большой", .zh: "大"],
        .backToCorner: [.en: "Back to the Corner", .ru: "Вернуть в угол", .zh: "回到角落"],
        .backdrop: [.en: "Backdrop", .ru: "Фон", .zh: "背景"],
        .noBackdrop: [.en: "None", .ru: "Без фона", .zh: "无背景"],
        .dark: [.en: "Dark", .ru: "Тёмный", .zh: "深色"],
        .light: [.en: "Light", .ru: "Светлый", .zh: "浅色"],
        .hops: [.en: "Hop Around", .ru: "Подпрыгивать", .zh: "自己蹦跳"],
        .launchAtLogin: [.en: "Launch at Login", .ru: "Запускать при входе", .zh: "登录时启动"],
        .source: [.en: "Animations: ascii.rest ↗", .ru: "Анимации: ascii.rest ↗", .zh: "动画来源：ascii.rest ↗"],
        .quit: [.en: "Quit AsciiPet", .ru: "Выйти", .zh: "退出 AsciiPet"],
        .loadFailed: [.en: "Couldn't load the animations", .ru: "Не удалось загрузить анимации", .zh: "无法加载动画"],
    ]
}
