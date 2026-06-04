import LifegamesTokens
import SwiftUI

struct ColorsShowcase: View {
    fileprivate struct Swatch: Identifiable {
        let id = UUID()
        let name: String
        let token: String
        let color: Color
        let hex: String
    }

    private let groups: [(String, [Swatch])] = [
        ("Backgrounds", [
            Swatch(name: "Background", token: "LGColor.surfaceBase", color: LGColor.surfaceBase, hex: "#0a0a0f"),
            Swatch(name: "Card", token: "LGColor.cardBackground", color: LGColor.cardBackground, hex: "white 3%"),
            Swatch(name: "Surface Raised", token: "LGColor.surfaceRaised", color: LGColor.surfaceRaised, hex: "white 7%"),
            Swatch(name: "Surface Raised Hov.", token: "LGColor.surfaceRaisedHover", color: LGColor.surfaceRaisedHover, hex: "white 5%"),
        ]),
        ("Neon", [
            Swatch(name: "Neon Pink", token: "LGColor.accentPink", color: LGColor.accentPink, hex: "#ff006e"),
            Swatch(name: "Neon Blue", token: "LGColor.accentBlue", color: LGColor.accentBlue, hex: "#3a86ff"),
            Swatch(name: "Neon Green", token: "LGColor.accentGreen", color: LGColor.accentGreen, hex: "#06d6a0"),
            Swatch(name: "Neon Amber", token: "LGColor.accentAmber", color: LGColor.accentAmber, hex: "#f59e0b"),
            Swatch(name: "Neon Purple", token: "LGColor.purple400", color: LGColor.purple400, hex: "#a855f7"),
            Swatch(name: "Neon Default", token: "LGColor.accentDefault", color: LGColor.accentDefault, hex: "#6366f1"),
        ]),
        ("Health", [
            Swatch(name: "Health Red", token: "LGColor.healthRed", color: LGColor.healthRed, hex: "#ff3b30"),
            Swatch(name: "Health Green", token: "LGColor.healthGreen", color: LGColor.healthGreen, hex: "#34c759"),
            Swatch(name: "Health Purple", token: "LGColor.healthPurple", color: LGColor.healthPurple, hex: "#5e5ce6"),
        ]),
        ("Text", [
            Swatch(name: "Primary", token: "LGColor.textPrimary", color: LGColor.textPrimary, hex: "#e4e4e7"),
            Swatch(name: "Title", token: "LGColor.textTitle", color: LGColor.textTitle, hex: "#fafafa"),
            Swatch(name: "Muted", token: "LGColor.textMuted", color: LGColor.textMuted, hex: "#71717a"),
            Swatch(name: "Subtle", token: "LGColor.textSubtle", color: LGColor.textSubtle, hex: "#52525b"),
        ]),
        ("Glass", [
            Swatch(name: "Glass Background", token: "LGColor.surfaceRaised", color: LGColor.surfaceRaised, hex: "white 7%"),
            Swatch(name: "Glass Border", token: "LGColor.cardGlassBorder", color: LGColor.cardGlassBorder, hex: "white 10%"),
            Swatch(name: "Card Border", token: "LGColor.cardBorder", color: LGColor.cardBorder, hex: "white 6%"),
            Swatch(name: "Card Border Hov.", token: "LGColor.cardBorderHover", color: LGColor.cardBorderHover, hex: "#6366f1 20%"),
        ]),
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 32) {
                header
                ForEach(groups, id: \.0) { group, swatches in
                    swatchSection(title: group, swatches: swatches)
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
        }
        .gradientBackground()
        .navigationTitle("Colors")
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
            .preferredColorScheme(.dark)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("/// PALETTE")
                .font(.system(size: 9, weight: .bold, design: .monospaced))
                .kerning(2.5)
                .foregroundStyle(LGColor.accentPink)
            Text("Colors")
                .font(.system(size: 32, weight: .bold))
                .foregroundStyle(LGColor.textTitle)
            Text("Neon, glass, surfaces, and health accents — the visual language of the Lifegames runtime.")
                .font(.system(size: 13))
                .foregroundStyle(LGColor.textMuted)
                .fixedSize(horizontal: false, vertical: true)
            Rectangle()
                .fill(LinearGradient(
                    colors: [LGColor.accentPink, LGColor.accentBlue.opacity(0.0)],
                    startPoint: .leading,
                    endPoint: .trailing
                ))
                .frame(height: 1)
                .padding(.top, 4)
        }
    }

    private func swatchSection(title: String, swatches: [Swatch]) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                Text(title.uppercased())
                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                    .kerning(2.5)
                    .foregroundStyle(LGColor.textSubtle)
                Rectangle()
                    .fill(LGColor.cardGlassBorder)
                    .frame(height: 0.5)
            }
            LazyVGrid(
                columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)],
                spacing: 12
            ) {
                ForEach(swatches) { swatch in
                    SwatchTile(swatch: swatch)
                }
            }
        }
    }
}

private struct SwatchTile: View {
    let swatch: ColorsShowcase.Swatch

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Color block
            Rectangle()
                .fill(swatch.color)
                .frame(height: 80)
                .overlay(alignment: .topTrailing) {
                    // Glow accent on neon swatches
                    if swatch.isNeon {
                        Circle()
                            .fill(swatch.color)
                            .frame(width: 24, height: 24)
                            .blur(radius: 14)
                            .padding(8)
                    }
                }
            // Meta
            VStack(alignment: .leading, spacing: 3) {
                Text(swatch.name)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(LGColor.textPrimary)
                    .lineLimit(1)
                Text(swatch.hex)
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundStyle(LGColor.textMuted)
                Text(swatch.token)
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundStyle(LGColor.textSubtle)
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(LGColor.surfaceRaised.opacity(0.4))
        }
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(LGColor.cardGlassBorder, lineWidth: 0.5)
        )
    }
}

private extension ColorsShowcase.Swatch {
    var isNeon: Bool {
        token.hasPrefix("LGColor.accent") || token == "LGColor.purple400"
    }
}

#Preview("Colors") {
    NavigationStack {
        ColorsShowcase()
    }
    .preferredColorScheme(.dark)
}
