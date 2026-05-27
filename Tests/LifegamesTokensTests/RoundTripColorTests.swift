import Testing
import SwiftUI
@testable import LifegamesTokens
#if canImport(UIKit)
import UIKit
#endif

// Round-trip sRGB test: verify that asset-catalog color components match the source
// hex values from tokens/primitive/color.tokens.json within ε = 1/255 (~0.00392).
// This catches any floating-point rounding or copy-paste drift in colorset generation.
//
// macOS note: SPM's `.process("Resources")` copies .xcassets as a raw directory tree —
// it does NOT compile to Assets.car. Therefore NSColor(named:bundle:) always returns nil
// on macOS SPM test targets. We read Contents.json directly from the bundle on macOS,
// which works regardless of whether the asset catalog was compiled.

private let epsilon: Double = 1.0 / 255.0

// MARK: - Color component extraction

private func components(of colorName: String) throws -> (r: Double, g: Double, b: Double, a: Double) {
    #if canImport(UIKit)
    // On iOS/Xcode the xcassets is compiled to Assets.car — UIColor(named:) works.
    let uiColor = try #require(
        UIColor(named: colorName, in: Bundle.module, compatibleWith: nil),
        "UIColor(named: \"\(colorName)\") returned nil — asset missing from compiled catalog"
    )
    var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
    try #require(uiColor.getRed(&r, green: &g, blue: &b, alpha: &a))
    return (Double(r), Double(g), Double(b), Double(a))
    #else
    // On macOS SPM, xcassets is a raw directory tree — no Assets.car.
    // Read the sRGB components directly from Contents.json.
    return try componentsFromJSON(colorName: colorName)
    #endif
}

#if !canImport(UIKit)
private struct ColorsetContents: Decodable {
    struct Entry: Decodable {
        struct ColorValue: Decodable {
            struct Components: Decodable {
                let red: String
                let green: String
                let blue: String
                let alpha: String
            }
            let components: Components
        }
        let color: ColorValue
        let idiom: String
    }
    let colors: [Entry]
}

private func componentsFromJSON(colorName: String) throws -> (r: Double, g: Double, b: Double, a: Double) {
    let bundle = Bundle.module
    let xcassetsURL = try #require(
        bundle.url(forResource: "Colors", withExtension: "xcassets"),
        "Colors.xcassets not found in LifegamesTokens bundle"
    )
    let colorsetURL = xcassetsURL
        .appendingPathComponent("\(colorName).colorset")
        .appendingPathComponent("Contents.json")

    let data = try Data(contentsOf: colorsetURL)
    let contents = try JSONDecoder().decode(ColorsetContents.self, from: data)

    // Use the universal entry (the only entry for our single-appearance colorsets).
    let entry = try #require(
        contents.colors.first(where: { $0.idiom == "universal" }) ?? contents.colors.first,
        "No color entries found in \(colorName).colorset/Contents.json"
    )
    let c = entry.color.components
    let r = try #require(Double(c.red),   "Could not parse red component in \(colorName)")
    let g = try #require(Double(c.green), "Could not parse green component in \(colorName)")
    let b = try #require(Double(c.blue),  "Could not parse blue component in \(colorName)")
    let a = try #require(Double(c.alpha), "Could not parse alpha component in \(colorName)")
    return (r, g, b, a)
}
#endif

// MARK: - Hex helper

private func hex(_ string: String) -> (r: Double, g: Double, b: Double) {
    let h = string.trimmingCharacters(in: .init(charactersIn: "#"))
    return (
        Double(Int(h.prefix(2), radix: 16)!) / 255.0,
        Double(Int(h.dropFirst(2).prefix(2), radix: 16)!) / 255.0,
        Double(Int(h.dropFirst(4).prefix(2), radix: 16)!) / 255.0
    )
}

// MARK: - Test suite

@Suite("Round-trip sRGB color resolution")
struct RoundTripColorTests {

    @Test("accentPink resolves to #ff006e")
    func accentPink() throws {
        let expected = hex("#ff006e")
        let actual = try components(of: "color-accent-pink")
        #expect(abs(actual.r - expected.r) <= epsilon)
        #expect(abs(actual.g - expected.g) <= epsilon)
        #expect(abs(actual.b - expected.b) <= epsilon)
        #expect(abs(actual.a - 1.0) <= epsilon)
    }

    @Test("accentBlue resolves to #3a86ff")
    func accentBlue() throws {
        let expected = hex("#3a86ff")
        let actual = try components(of: "color-accent-blue")
        #expect(abs(actual.r - expected.r) <= epsilon)
        #expect(abs(actual.g - expected.g) <= epsilon)
        #expect(abs(actual.b - expected.b) <= epsilon)
    }

    @Test("accentGreen resolves to #06d6a0")
    func accentGreen() throws {
        let expected = hex("#06d6a0")
        let actual = try components(of: "color-accent-green")
        #expect(abs(actual.r - expected.r) <= epsilon)
        #expect(abs(actual.g - expected.g) <= epsilon)
        #expect(abs(actual.b - expected.b) <= epsilon)
    }

    @Test("surfaceBase resolves to #06060f (gray.950)")
    func surfaceBase() throws {
        let expected = hex("#06060f")
        let actual = try components(of: "color-surface-base")
        #expect(abs(actual.r - expected.r) <= epsilon)
        #expect(abs(actual.g - expected.g) <= epsilon)
        #expect(abs(actual.b - expected.b) <= epsilon)
    }

    @Test("textTitle resolves to #fafafa (zinc.100)")
    func textTitle() throws {
        let expected = hex("#fafafa")
        let actual = try components(of: "color-text-title")
        #expect(abs(actual.r - expected.r) <= epsilon)
        #expect(abs(actual.g - expected.g) <= epsilon)
        #expect(abs(actual.b - expected.b) <= epsilon)
    }

    @Test("healthRed resolves to #ff3b30 (red.apple)")
    func healthRed() throws {
        let expected = hex("#ff3b30")
        let actual = try components(of: "color-health-red")
        #expect(abs(actual.r - expected.r) <= epsilon)
        #expect(abs(actual.g - expected.g) <= epsilon)
        #expect(abs(actual.b - expected.b) <= epsilon)
    }

    @Test("surfaceRaised has alpha 0.07")
    func surfaceRaisedAlpha() throws {
        let actual = try components(of: "color-surface-raised")
        #expect(abs(actual.a - 0.07) <= epsilon)
    }

    @Test("borderInteractive has alpha 0.20")
    func borderInteractiveAlpha() throws {
        let actual = try components(of: "color-border-interactive")
        #expect(abs(actual.a - 0.20) <= epsilon)
    }
}
