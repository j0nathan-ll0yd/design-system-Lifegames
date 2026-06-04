import LifegamesComponents
import LifegamesTokens
import SwiftUI

struct NeonShowcase: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 32) {
                header
                glowOnTextSection
                accentBarSection
                glowRadiiSection
                animatedSection
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
        }
        .gradientBackground()
        .navigationTitle("Neon Effects")
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
            .preferredColorScheme(.dark)
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("/// GLOW SYSTEM")
                .font(.system(size: 9, weight: .bold, design: .monospaced))
                .kerning(2.5)
                .foregroundStyle(LGColor.accentPink)
            Text("Neon Effects")
                .font(.system(size: 32, weight: .bold))
                .foregroundStyle(LGColor.textTitle)
                .neonGlow(LGColor.accentPink, radius: 8)
            Text("Glow, pulses, and animated affordances that signal aliveness — the kinetic vocabulary of Human Datastream.")
                .font(.system(size: 13))
                .foregroundStyle(LGColor.textMuted)
                .fixedSize(horizontal: false, vertical: true)
            Rectangle()
                .fill(LinearGradient(
                    colors: [LGColor.accentPink, LGColor.accentPurple.opacity(0.0)],
                    startPoint: .leading,
                    endPoint: .trailing
                ))
                .frame(height: 1)
                .padding(.top, 4)
        }
    }

    // MARK: - Sections

    private var glowOnTextSection: some View {
        section(title: "Glow on Text") {
            sampleCard(token: ".neonGlow(color)", note: "Dual radial shadow for that synth-wave glow") {
                VStack(spacing: 16) {
                    glowText("NEON PINK", color: LGColor.accentPink)
                    glowText("NEON BLUE", color: LGColor.accentBlue)
                    glowText("NEON GREEN", color: LGColor.accentGreen)
                    glowText("NEON AMBER", color: LGColor.accentAmber)
                    glowText("NEON PURPLE", color: LGColor.purple400)
                }
                .frame(maxWidth: .infinity)
            }
        }
    }

    private var accentBarSection: some View {
        section(title: "Neon Card Accent Bars") {
            VStack(spacing: 14) {
                accentBarCard(token: ".neonCard(accent: .accentPink)", color: LGColor.accentPink)
                accentBarCard(token: ".neonCard(accent: .accentBlue)", color: LGColor.accentBlue)
                accentBarCard(token: ".neonCard(accent: .accentGreen)", color: LGColor.accentGreen)
                accentBarCard(token: ".neonCard(accent: .accentAmber)", color: LGColor.accentAmber)
                accentBarCard(token: ".neonCard(accent: .purple400)", color: LGColor.purple400)
            }
        }
    }

    private var glowRadiiSection: some View {
        section(title: "Glow Shadow Radii") {
            sampleCard(token: ".neonGlow(color, radius:)", note: "Tweak the spread to dial down or amplify the bloom") {
                VStack(spacing: 18) {
                    glowSample(radius: 4)
                    glowSample(radius: 8)
                    glowSample(radius: 16)
                    glowSample(radius: 24)
                }
                .frame(maxWidth: .infinity)
            }
        }
    }

    private var animatedSection: some View {
        section(title: "Animated") {
            sampleCard(token: "LiveDotView / PulsingMapMarker", note: "Continuous looped animations") {
                HStack(spacing: 48) {
                    animatedSwatch(label: "LiveDot") {
                        LiveDotView(color: LGColor.accentGreen)
                    }
                    animatedSwatch(label: "PulsingMarker") {
                        PulsingMapMarker(color: LGColor.accentBlue)
                            .frame(height: 42)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
            }
        }
    }

    // MARK: - Section primitives

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

    private func sampleCard<Content: View>(token: String, note: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Text(token)
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundStyle(LGColor.accentPink)
                Text("—  \(note)")
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundStyle(LGColor.textSubtle)
                    .lineLimit(1)
                    .truncationMode(.tail)
            }
            content()
                .padding(.top, 6)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(LGColor.surfaceRaised.opacity(0.4))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(LGColor.cardGlassBorder, lineWidth: 0.5)
        )
    }

    // MARK: - Sample widgets

    private func glowText(_ label: String, color: Color) -> some View {
        Text(label)
            .font(.system(size: 18, weight: .bold, design: .monospaced))
            .kerning(2)
            .foregroundStyle(color)
            .neonGlow(color)
    }

    private func accentBarCard(token: String, color: Color) -> some View {
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

    private func glowSample(radius: CGFloat) -> some View {
        HStack(spacing: 16) {
            Text("radius: \(Int(radius))")
                .font(.system(size: 10, design: .monospaced))
                .foregroundStyle(LGColor.textMuted)
                .frame(width: 96, alignment: .leading)
            Text("LIFE PORTAL")
                .font(.system(size: 16, weight: .bold, design: .monospaced))
                .kerning(2)
                .foregroundStyle(LGColor.accentPink)
                .neonGlow(LGColor.accentPink, radius: radius)
            Spacer()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func animatedSwatch<Content: View>(label: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(spacing: 10) {
            content()
            Text(label)
                .font(.system(size: 9, design: .monospaced))
                .foregroundStyle(LGColor.textMuted)
        }
    }
}

#Preview("Neon Effects") {
    NavigationStack {
        NeonShowcase()
    }
    .preferredColorScheme(.dark)
}
