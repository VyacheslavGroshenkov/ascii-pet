import AppKit

@main
enum AsciiPetApp {
    @MainActor
    static func main() {
        let app = NSApplication.shared
        let delegate = AppDelegate()
        app.delegate = delegate
        // Без иконки в Dock: питомец + значок в строке меню.
        app.setActivationPolicy(.accessory)
        withExtendedLifetime(delegate) { app.run() }
    }
}

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate {
    private var pet: PetController?
    private var statusItem: NSStatusItem?

    func applicationDidFinishLaunching(_ notification: Notification) {
        let engine: PieceEngine
        do {
            let sets = Self.pieceSets()
            guard !sets.isEmpty else { throw CocoaError(.fileNoSuchFile) }
            try Pieces.load(sets.map(\.list))
            engine = try PieceEngine(scriptURLs: sets.map(\.script))
        } catch {
            let alert = NSAlert()
            alert.messageText = "Не удалось загрузить анимации"
            alert.informativeText = "\(error)"
            alert.runModal()
            NSApp.terminate(nil)
            return
        }

        let pet = PetController(engine: engine)
        self.pet = pet

        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        item.button?.image = NSImage(systemSymbolName: "pawprint.fill", accessibilityDescription: "ASCII-питомец")
        let menu = NSMenu()
        menu.delegate = self
        item.menu = menu
        statusItem = item

        pet.start()
    }

    func menuNeedsUpdate(_ menu: NSMenu) {
        pet?.populate(menu)
    }

    /// Наборы анимаций: бандл и список для меню. Приватный (из local/) идёт первым и есть,
    /// только если его собрали в приложение; публичный есть всегда.
    private static func pieceSets() -> [(script: URL, list: URL)] {
        [("local-pieces", "local/pieces"), ("pieces", "Resources/pieces")].compactMap { name, devPath in
            guard let script = file(name, devPath, "js"), let list = file(name, devPath, "json") else { return nil }
            return (script, list)
        }
    }

    /// В собранном .app файлы лежат в Resources; при `swift run` — в репозитории.
    /// #filePath — абсолютный путь на машине сборщика, поэтому он есть только в отладочной сборке.
    private static func file(_ name: String, _ devPath: String, _ ext: String) -> URL? {
        if let url = Bundle.main.url(forResource: name, withExtension: ext) { return url }
        #if DEBUG
        let url = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("\(devPath).\(ext)")
        return FileManager.default.fileExists(atPath: url.path) ? url : nil
        #else
        return nil
        #endif
    }
}
