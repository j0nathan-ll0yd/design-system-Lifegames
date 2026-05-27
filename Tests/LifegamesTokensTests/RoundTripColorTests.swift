import Testing
import SwiftUI
@testable import LifegamesTokens

// Round-trip sRGB test: verify that asset-catalog color components match the source
// hex values from tokens/primitive/color.tokens.json within ε = 1/255 (~0.00392).
// This catches any floating-point rounding or copy-paste drift in colorset generation.

private let epsilon: Double = 1.0 / 255.0

private func components(of color: Color) -> (r: Double, g: Double, b: Double, a: Double)? {
    #if canImport(UIKit)
    let uiColor = UIColor(color)
    var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
    guard uiColor.getRed(&r, green: &g, blue: &b, alpha: &a) else { return nil }
    return (Double(r), Double(g), Double(b), Double(a))
    #else
    return nil
    #endif
}

private func hex(_ string: String) -> (r: Double, g: Double, b: Double) {
    let h = string.trimmingCharacters(in: .init(charactersIn: "#"))
    return (
        Double(Int(h.prefix(2), radix: 16)!) / 255.0,
        Double(Int(h.dropFirst(2).prefix(2), radix: 16)!) / 255.0,
        Double(Int(h.dropFirst(4).prefix(2), radix: 16)!) / 255.0
    )
}

@Suite("Round-trip sRGB color resolution")
struct RoundTripColorTests {

    @Test("accentPink resolves to #ff006e")
    func accentPink() throws {
        let expected = hex("#ff006e")
        let actual = try #require(components(of: LGColor.accentPink))
        #expect(abs(actual.r - expected.r) <= epsilon)
        #expect(abs(actual.g - expected.g) <= epsilon)
        #expect(abs(actual.b - expected.b) <= epsilon)
        #expect(abs(actual.a - 1.0) <= epsilon)
    }

    @Test("accentBlue resolves to #3a86ff")
    func accentBlue() throws {
        let expected = hex("#3a86ff")
        let actual = try #require(components(of: LGColor.accentBlue))
        #expect(abs(actual.r - expected.r) <= epsilon)
        #expect(abs(actual.g - expected.g) <= epsilon)
        #expect(abs(actual.b - expected.b) <= epsilon)
    }

    @Test("accentGreen resolves to #06d6a0")
    func accentGreen() throws {
        let expected = hex("#06d6a0")
        let actual = try #require(components(of: LGColor.accentGreen))
        #expect(abs(actual.r - expected.r) <= epsilon)
        #expect(abs(actual.g - expected.g) <= epsilon)
        #expect(abs(actual.b - expected.b) <= epsilon)
    }

    @Test("surfaceBase resolves to #06060f (gray.950)")
    func surfaceBase() throws {
        let expected = hex("#06060f")
        let actual = try #require(components(of: LGColor.surfaceBase))
        #expect(abs(actual.r - expected.r) <= epsilon)
        #expect(abs(actual.g - expected.g) <= epsilon)
        #expect(abs(actual.b - expected.b) <= epsilon)
    }

    @Test("textTitle resolves to #fafafa (zinc.100)")
    func textTitle() throws {
        let expected = hex("#fafafa")
        let actual = try #require(components(of: LGColor.textTitle))
        #expect(abs(actual.r - expected.r) <= epsilon)
        #expect(abs(actual.g - expected.g) <= epsilon)
        #expect(abs(actual.b - expected.b) <= epsilon)
    }

    @Test("healthRed resolves to #ff3b30 (red.apple)")
    func healthRed() throws {
        let expected = hex("#ff3b30")
        let actual = try #require(components(of: LGColor.healthRed))
        #expect(abs(actual.r - expected.r) <= epsilon)
        #expect(abs(actual.g - expected.g) <= epsilon)
        #expect(abs(actual.b - expected.b) <= epsilon)
    }

    @Test("surfaceRaised has alpha 0.07")
    func surfaceRaisedAlpha() throws {
        let actual = try #require(components(of: LGColor.surfaceRaised))
        #expect(abs(actual.a - 0.07) <= epsilon)
    }

    @Test("borderInteractive has alpha 0.20")
    func borderInteractiveAlpha() throws {
        let actual = try #require(components(of: LGColor.borderInteractive))
        #expect(abs(actual.a - 0.20) <= epsilon)
    }
}
