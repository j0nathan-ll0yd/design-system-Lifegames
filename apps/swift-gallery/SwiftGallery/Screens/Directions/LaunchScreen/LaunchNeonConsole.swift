import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

struct LaunchNeonConsole: View {
    /// Which of the five candidate backdrops is shown behind the wordmark.
    /// Defaults to animation 1 (Buffer Ring) per the review brief.
    @State private var selectedAnimation: LaunchAnimationKind = .bufferRing

    var body: some View {
        ZStack {
            // Colorful base: deep vertical wash + neon radial accents.
            LinearGradient(
                colors: [LGColor.surfaceDeep, LGColor.surfaceBase],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            OMDBrand.colorWashes
                .ignoresSafeArea()

            // Selected candidate animation lives BEHIND the branding.
            LaunchAnimationView(kind: selectedAnimation)
                .ignoresSafeArea()
                .animation(.easeInOut(duration: 0.35), value: selectedAnimation)

            VStack(spacing: Spacing.s1200) {
                Spacer()

                wordmark

                Spacer()

                animationPicker
                    .padding(.bottom, Spacing.s800)
            }
            .padding(.horizontal, Spacing.s600)
        }
    }

    // MARK: - Branding (the hero)

    /// OFFLINE in the brand SpaceGrotesk display face with a cyan→blue→pink
    /// gradient fill and neon glow; "media downloader" demoted to a cyan subhead.
    private var wordmark: some View {
        VStack(spacing: Spacing.s300) {
            Text("OFFLINE")
                .font(.custom("SpaceGrotesk-Bold", size: 54))
                .tracking(5)
                .foregroundStyle(OMDBrand.wordmarkGradient)
                .shadow(color: LGColor.accentCyan.opacity(0.5), radius: 18)
                .shadow(color: LGColor.accentPink.opacity(0.3), radius: 28)
                .minimumScaleFactor(0.6)
                .lineLimit(1)

            Text("media downloader")
                .font(.custom("SpaceGrotesk-Medium", size: 15))
                .tracking(5)
                .foregroundStyle(LGColor.accentCyan.opacity(0.9))
        }
    }

    // MARK: - Comparison control

    /// Small segmented control for reviewing the five candidates. Segmented
    /// picker style is cross-platform, so no `#if os(iOS)` guard is required.
    private var animationPicker: some View {
        VStack(spacing: Spacing.s200) {
            Text("BACKDROP")
                .font(.custom("SpaceGrotesk-Medium", size: 9))
                .foregroundStyle(LGColor.textSubtle)
                .tracking(4)

            Picker("Backdrop animation", selection: $selectedAnimation) {
                ForEach(LaunchAnimationKind.allCases) { kind in
                    Text(kind.label).tag(kind)
                }
            }
            .pickerStyle(.segmented)
            .tint(LGColor.accentBlue)

            Text(selectedAnimation.summary)
                .font(.custom("SpaceGrotesk-Regular", size: 11))
                .foregroundStyle(LGColor.textSubtle)
                .multilineTextAlignment(.center)
                .animation(.easeInOut(duration: 0.2), value: selectedAnimation)
        }
        .padding(Spacing.s400)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(LGColor.surfaceDeep.opacity(0.7))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(LGColor.accentBlue.opacity(0.25), lineWidth: 1)
                )
        )
    }
}

enum LaunchScreen {
    static let entry = ScreenEntry(
        id: "launch-screen",
        title: "Launch Screen",
        directions: [
            ScreenDirection(id: "neon-console", label: "Neon Console") {
                AnyView(LaunchNeonConsole())
            },
        ]
    )
}

#Preview("Launch — Neon Console") {
    LaunchNeonConsole()
        .preferredColorScheme(.dark)
}
