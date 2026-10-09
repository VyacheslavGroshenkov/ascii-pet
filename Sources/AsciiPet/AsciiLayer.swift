import AppKit
import CoreText

/// Рисует кадр ascii-анимации белыми глифами по строгой сетке `cols × rows`.
/// Используется как маска для градиента, поэтому цвет здесь не важен — важна альфа.
/// Глифы ставятся по ячейкам вручную (а не CTLine), чтобы символы из запасных шрифтов
/// не сдвигали строку: ширина ячейки всегда одна.
final class AsciiLayer: CALayer {
    private var cols = 1
    private var rows = 1
    private var lines: [[Unicode.Scalar]] = []
    private var lastFrame = ""

    private let baseFont = NSFont.monospacedSystemFont(ofSize: 10, weight: .semibold) as CTFont
    private var fonts: [CTFont] = []
    private var glyphs: [Unicode.Scalar: Glyph] = [:]
    private var fontSizeKey: CGFloat = 0

    override init() {
        super.init()
        needsDisplayOnBoundsChange = true
    }

    override init(layer: Any) {
        super.init(layer: layer)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    /// Глиф и сдвиг внутри ячейки: глиф запасного шрифта бывает уже или шире ячейки — его центрируем.
    private struct Glyph {
        let font: Int
        let glyph: CGGlyph
        let dx: CGFloat
    }

    // Кадры меняются 15–30 раз в секунду: неявные анимации contents/bounds тут только мешают.
    override class func defaultAction(forKey event: String) -> CAAction? { NSNull() }

    func setGrid(cols: Int, rows: Int) {
        self.cols = max(cols, 1)
        self.rows = max(rows, 1)
        lines = []
        lastFrame = ""
        setNeedsDisplay()
    }

    /// Многие анимации подолгу стоят на месте (спящий кот, паузы между движениями) —
    /// одинаковый кадр не перерисовываем: это экономит отрисовку, маску и тень.
    func show(_ frame: String) {
        guard frame != lastFrame else { return }
        lastFrame = frame
        lines = frame.split(separator: "\n", omittingEmptySubsequences: false).map { Array($0.unicodeScalars) }
        setNeedsDisplay()
    }

    override func draw(in ctx: CGContext) {
        guard !lines.isEmpty, bounds.width > 0, bounds.height > 0 else { return }
        let cw = bounds.width / CGFloat(cols)
        let ch = bounds.height / CGFloat(rows)
        prepareFonts(cellWidth: cw)
        let cellWidth = cw

        let main = fonts[0]
        let ascent = CTFontGetAscent(main), descent = CTFontGetDescent(main)
        // Глиф по центру ячейки по вертикали.
        let baseline = (ch - (ascent + descent)) / 2 + descent

        // По шрифту — свой прогон глифов; запасные шрифты могут добавиться прямо по ходу.
        var runs: [Int: (glyphs: [CGGlyph], points: [CGPoint])] = [:]
        for (r, line) in lines.prefix(rows).enumerated() {
            let y = bounds.height - CGFloat(r + 1) * ch + baseline
            for (c, scalar) in line.prefix(cols).enumerated() where scalar != " " {
                guard let g = glyph(for: scalar, cellWidth: cellWidth) else { continue }
                runs[g.font, default: ([], [])].glyphs.append(g.glyph)
                runs[g.font, default: ([], [])].points.append(CGPoint(x: CGFloat(c) * cw + g.dx, y: y))
            }
        }

        ctx.setFillColor(NSColor.white.cgColor)
        ctx.textMatrix = .identity
        for (i, run) in runs {
            CTFontDrawGlyphs(fonts[i], run.glyphs, run.points, run.glyphs.count, ctx)
        }
    }

    // MARK: - Шрифты

    /// Кегль подбирается так, чтобы ширина «0» совпала с шириной ячейки.
    private func prepareFonts(cellWidth: CGFloat) {
        var zero: UniChar = 0x30, g: CGGlyph = 0
        CTFontGetGlyphsForCharacters(baseFont, &zero, &g, 1)
        var advance = CGSize.zero
        CTFontGetAdvancesForGlyphs(baseFont, .horizontal, &g, &advance, 1)
        let size = CTFontGetSize(baseFont) * cellWidth / max(advance.width, 0.01)
        guard abs(size - fontSizeKey) > 0.001 || fonts.isEmpty else { return }
        fontSizeKey = size
        fonts = [CTFontCreateCopyWithAttributes(baseFont, size, nil, nil)]
        glyphs = [:]
    }

    /// Кэш сбрасывается в prepareFonts при смене кегля, поэтому сдвиг можно посчитать один раз.
    private func glyph(for scalar: Unicode.Scalar, cellWidth: CGFloat) -> Glyph? {
        if let cached = glyphs[scalar] { return cached }
        let utf16 = Array(String(scalar).utf16)
        var found: Glyph?
        var out = [CGGlyph](repeating: 0, count: utf16.count)
        if CTFontGetGlyphsForCharacters(fonts[0], utf16, &out, utf16.count), out[0] != 0 {
            found = Glyph(font: 0, glyph: out[0], dx: 0)
        } else {
            // Запасной шрифт для символов, которых нет в моноширинном (·, ▕, █ …).
            let fallback = CTFontCreateForString(fonts[0], String(scalar) as CFString, CFRange(location: 0, length: utf16.count))
            if CTFontGetGlyphsForCharacters(fallback, utf16, &out, utf16.count), out[0] != 0 {
                var advance = CGSize.zero
                CTFontGetAdvancesForGlyphs(fallback, .horizontal, &out, &advance, 1)
                fonts.append(fallback)
                found = Glyph(font: fonts.count - 1, glyph: out[0], dx: (cellWidth - advance.width) / 2)
            }
        }
        glyphs[scalar] = found
        return found
    }
}
