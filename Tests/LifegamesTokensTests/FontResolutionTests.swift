import CoreText
import Foundation
import SwiftUI
import Testing
@testable import LifegamesTokens

/// Behavioral proof that every `Font.Tokens` face is the Space Grotesk face it names, not the
/// system fallback. `Font.custom` falls back silently: before the static faces shipped, the
/// font lookup missed the flattened bundle and iOS could not resolve the variable font's named
/// instances, so every token rendered in the system font and every test still passed.
@Suite("Font tokens resolve to their Space Grotesk face")
@MainActor
struct FontResolutionTests {
    /// Every generated token and the PostScript face its weight maps to. `everyGeneratedTokenIsListed`
    /// holds this list to the generated file, so a new token cannot skip the check.
    static let tokens: [(name: String, font: Font, face: String)] = [
        ("caption2", Font.Tokens.caption2(), "SpaceGrotesk-Regular"),
        ("caption", Font.Tokens.caption(), "SpaceGrotesk-Regular"),
        ("footnote", Font.Tokens.footnote(), "SpaceGrotesk-Regular"),
        ("body", Font.Tokens.body(), "SpaceGrotesk-Regular"),
        ("callout", Font.Tokens.callout(), "SpaceGrotesk-Regular"),
        ("subhead", Font.Tokens.subhead(), "SpaceGrotesk-Medium"),
        ("headline", Font.Tokens.headline(), "SpaceGrotesk-SemiBold"),
        ("title3", Font.Tokens.title3(), "SpaceGrotesk-Bold"),
        ("title2", Font.Tokens.title2(), "SpaceGrotesk-Bold"),
        ("title1", Font.Tokens.title1(), "SpaceGrotesk-Bold"),
        ("hero", Font.Tokens.hero(), "SpaceGrotesk-Bold"),
        ("caption2Emphasized", Font.Tokens.caption2Emphasized(), "SpaceGrotesk-Medium"),
        ("captionEmphasized", Font.Tokens.captionEmphasized(), "SpaceGrotesk-Medium"),
        ("bodyEmphasized", Font.Tokens.bodyEmphasized(), "SpaceGrotesk-SemiBold"),
        ("display", Font.Tokens.display(), "SpaceGrotesk-Bold"),
        ("heading1", Font.Tokens.heading1(), "SpaceGrotesk-Bold"),
        ("heading2", Font.Tokens.heading2(), "SpaceGrotesk-SemiBold"),
        ("label", Font.Tokens.label(), "SpaceGrotesk-Medium"),
        ("code", Font.Tokens.code(), "SpaceGrotesk-Regular"),
    ]

    private static var generatedSource: String {
        get throws {
            let url = URL(fileURLWithPath: #filePath)
                .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
                .appendingPathComponent("Sources/LifegamesTokens/Font+Tokens.swift")
            return try String(contentsOf: url, encoding: .utf8)
        }
    }

    @Test func everyGeneratedTokenIsListed() throws {
        let declared = try Self.generatedSource.matches(of: /public static func (\w+)\(\) -> Font/)
            .map { String($0.output.1) }
        #expect(declared == Self.tokens.map(\.name))
    }

    @Test func everyRegisteredFaceResolvesByPostScriptName() {
        LifegamesFonts.registerFonts()
        for face in LifegamesFonts.faces {
            let font = CTFontCreateWithName(face as CFString, 12, nil)
            #expect(CTFontCopyPostScriptName(font) as String == face)
        }
    }

    @Test func everyFaceTheGeneratorNamesIsRegistered() throws {
        let named = Set(try Self.generatedSource.matches(of: /\.custom\("([\w-]+)"/).map { String($0.output.1) })
        #expect(!named.isEmpty)
        #expect(named.isSubset(of: Set(LifegamesFonts.faces)))
    }

    @Test func everyTokenResolvesToItsFace() throws {
        guard #available(iOS 26, macOS 26, watchOS 26, *) else {
            Issue.record("Font.resolve(in:) needs iOS 26 / macOS 26; this host cannot prove the faces")
            return
        }
        LifegamesFonts.registerFonts()
        let context = EnvironmentValues().fontResolutionContext
        for token in Self.tokens {
            let resolved = token.font.resolve(in: context)
            #expect(CTFontCopyPostScriptName(resolved.ctFont) as String == token.face, "\(token.name)")
        }
    }

    /// The variable font is the instancing source only; shipping it would add an unregistered
    /// 134 KB face to every consumer bundle.
    @Test func bundleShipsStaticFacesOnly() {
        for face in LifegamesFonts.faces {
            #expect(Bundle.module.url(forResource: face, withExtension: "ttf") != nil, "\(face)")
        }
        #expect(Bundle.module.url(forResource: "SpaceGrotesk-Variable", withExtension: "ttf") == nil)
    }
}
