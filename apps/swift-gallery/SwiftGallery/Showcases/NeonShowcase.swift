import LifegamesComponents
import LifegamesTokens
import SwiftUI

struct NeonShowcase: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                effectSection("neonGlow() on Text") {
                    VStack(spacing: 14) {
                        Text("NEON PINK")
                            .font(.system(size: 16, weight: .bold, design: .monospaced))
                            .foregroundStyle(LGColor.accentPink)
                            .neonGlow(LGColor.accentPink)
                        Text("NEON BLUE")
                            .font(.system(size: 16, weight: .bold, design: .monospaced))
                            .foregroundStyle(LGColor.accentBlue)
                            .neonGlow(LGColor.accentBlue)
                        Text("NEON GREEN")
                            .font(.system(size: 16, weight: .bold, design: .monospaced))
                            .foregroundStyle(LGColor.accentGreen)
                            .neonGlow(LGColor.accentGreen)
                        Text("NEON AMBER")
                            .font(.system(size: 16, weight: .bold, design: .monospaced))
                            .foregroundStyle(LGColor.accentAmber)
                            .neonGlow(LGColor.accentAmber)
                    }
                    .frame(maxWidth: .infinity)
                }

                effectSection("Neon Card Accent Bars") {
                    VStack(spacing: 12) {
                        accentBarCard(label: "neonPink accent", color: LGColor.accentPink)
                        accentBarCard(label: "neonBlue accent", color: LGColor.accentBlue)
                        accentBarCard(label: "neonGreen accent", color: LGColor.accentGreen)
                        accentBarCard(label: "neonAmber accent", color: LGColor.accentAmber)
                        accentBarCard(label: "neonPurple accent", color: LGColor.purple400)
                    }
                }

                effectSection("Glow Shadow Radii") {
                    VStack(spacing: 16) {
                        glowSample(label: "radius: 4", radius: 4)
                        glowSample(label: "radius: 8", radius: 8)
                        glowSample(label: "radius: 16", radius: 16)
                    }
                    .frame(maxWidth: .infinity)
                }

                effectSection("Animated Effects") {
                    HStack(spacing: 40) {
                        VStack(spacing: 8) {
                            LiveDotView(color: LGColor.accentGreen)
                            Text("LiveDot")
                                .font(.system(size: 9, design: .monospaced))
                                .foregroundStyle(LGColor.textMuted)
                        }
                        VStack(spacing: 8) {
                            PulsingMapMarker(color: LGColor.accentBlue)
                                .frame(height: 40)
                            Text("PulsingMarker")
                                .font(.system(size: 9, design: .monospaced))
                                .foregroundStyle(LGColor.textMuted)
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .padding()
        }
        .gradientBackground()
        .navigationTitle("Neon Effects")
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
            .preferredColorScheme(.dark)
    }

    private func effectSection<Content: View>(_ name: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(name)
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .kerning(1)
                .foregroundStyle(LGColor.textSubtle)
                .textCase(.uppercase)
            content()
        }
    }

    private func accentBarCard(label: String, color: Color) -> some View {
        Text(label)
            .font(.system(size: 12, weight: .semibold, design: .monospaced))
            .foregroundStyle(LGColor.textPrimary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .neonCard(accent: color)
    }

    private func glowSample(label: String, radius: CGFloat) -> some View {
        HStack(spacing: 16) {
            Text(label)
                .font(.system(size: 10, design: .monospaced))
                .foregroundStyle(LGColor.textMuted)
                .frame(width: 80, alignment: .leading)
            Text("LIFE PORTAL")
                .font(.system(size: 14, weight: .bold, design: .monospaced))
                .foregroundStyle(LGColor.accentPink)
                .neonGlow(LGColor.accentPink, radius: radius)
        }
    }
}

#Preview("Neon Effects") {
    NavigationStack {
        NeonShowcase()
    }
    .preferredColorScheme(.dark)
}
