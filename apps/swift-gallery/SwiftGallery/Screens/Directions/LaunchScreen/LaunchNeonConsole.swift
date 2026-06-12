import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

struct LaunchNeonConsole: View {
    /// Which of the five candidate backdrops is shown behind the wordmark.
    /// Defaults to animation 1 (Pulse Rings) per the review brief.
    @State private var selectedAnimation: LaunchAnimationKind = .pulseRings

    var body: some View {
        ZStack {
            // Deep base wash so the neon backdrop reads against true black.
            LGColor.surfaceBase
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

    /// OFFLINE rendered large in the established monospaced/bold/tracked brand
    /// treatment, with "media downloader" demoted to a muted subheading.
    private var wordmark: some View {
        VStack(spacing: Spacing.s300) {
            Text("OFFLINE")
                .font(.system(size: 56, weight: .heavy, design: .monospaced))
                .foregroundStyle(LGColor.textTitle)
                .tracking(10)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
                .shadow(color: LGColor.accentBlue.opacity(0.35), radius: 18)

            Text("media downloader")
                .font(.system(size: 14, weight: .regular, design: .monospaced))
                .foregroundStyle(LGColor.textMuted)
                .tracking(6)
        }
    }

    // MARK: - Comparison control

    /// Small segmented control for reviewing the five candidates. Segmented
    /// picker style is cross-platform, so no `#if os(iOS)` guard is required.
    private var animationPicker: some View {
        VStack(spacing: Spacing.s200) {
            Text("BACKDROP")
                .font(.system(size: 9, weight: .semibold, design: .monospaced))
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
                .font(.system(size: 10, weight: .regular, design: .monospaced))
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
