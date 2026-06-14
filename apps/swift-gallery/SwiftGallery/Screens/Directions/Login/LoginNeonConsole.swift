import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

struct LoginNeonConsole: View {
    var body: some View {
        ZStack {
            // Colorful base wash so the neon backdrop reads against true black.
            LinearGradient(
                colors: [LGColor.surfaceDeep, LGColor.surfaceBase],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            OMDBrand.colorWashes
                .ignoresSafeArea()

            // Default launch backdrop (#1 Buffer Ring), subtly dimmed so the
            // WELCOME headline and Apple sign-in content stay readable.
            LaunchAnimationView(kind: .bufferRing, dimmed: true)
                .ignoresSafeArea()

            // Extra scrim over the animation to guarantee text contrast.
            LGColor.surfaceBase.opacity(0.4)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                VStack(spacing: Spacing.s300) {
                    Text("WELCOME")
                        .font(.custom("SpaceGrotesk-Bold", size: 34))
                        .tracking(6)
                        .foregroundStyle(OMDBrand.wordmarkGradient)
                        .shadow(color: LGColor.accentBlue.opacity(0.5), radius: 14)

                    Text("Sign in to access your offline library")
                        .font(.custom("SpaceGrotesk-Regular", size: 14))
                        .foregroundStyle(LGColor.textMuted)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, Spacing.s600)
                }

                Spacer()

                VStack(spacing: Spacing.s300) {
                    appleButton

                    Text("Secure authentication via Apple ID")
                        .font(.custom("SpaceGrotesk-Regular", size: 10))
                        .foregroundStyle(LGColor.textSubtle)
                }
                .padding(.horizontal, Spacing.s600)
                .padding(.bottom, Spacing.s800)
            }
        }
    }

    private var appleButton: some View {
        Button {} label: {
            HStack(spacing: Spacing.s300) {
                Image(systemName: "apple.logo")
                    .font(.system(size: 18))
                Text("Sign in with Apple")
                    .font(.custom("SpaceGrotesk-SemiBold", size: 16))
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
