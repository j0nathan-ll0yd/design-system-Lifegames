import LifegamesTokens
import SwiftUI

struct ColorsShowcase: View {
    private struct Swatch: Identifiable {
        let id = UUID()
        let name: String
        let color: Color
        let hex: String
    }

    private let groups: [(String, [Swatch])] = [
        ("Backgrounds", [
            Swatch(name: "background", color: LGColor.surfaceBase, hex: "#0a0a0f"),
            Swatch(name: "cardBackground", color: LGColor.cardBackground, hex: "w 3%"),
            Swatch(name: "cardBackgroundHover", color: LGColor.surfaceRaisedHover, hex: "w 5%"),
            Swatch(name: "cardBorder", color: LGColor.cardBorder, hex: "w 6%"),
            Swatch(name: "cardBorderHover", color: LGColor.cardBorderHover, hex: "#6366f1 20%"),
        ]),
        ("Text", [
            Swatch(name: "textPrimary", color: LGColor.textPrimary, hex: "#e4e4e7"),
            Swatch(name: "textTitle", color: LGColor.textTitle, hex: "#fafafa"),
            Swatch(name: "textMuted", color: LGColor.textMuted, hex: "#71717a"),
            Swatch(name: "textSubtle", color: LGColor.textSubtle, hex: "#52525b"),
        ]),
        ("Accents", [
            Swatch(name: "accent", color: LGColor.accentDefault, hex: "#6366f1"),
            Swatch(name: "accentPurple", color: LGColor.accentPurple, hex: "#8b5cf6"),
            Swatch(name: "accentBlue", color: LGColor.accentBlue, hex: "#3b82f6"),
        ]),
        ("Neon", [
            Swatch(name: "neonPink", color: LGColor.accentPink, hex: "#ff006e"),
            Swatch(name: "neonBlue", color: LGColor.accentBlue, hex: "#3a86ff"),
            Swatch(name: "neonGreen", color: LGColor.accentGreen, hex: "#06d6a0"),
            Swatch(name: "neonAmber", color: LGColor.accentAmber, hex: "#f59e0b"),
            Swatch(name: "neonPurple", color: LGColor.purple400, hex: "#a855f7"),
        ]),
        ("Health", [
            Swatch(name: "healthRed", color: LGColor.healthRed, hex: "#ff3b30"),
            Swatch(name: "healthGreen", color: LGColor.healthGreen, hex: "#34c759"),
            Swatch(name: "healthPurple", color: LGColor.healthPurple, hex: "#5e5ce6"),
        ]),
        ("Glass", [
            Swatch(name: "glassBackground", color: LGColor.surfaceRaised, hex: "w 7%"),
            Swatch(name: "glassBorder", color: LGColor.cardGlassBorder, hex: "w 10%"),
        ]),
        ("Utility", [
            Swatch(name: "cardArrow", color: LGColor.textSubtle, hex: "#3f3f46"),
        ]),
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                ForEach(groups, id: \.0) { group, swatches in
                    VStack(alignment: .leading, spacing: 10) {
                        Text(group.uppercased())
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .kerning(2)
                            .foregroundStyle(LGColor.textSubtle)

                        LazyVGrid(
                            columns: [GridItem(.flexible()), GridItem(.flexible())],
                            spacing: 10
                        ) {
                            ForEach(swatches) { swatch in
                                HStack(spacing: 10) {
                                    Circle()
                                        .fill(swatch.color)
                                        .frame(width: 28, height: 28)
                                        .overlay(Circle().stroke(LGColor.cardGlassBorder, lineWidth: 1))
                                    VStack(alignment: .leading, spacing: 1) {
                                        Text(swatch.name)
                                            .font(.system(size: 10, weight: .semibold, design: .monospaced))
                                            .foregroundStyle(LGColor.textPrimary)
                                            .lineLimit(1)
                                        Text(swatch.hex)
                                            .font(.system(size: 9, design: .monospaced))
                                            .foregroundStyle(LGColor.textMuted)
                                    }
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                    }
                }
            }
            .padding()
        }
        .gradientBackground()
        .navigationTitle("Colors")
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
            .preferredColorScheme(.dark)
    }
}

#Preview("Colors") {
    NavigationStack {
        ColorsShowcase()
    }
    .preferredColorScheme(.dark)
}
