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
        // Test-only: behavioral render assertions. A RANGE, never an exact pin: xcodebuild
        // resolves this package's test-only dependencies in every consumer graph, and
        // ios-LifegamesPortal pins ViewInspector `exact: "0.10.1"` (LifePortalFeatures
        // Package.swift). An exact 0.10.5 here broke every iOS build (ios-LifegamesPortal#146).
        // The lower bound is iOS's pin. Package.resolved holds 0.10.5 for this repo's own runs:
        // 0.10.2+ carries the accessibility-value fix and 0.10.3+ the iOS 26 inspection support
        // the behavioral suites need; 0.10.1 cannot read accessibility values on Xcode 26.
        .package(url: "https://github.com/nalexn/ViewInspector", .upToNextMinor(from: "0.10.1")),
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
            .product(name: "ViewInspector", package: "ViewInspector"),
        ]),
        .testTarget(name: "LifegamesComponentsCoreTests", dependencies: [
            "LifegamesComponentsCore",
            .product(name: "SnapshotTesting", package: "swift-snapshot-testing"),
            .product(name: "ViewInspector", package: "ViewInspector"),
        ]),
        .testTarget(name: "LifegamesWidgetsTests", dependencies: [
            "LifegamesWidgets",
            "LifegamesWidgetsWatch",
            .product(name: "SnapshotTesting", package: "swift-snapshot-testing"),
            .product(name: "ViewInspector", package: "ViewInspector"),
        ]),
        .testTarget(name: "LifegamesComponentsWatchTests", dependencies: [
            "LifegamesComponentsWatch",
            "LifegamesComponentsCore",
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
