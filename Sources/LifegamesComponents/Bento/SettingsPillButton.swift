import LifegamesTokens
import SwiftUI

/// Compact tinted pill button for settings action groups.
///
/// Single-line, all-caps label with an accent-tinted background and border.
/// Designed to sit in equal-width `HStack` groups of three — `minimumScaleFactor(0.7)`
/// ensures long labels like "Share Log" never wrap to a second line.
///
/// Usage:
/// ```swift
/// HStack(spacing: 7) {
///     SettingsPillButton("Sync Now",   accent: LGColor.accentPurple) {}
///     SettingsPillButton("Full Re-sync", accent: LGColor.accentAmber) {}
///     SettingsPillButton("Delete All", accent: LGColor.healthRed)    {}
/// }
/// ```
public struct SettingsPillButton: View {
    public let title: String
    public let accent: Color
    public let action: () -> Void

    public init(_ title: String, accent: Color, action: @escaping () -> Void) {
        self.title = title
        self.accent = accent
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            Text(title.uppercased())
                .font(.system(size: 10, weight: .bold))
                .kerning(0.5)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .foregroundStyle(accent)
                .padding(.vertical, 8)
                .padding(.horizontal, 6)
                .frame(maxWidth: .infinity)
                .background(accent.opacity(0.13))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(accent.opacity(0.26), lineWidth: 1)
                )
        }
    }
}

// MARK: - Preview

#if os(iOS)
    #Preview("Settings Pill Buttons") {
        VStack(spacing: 12) {
            HStack(spacing: 7) {
                SettingsPillButton("Sync Now", accent: LGColor.accentPurple) {}
                SettingsPillButton("Full Re-sync", accent: LGColor.accentAmber) {}
                SettingsPillButton("Delete All", accent: LGColor.healthRed) {}
            }
            HStack(spacing: 7) {
                SettingsPillButton("Share Log", accent: LGColor.accentIndigo) {}
                SettingsPillButton("Clear", accent: LGColor.accentIndigo) {}
                SettingsPillButton("Reload", accent: LGColor.accentIndigo) {}
            }
        }
        .padding(Spacing.s400)
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
    }
#endif
