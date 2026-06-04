import LifegamesComponents
import LifegamesTokens
import SwiftUI

struct CardsShowcase: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 32) {
                header
                surfaceSection
                neonSection
                glassTintSection
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
        }
        .gradientBackground()
        .navigationTitle("Cards")
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
            .preferredColorScheme(.dark)
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("/// SURFACES")
                .font(.system(size: 9, weight: .bold, design: .monospaced))
                .kerning(2.5)
                .foregroundStyle(LGColor.accentGreen)
            Text("Cards")
                .font(.system(size: 32, weight: .bold))
                .foregroundStyle(LGColor.textTitle)
            Text("Glass surfaces, neon-accented containers, and minimal section dividers — the vessels for every metric and feed.")
                .font(.system(size: 13))
                .foregroundStyle(LGColor.textMuted)
                .fixedSize(horizontal: false, vertical: true)
            Rectangle()
                .fill(LinearGradient(
                    colors: [LGColor.accentGreen, LGColor.accentBlue.opacity(0.0)],
                    startPoint: .leading,
                    endPoint: .trailing
                ))
                .frame(height: 1)
                .padding(.top, 4)
        }
    }

    // MARK: - Sections

    private var surfaceSection: some View {
        section(title: "Surfaces") {
            VStack(spacing: 14) {
                sampleCard(
                    token: ".portalCard()",
                    description: "Standard card with glass tint and border"
                ) { content in
                    content.portalCard()
                }
                sampleCard(
                    token: ".glassMorphic()",
                    description: "Ultra-thin material blur"
                ) { content in
                    content.glassMorphic()
                }
                sampleCard(
                    token: ".minimalSection()",
                    description: "Bottom-border divider only"
                ) { content in
                    content.minimalSection()
                }
            }
        }
    }

    private var neonSection: some View {
        section(title: "Neon Cards") {
            VStack(spacing: 14) {
                neonCardSample(token: ".neonCard(accent: .accentPink)", color: LGColor.accentPink)
                neonCardSample(token: ".neonCard(accent: .accentBlue)", color: LGColor.accentBlue)
                neonCardSample(token: ".neonCard(accent: .accentGreen)", color: LGColor.accentGreen)
                neonCardSample(token: ".neonCard(accent: .accentAmber)", color: LGColor.accentAmber)
                neonCardSample(token: ".neonCard(accent: .purple400)", color: LGColor.purple400)
            }
        }
    }

    private var glassTintSection: some View {
        section(title: "Glass Tint") {
            VStack(spacing: 14) {
                glassTintSample(token: ".glassCard(tint: .accentPurple)", tint: LGColor.accentPurple)
                glassTintSample(token: ".glassCard(tint: .accentBlue)", tint: LGColor.accentBlue)
                glassTintSample(token: ".glassCard(tint: .accentPink)", tint: LGColor.accentPink)
            }
        }
    }

    // MARK: - Section + Sample primitives

    private func section<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
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
            content()
        }
    }

    private func sampleCard<Mod: View>(
        token: String,
        description: String,
        @ViewBuilder applyModifier: (AnyView) -> Mod
    ) -> some View {
        applyModifier(AnyView(
            VStack(alignment: .leading, spacing: 6) {
                Text(token)
                    .font(.system(size: 12, weight: .semibold, design: .monospaced))
                    .foregroundStyle(LGColor.textTitle)
                Text(description)
                    .font(.system(size: 10))
                    .foregroundStyle(LGColor.textMuted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        ))
    }

    private func neonCardSample(token: String, color: Color) -> some View {
        HStack(spacing: 10) {
            Circle()
                .fill(color)
                .frame(width: 10, height: 10)
                .shadow(color: color.opacity(0.7), radius: 6)
            Text(token)
                .font(.system(size: 12, weight: .semibold, design: .monospaced))
                .foregroundStyle(LGColor.textTitle)
            Spacer()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .neonCard(accent: color)
    }

    private func glassTintSample(token: String, tint: Color) -> some View {
        HStack(spacing: 10) {
            Circle()
                .fill(tint.opacity(0.6))
                .frame(width: 10, height: 10)
            Text(token)
                .font(.system(size: 12, weight: .semibold, design: .monospaced))
                .foregroundStyle(LGColor.textTitle)
            Spacer()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassCard(tint: tint)
    }
}

#Preview("Cards") {
    NavigationStack {
        CardsShowcase()
    }
    .preferredColorScheme(.dark)
}
