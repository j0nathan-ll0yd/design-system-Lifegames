import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

struct LoginNeonConsole: View {
    var body: some View {
        ZStack {
            // Colorful base wash.
            LinearGradient(
                colors: [LGColor.surfaceDeep, LGColor.surfaceBase],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            OMDBrand.colorWashes
                .ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                welcome

                // The Buffer backdrop sits BELOW the welcome copy in its own
                // zone so the headline and CTA are never obstructed.
                LaunchAnimationView(kind: .bufferRing)
                    .frame(height: 170)
                    .padding(.top, Spacing.s600)

                Spacer()

                signIn
            }
            .padding(.horizontal, Spacing.s600)
            .padding(.bottom, Spacing.s800)
        }
    }

    private var welcome: some View {
        VStack(spacing: Spacing.s300) {
            Text("WELCOME")
                .font(OMDFont.bold(34))
                .tracking(6)
                .foregroundStyle(OMDBrand.wordmarkGradient)
                .shadow(color: LGColor.accentBlue.opacity(0.5), radius: 14)

            Text("Sign in to access your offline library")
                .font(OMDFont.regular(14))
                .foregroundStyle(LGColor.textMuted)
                .multilineTextAlignment(.center)
        }
    }

    private var signIn: some View {
        VStack(spacing: Spacing.s300) {
            appleButton

            Text("Secure authentication via Apple ID")
                .font(OMDFont.regular(10))
                .foregroundStyle(LGColor.textSubtle)
        }
    }

    private var appleButton: some View {
        Button {} label: {
            HStack(spacing: Spacing.s300) {
                Image(systemName: "apple.logo")
                    .font(.system(size: 18))
                Text("Sign in with Apple")
                    .font(OMDFont.semibold(16))
            }
            .foregroundStyle(LGColor.textTitle)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.s400)
            .background(LGColor.surfaceRaised)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(OMDBrand.wordmarkGradient, lineWidth: 1.5)
            )
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: LGColor.accentBlue.opacity(0.5), radius: 10)
        }
        .frame(minWidth: 44, minHeight: 44)
        .contentShape(.rect)
    }
}

enum LoginScreen {
    static let entry = ScreenEntry(
        id: "login",
        title: "Login",
        directions: [
            ScreenDirection(id: "neon-console", label: "Neon Console") {
                AnyView(LoginNeonConsole())
            },
        ]
    )
}

#Preview("Login — Neon Console") {
    LoginNeonConsole()
        .preferredColorScheme(.dark)
}
