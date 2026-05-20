// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "LifegamesDesignSystem",
    platforms: [.iOS(.v26), .watchOS(.v26), .macOS(.v13)],
    products: [
        .library(name: "LifegamesTokens", targets: ["LifegamesTokens"]),
        .library(name: "LifegamesComponents", targets: ["LifegamesComponents"]),
        .library(name: "LifegamesComponentsWatch", targets: ["LifegamesComponentsWatch"]),
        .library(name: "LifegamesWidgets", targets: ["LifegamesWidgets"]),
        .library(name: "LifegamesWidgetsWatch", targets: ["LifegamesWidgetsWatch"]),
    ],
    dependencies: [
        .package(url: "https://github.com/pointfreeco/swift-snapshot-testing", from: "1.17.0"),
        .package(url: "https://github.com/apple/swift-docc-plugin", from: "1.0.0"),
    ],
    targets: [
        .target(name: "LifegamesTokens", resources: [.process("Resources")]),
        .target(name: "LifegamesComponents", dependencies: ["LifegamesTokens"]),
        .target(name: "LifegamesComponentsWatch", dependencies: ["LifegamesTokens"]),
        .target(name: "LifegamesWidgets", dependencies: ["LifegamesComponents"],
                resources: [.process("Resources")]),
        .target(name: "LifegamesWidgetsWatch", dependencies: ["LifegamesComponentsWatch"]),
        .testTarget(name: "LifegamesTokensTests", dependencies: ["LifegamesTokens"]),
        .testTarget(name: "LifegamesComponentsTests", dependencies: [
            "LifegamesComponents",
            .product(name: "SnapshotTesting", package: "swift-snapshot-testing"),
        ]),
        .testTarget(name: "LifegamesWidgetsTests", dependencies: [
            "LifegamesWidgets",
            .product(name: "SnapshotTesting", package: "swift-snapshot-testing"),
        ]),
    ]
)
