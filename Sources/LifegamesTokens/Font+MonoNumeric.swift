import SwiftUI

public extension Font.Tokens {
    /// Monospaced numeric font for live readouts (weight, caffeine, timers).
    /// Role-based token — callers use `Font.Tokens.monoNumeric(…)`, not `.system(size:design:.monospaced)` directly.
    /// Companion to the generated `Font+Tokens.swift`; do NOT put this in that file.
    static func monoNumeric(_ size: CGFloat, weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight, design: .monospaced)
    }
}
