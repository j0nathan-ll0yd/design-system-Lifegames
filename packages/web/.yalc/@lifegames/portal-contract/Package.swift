// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "PortalContract",
    products: [
        .library(
            name: "PortalContract",
            targets: ["PortalContract"]
        ),
    ],
    targets: [
        .target(
            name: "PortalContract",
            path: "Sources/PortalContract"
        ),
    ]
)
