import Foundation
import JavaScriptCore

/// Размеры и частота кадров из `meta` анимации.
struct PieceMeta {
    let cols: Int
    let rows: Int
    let fps: Double
}

/// Исполняет оригинальные анимации ascii.rest в JavaScriptCore.
/// Контракт ascii.rest: `default(options)` возвращает `frame(t, env)`, который отдаёт
/// кадр на момент `t` секунд — `rows` строк по `cols` символов.
/// JSContext не потокобезопасен: работаем только с главного потока.
final class PieceEngine {
    private let context: JSContext
    private let pieces: JSValue
    /// `env` для кадра: два варианта на всё время работы вместо нового JS-объекта 20 раз в секунду.
    private let envInk: JSValue
    private let envPaper: JSValue

    /// Каждый бандл дописывает свои анимации в общий `ASCII_PIECES`.
    init(scriptURLs: [URL]) throws {
        guard let context = JSContext() else { throw EngineError.noContext }
        context.exceptionHandler = { _, exception in
            NSLog("AsciiPet JS: %@", exception?.toString() ?? "unknown error")
        }
        for url in scriptURLs {
            context.evaluateScript(try String(contentsOf: url, encoding: .utf8), withSourceURL: url)
        }
        guard let pieces = context.objectForKeyedSubscript("ASCII_PIECES"), pieces.isObject else {
            throw EngineError.noPieces
        }
        self.context = context
        self.pieces = pieces
        envInk = context.evaluateScript("({ paper: false })")
        envPaper = context.evaluateScript("({ paper: true })")
    }

    func meta(of id: String) -> PieceMeta? {
        guard let meta = pieces.objectForKeyedSubscript(id)?.objectForKeyedSubscript("meta"),
              meta.isObject else { return nil }
        return PieceMeta(cols: Int(meta.objectForKeyedSubscript("cols").toInt32()),
                         rows: Int(meta.objectForKeyedSubscript("rows").toInt32()),
                         fps: meta.objectForKeyedSubscript("fps").toDouble())
    }

    /// Новый экземпляр анимации: у симуляций своё состояние, поэтому при каждом показе — заново.
    func makeFrame(of id: String) -> JSValue? {
        guard let factory = pieces.objectForKeyedSubscript(id)?.objectForKeyedSubscript("default") else { return nil }
        let frame = factory.call(withArguments: [])
        return frame?.isObject == true ? frame : nil
    }

    /// `paper` — тёмные чернила на светлом фоне: затенённые анимации переворачивают палитру.
    func render(_ frame: JSValue, at t: Double, paper: Bool) -> String? {
        guard let value = frame.call(withArguments: [t, paper ? envPaper : envInk]), value.isString else { return nil }
        return value.toString()
    }

    enum EngineError: Error {
        case noContext
        case noPieces
    }
}
