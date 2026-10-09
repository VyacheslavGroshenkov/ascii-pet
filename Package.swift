// swift-tools-version:5.10
import PackageDescription

let package = Package(
    name: "AsciiPet",
    platforms: [.macOS(.v14)],
    targets: [
        .executableTarget(
            name: "AsciiPet",
            path: "Sources/AsciiPet",
            linkerSettings: [
                .linkedFramework("AppKit"),
                .linkedFramework("JavaScriptCore"),
                .linkedFramework("ServiceManagement"),
            ]
        ),
    ]
)
