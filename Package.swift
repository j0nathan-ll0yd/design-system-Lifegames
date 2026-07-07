// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "LifegamesDesignSystem",
    platforms: [.iOS(.v26), .watchOS(.v26), .macOS(.v14)],
    products: [
        .library(name: "LifegamesTokens", targets: ["LifegamesTokens"]),
        .library(name: "LifegamesSchemas", targets: ["LifegamesSchemas"]),
        .library(name: "LifegamesCopy", targets: ["LifegamesCopy"]),
        .library(name: "LifegamesComponentsCore", targets: ["LifegamesComponentsCore"]),
        .library(name: "LifegamesComponents", targets: ["LifegamesComponents"]),
        .library(name: "LifegamesComponentsWatch", targets: ["LifegamesComponentsWatch"]),
        .library(name: "LifegamesOnboarding", targets: ["LifegamesOnboarding"]),
        .library(name: "LifegamesTemplates", targets: ["LifegamesTemplates"]),
        .library(name: "LifegamesWidgets", targets: ["LifegamesWidgets"]),
        .library(name: "LifegamesWidgetsWatch", targets: ["LifegamesWidgetsWatch"]),
    ],
    dependencies: [
        .package(url: "https://github.com/pointfreeco/swift-snapshot-testing", from: "1.17.0"),
        .package(url: "https://github.com/apple/swift-docc-plugin", from: "1.0.0"),
    ],
    targets: [
        .target(name: "LifegamesTokens", resources: [.process("Resources")]),
        .target(name: "LifegamesSchemas", path: "Sources/LifegamesSchemas"),
        .target(name: "LifegamesCopy", resources: [.process("Resources")]),
        .target(name: "LifegamesComponentsCore", dependencies: ["LifegamesTokens", "LifegamesCopy"]),
        .target(name: "LifegamesComponents", dependencies: ["LifegamesTokens", "LifegamesComponentsCore"]),
        .target(name: "LifegamesOnboarding", dependencies: ["LifegamesComponents"], exclude: ["README.md"]),
        .target(name: "LifegamesTemplates", dependencies: [
            "LifegamesComponents", "LifegamesComponentsCore", "LifegamesTokens",
        ]),
        .target(name: "LifegamesComponentsWatch", dependencies: ["LifegamesTokens", "LifegamesComponentsCore"]),
        .target(name: "LifegamesWidgets", dependencies: ["LifegamesComponents", "LifegamesSchemas", "LifegamesCopy"],
                resources: [.process("Resources")]),
        .target(name: "LifegamesWidgetsWatch", dependencies: ["LifegamesComponentsWatch", "LifegamesComponentsCore"]),
        .testTarget(name: "LifegamesTokensTests", dependencies: ["LifegamesTokens"]),
        .testTarget(name: "LifegamesComponentsTests", dependencies: [
            "LifegamesComponents",
            .product(name: "SnapshotTesting", package: "swift-snapshot-testing"),
        ]),
        .testTarget(name: "LifegamesComponentsCoreTests", dependencies: [
            "LifegamesComponentsCore",
            .product(name: "SnapshotTesting", package: "swift-snapshot-testing"),
        ]),
        .testTarget(name: "LifegamesWidgetsTests", dependencies: [
            "LifegamesWidgets",
            "LifegamesWidgetsWatch",
            .product(name: "SnapshotTesting", package: "swift-snapshot-testing"),
        ]),
        .testTarget(name: "LifegamesComponentsWatchTests", dependencies: [
            "LifegamesComponentsWatch",
            .product(name: "SnapshotTesting", package: "swift-snapshot-testing"),
        ]),
        .testTarget(name: "LifegamesOnboardingTests", dependencies: [
            "LifegamesOnboarding",
        ]),
        .testTarget(name: "LifegamesTemplatesTests", dependencies: [
            "LifegamesTemplates",
        ]),
        .testTarget(name: "LifegamesSchemasTests", dependencies: [
            "LifegamesSchemas",
        ]),
        .testTarget(name: "LifegamesCopyTests", dependencies: [
            "LifegamesCopy",
        ]),
    ]
)
