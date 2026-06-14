import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTemplates
import LifegamesTokens
import SwiftUI

struct LaunchNeonConsole: View {
    var body: some View {
        // Built on AuthScaffold: pure Launch = no primaryAction. The wordmark is
        // a self-contained gradient SpaceGrotesk display face, so `title` is nil
        // (the scaffold renders no second system-font headline). The buffering
        // backdrop sits in its own zone BELOW the wordmark, inside the branding
        // slot, so the branding is never obstructed. The OMD color washes are
        // supplied via the scaffold's `background` slot.
        AuthScaffold(accent: LGColor.accentBlue) {
            VStack(spacing: 0) {
                wordmark

                BufferRingAnimation()
                    .frame(height: 200)
                    .padding(.top, Spacing.s700)
            }
        } background: {
            ZStack {
                LinearGradient(
                    colors: [LGColor.surfaceDeep, LGColor.surfaceBase],
                    startPoint: .top,
                    endPoint: .bottom
                )
                OMDBrand.colorWashes
            }
        }
    }

    /// OFFLINE in the brand SpaceGrotesk display face with a cyan→blue→pink
    /// gradient fill and neon glow; "media downloader" demoted to a cyan subhead.
    private var wordmark: some View {
        VStack(spacing: Spacing.s300) {
            Text("OFFLINE")
                .font(OMDFont.bold(54))
                .tracking(5)
                .foregroundStyle(OMDBrand.wordmarkGradient)
                .shadow(color: LGColor.accentCyan.opacity(0.5), radius: 18)
                .shadow(color: LGColor.accentPink.opacity(0.3), radius: 28)
                .minimumScaleFactor(0.6)
                .lineLimit(1)

            Text("media downloader")
                .font(OMDFont.medium(15))
                .tracking(5)
                .foregroundStyle(LGColor.accentCyan.opacity(0.9))
        }
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
