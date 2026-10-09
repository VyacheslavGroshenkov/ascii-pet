import AppKit

/// Анимация и её оформление в приложении: название в меню и градиент чернил сверху вниз.
/// `id` — имя модуля в бандле анимаций.
struct PieceStyle: Decodable {
    let id: String
    /// Название по языкам. В JSON — {"en": …, "ru": …, "zh": …} или одна строка на все языки.
    let titles: [String: String]
    let top: NSColor
    let bottom: NSColor

    private enum CodingKeys: String, CodingKey { case id, title, top, bottom }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        if let one = try? c.decode(String.self, forKey: .title) {
            titles = ["en": one]
        } else {
            titles = try c.decode([String: String].self, forKey: .title)
        }
        top = try Self.color(c, .top)
        bottom = try Self.color(c, .bottom)
    }

    /// Название на `language`; если перевода нет — английское, если нет и его — любое.
    func title(_ language: Language) -> String {
        titles[language.rawValue] ?? titles["en"] ?? titles.values.first ?? id
    }

    /// Цвет в JSON — "RRGGBB".
    private static func color(_ c: KeyedDecodingContainer<CodingKeys>, _ key: CodingKeys) throws -> NSColor {
        let hex = try c.decode(String.self, forKey: key)
        guard hex.count == 6, let v = UInt32(hex, radix: 16) else {
            throw DecodingError.dataCorruptedError(forKey: key, in: c, debugDescription: "expected RRGGBB, got \(hex)")
        }
        return NSColor(srgbRed: CGFloat((v >> 16) & 0xFF) / 255,
                       green: CGFloat((v >> 8) & 0xFF) / 255,
                       blue: CGFloat(v & 0xFF) / 255,
                       alpha: 1)
    }
}

/// Список анимаций в порядке меню. Читается при запуске из pieces.json: сначала приватные (local/),
/// если они собраны в приложение, потом публичные. Поэтому в коде нет ни одной конкретной анимации.
enum Pieces {
    private(set) static var all: [PieceStyle] = []

    static func load(_ lists: [URL]) throws {
        all = try lists.flatMap { try JSONDecoder().decode([PieceStyle].self, from: Data(contentsOf: $0)) }
        if all.isEmpty { throw CocoaError(.fileReadCorruptFile) }
    }

    static func index(of id: String) -> Int? { all.firstIndex { $0.id == id } }
}
