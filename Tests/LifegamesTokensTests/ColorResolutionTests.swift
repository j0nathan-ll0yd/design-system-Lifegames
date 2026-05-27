import Testing
import SwiftUI
@testable import LifegamesTokens

// Structural tests verifying the LGColor asset-catalog namespace is complete
// and that key semantic mappings are wired correctly.

@Suite("LGColor asset catalog resolution")
struct ColorResolutionTests {

    // The catalog must contain at least the baseline token count.
    // 71 colorsets as of C1; this lower-bound catches accidental deletions.
    @Test("xcassets contains at least 71 color tokens")
    func xcassetsTokenCount() throws {
        let bundle = Bundle.module
        let catalogURL = try #require(
            bundle.url(forResource: "Colors", withExtension: "xcassets"),
            "Colors.xcassets not found in LifegamesTokens bundle"
        )
        let contents = try FileManager.default.contentsOfDirectory(
            at: catalogURL,
            includingPropertiesForKeys: nil,
            options: .skipsHiddenFiles
        )
        let colorsets = contents.filter { $0.pathExtension == "colorset" }
        #expect(colorsets.count >= 71, "Expected at least 71 colorsets, found \(colorsets.count)")
    }

    // Verify each semantic group has at least one entry in LGColor.
    @Test("LGColor exposes surface tokens")
    func surfaceTokensExist() {
        // These must not be Color.clear (which is the SwiftUI fallback for a
        // missing named color). We can only do a shallow existence check at
        // build time; deep value checks live in RoundTripColorTests.
        let tokens: [Color] = [
            LGColor.surfaceBase,
            LGColor.surfaceDeep,
            LGColor.surfaceRaised,
            LGColor.surfaceInset,
        ]
        // No assertion needed — if any LGColor property is missing, the file
        // fails to compile. This test documents the expected set.
        #expect(tokens.count == 4)
    }

    @Test("LGColor exposes all 10 accent tokens")
    func accentTokenCount() {
        let accents: [Color] = [
            LGColor.accentPink, LGColor.accentBlue, LGColor.accentGreen,
            LGColor.accentAmber, LGColor.accentPurple, LGColor.accentRed,
            LGColor.accentCyan, LGColor.accentOrange, LGColor.accentIndigo,
            LGColor.accentDefault,
        ]
        #expect(accents.count == 10)
    }

    @Test("LGColor exposes health tokens")
    func healthTokensExist() {
        let tokens: [Color] = [LGColor.healthRed, LGColor.healthGreen, LGColor.healthPurple]
        #expect(tokens.count == 3)
    }

    @Test("LGColor exposes border tokens")
    func borderTokensExist() {
        let tokens: [Color] = [
            LGColor.borderDefault, LGColor.borderSubtle,
            LGColor.borderStrong, LGColor.borderInteractive,
        ]
        #expect(tokens.count == 4)
    }

    @Test("Color.colorAccentPink forwarding alias resolves (legacy compat)")
    func legacyForwardingAlias() {
        // Color+SemanticAliases.swift provides colorAccentPink → LGColor.accentPink.
        // This test will fail to compile if the alias is removed prematurely.
        let _ = Color.colorAccentPink
        let _ = Color.colorSurfaceBase
        let _ = Color.colorTextMuted
        #expect(Bool(true), "Legacy Color.* aliases compiled successfully")
    }
}
