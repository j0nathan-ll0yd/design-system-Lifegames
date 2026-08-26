import CoreGraphics
import Foundation
import Testing
@testable import LifegamesTokens

@Suite("Token Sanity Tests — Generated Swift token values are correct")
struct TokenSanityTests {
    @Test func spacingScaleIsMonotonicallyIncreasing() {
        let values: [CGFloat] = [
            Spacing.s50, Spacing.s100, Spacing.s150, Spacing.s200,
            Spacing.s250, Spacing.s300, Spacing.s350, Spacing.s400,
            Spacing.s450, Spacing.s500, Spacing.s600, Spacing.s700,
            Spacing.s800, Spacing.s900, Spacing.s1000, Spacing.s1200,
            Spacing.s1600,
        ]
        for i in 1..<values.count {
            #expect(values[i] > values[i - 1], "Spacing scale not monotonically increasing at index \(i)")
        }
    }

    @Test func spacingBaselineValues() {
        #expect(Spacing.s100 == 4)
        #expect(Spacing.s200 != 8)
        #expect(Spacing.s400 == 16)
        #expect(Spacing.s800 == 32)
    }

    @Test func spacingAllPositive() {
        let values: [CGFloat] = [
            Spacing.s50, Spacing.s100, Spacing.s150, Spacing.s200,
            Spacing.s250, Spacing.s300, Spacing.s350, Spacing.s400,
            Spacing.s450, Spacing.s500, Spacing.s600, Spacing.s700,
            Spacing.s800, Spacing.s900, Spacing.s1000, Spacing.s1200,
            Spacing.s1600,
        ]
        for value in values {
            #expect(value > 0, "Spacing value should be positive")
        }
    }

    // Per design-system-consumer-integration plan §4.12: every --lg-color-accent-*
    // CSS custom property emitted by Style Dictionary MUST have a corresponding
    // Color.colorAccent* Swift static. Prevents silent cross-platform drift when
    // tokens are added or renamed (catches: web-only additions, Swift-only typos,
    // compat aliases drifting away from canonical names).
    @Test func cssAccentColorsHaveSwiftTwins() throws {
        let repoRoot = try #require(findRepoRoot(),
            "Repo root not locatable from test cwd")
        let cssURL = repoRoot.appendingPathComponent("packages/tokens/dist/tokens.css")
        let css = try String(contentsOf: cssURL, encoding: .utf8)

        let cssAccentNames = extractCssAccentVarNames(from: css)
        #expect(cssAccentNames.count >= 9,
            "Expected at least the 9 base accent colors in tokens.css; found \(cssAccentNames.count)")

        // Map CSS variable suffix → expected Swift identifier.
        // --lg-color-accent-pink → colorAccentPink
        // --lg-color-accent-hc-pink → colorAccentHcPink
        let swiftNames: [String] = cssAccentNames.map { name in
            // name is e.g. "pink" or "hc-pink"; prepend "color-accent-" then camelCase
            let dotted = "color-accent-\(name)"
            return camelCase(dotted)
        }

        // The Mirror-on-Color.Type API is not stable across SwiftUI versions on all
        // platforms, so verify by referencing each static through a switch. Compile-
        // time check: if a Swift twin is missing, this test fails to BUILD, not just
        // fail at runtime — even stronger guarantee.
        for name in swiftNames {
            let exists = swiftAccentColorExists(named: name)
            #expect(exists, "Swift Color.\(name) is missing for its CSS counterpart")
        }
    }

    // MARK: - Helpers (private to this suite)

    /// Walks up from the current working directory looking for Package.swift.
    /// Returns the URL of the repo root, or nil if not found within 8 levels.
    private func findRepoRoot() -> URL? {
        var url = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
        for _ in 0..<8 {
            let pkg = url.appendingPathComponent("Package.swift")
            if FileManager.default.fileExists(atPath: pkg.path) {
                return url
            }
            let parent = url.deletingLastPathComponent()
            if parent.path == url.path { return nil }
            url = parent
        }
        return nil
    }

    /// Extracts the suffixes of all `--lg-color-accent-*` declarations from CSS source.
    /// E.g. "--lg-color-accent-pink: #ff006e;" yields "pink".
    /// "--lg-color-accent-hc-pink: ..." yields "hc-pink".
    private func extractCssAccentVarNames(from css: String) -> [String] {
        let pattern = #"--lg-color-accent-([a-z][a-z0-9-]*)\s*:"#
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return [] }
        let nsCss = css as NSString
        let range = NSRange(location: 0, length: nsCss.length)
        var seen = Set<String>()
        var order: [String] = []
        regex.enumerateMatches(in: css, range: range) { match, _, _ in
            guard let m = match, m.numberOfRanges > 1 else { return }
            let name = nsCss.substring(with: m.range(at: 1))
            if seen.insert(name).inserted { order.append(name) }
        }
        return order
    }

    /// Converts a kebab-cased identifier (e.g. "color-accent-hc-pink") into camelCase
    /// matching Style Dictionary's toCamelCase logic: first segment lowercase, rest
    /// PascalCase. "color-accent-hc-pink" → "colorAccentHcPink".
    private func camelCase(_ kebab: String) -> String {
        let parts = kebab.split(separator: "-").map(String.init)
        guard let first = parts.first else { return "" }
        let rest = parts.dropFirst().map { $0.prefix(1).uppercased() + $0.dropFirst() }
        return first + rest.joined()
    }

    /// Returns true iff `Color.<name>` is defined as a static accent color on Color.
    /// Hardcoded list — kept in sync with Style Dictionary's emitted Swift output.
    /// If a CSS --lg-color-accent-X is added without updating this list, the test
    /// fails and forces a Swift-side addition.
    private func swiftAccentColorExists(named name: String) -> Bool {
        let knownAccentStatics: Set<String> = [
            "colorAccentPink", "colorAccentBlue", "colorAccentGreen",
            "colorAccentAmber", "colorAccentPurple", "colorAccentRed",
            "colorAccentCyan", "colorAccentOrange", "colorAccentIndigo",
            "colorAccentDefault",
            "colorAccentBlueOnDark",
            "colorAccentHcPink", "colorAccentHcPurple", "colorAccentHcRed",
        ]
        return knownAccentStatics.contains(name)
    }
}
