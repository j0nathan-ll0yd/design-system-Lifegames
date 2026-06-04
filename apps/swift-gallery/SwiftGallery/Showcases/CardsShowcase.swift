import LifegamesComponents
import LifegamesTokens
import SwiftUI

struct CardsShowcase: View {
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                portalCardSample(label: ".portalCard()", description: "Standard card with glass tint and border")
                glassMorphicSample(label: ".glassMorphic()", description: "Ultra-thin material blur")
                neonCardSample(label: ".neonCard(accent: .neonPink)", color: LGColor.accentPink)
                neonCardSample(label: ".neonCard(accent: .neonBlue)", color: LGColor.accentBlue)
                neonCardSample(label: ".neonCard(accent: .neonGreen)", color: LGColor.accentGreen)
                glassCardSample(label: ".glassCard(tint: .accentPurple)", tint: LGColor.accentPurple)
                minimalSample(label: ".minimalSection()")
            }
            .padding()
        }
        .gradientBackground()
        .navigationTitle("Cards")
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
            .preferredColorScheme(.dark)
    }

    private func portalCardSample(label: String, description: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 12, weight: .semibold, design: .monospaced))
                .foregroundStyle(LGColor.textPrimary)
            Text(description)
                .font(.system(size: 10))
                .foregroundStyle(LGColor.textMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .portalCard()
    }

    private func glassMorphicSample(label: String, description: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 12, weight: .semibold, design: .monospaced))
                .foregroundStyle(LGColor.textPrimary)
            Text(description)
                .font(.system(size: 10))
                .foregroundStyle(LGColor.textMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassMorphic()
    }

    private func neonCardSample(label: String, color: Color) -> some View {
        Text(label)
            .font(.system(size: 12, weight: .semibold, design: .monospaced))
            .foregroundStyle(LGColor.textPrimary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .neonCard(accent: color)
    }

    private func glassCardSample(label: String, tint: Color) -> some View {
        Text(label)
            .font(.system(size: 12, weight: .semibold, design: .monospaced))
            .foregroundStyle(LGColor.textPrimary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .glassCard(tint: tint)
    }

    private func minimalSample(label: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 12, weight: .semibold, design: .monospaced))
                .foregroundStyle(LGColor.textPrimary)
            Text("Bottom-border divider only")
                .font(.system(size: 10))
                .foregroundStyle(LGColor.textMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .minimalSection()
    }
}

#Preview("Cards") {
    NavigationStack {
        CardsShowcase()
    }
    .preferredColorScheme(.dark)
}
