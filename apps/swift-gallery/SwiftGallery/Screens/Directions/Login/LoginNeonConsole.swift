import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

struct LoginNeonConsole: View {
    var body: some View {
        ZStack {
            // Deep base wash so the neon backdrop reads against true black.
            LGColor.surfaceBase
                .ignoresSafeArea()

            // Default launch backdrop (#1 Pulse Rings), subtly dimmed so the
            // WELCOME headline and Apple sign-in content stay readable.
            LaunchAnimationView(kind: .pulseRings, dimmed: true)
                .ignoresSafeArea()

            // Extra scrim over the animation to guarantee text contrast.
            LGColor.surfaceBase.opacity(0.55)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                VStack(spacing: Spacing.s500) {
                    VStack(spacing: Spacing.s200) {
                        Text("WELCOME")
                            .font(.system(size: 28, weight: .bold, design: .monospaced))
                            .foregroundStyle(LGColor.textTitle)
                            .tracking(8)

                        Text("Sign in to access your offline library")
                            .font(.system(size: 13, weight: .regular, design: .monospaced))
                            .foregroundStyle(LGColor.textMuted)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, Spacing.s600)
                    }
                }

                Spacer()

                VStack(spacing: Spacing.s300) {
                    Button {} label: {
                        HStack(spacing: Spacing.s300) {
                            Image(systemName: "apple.logo")
                                .font(.system(size: 18))
                            Text("Sign in with Apple")
                                .font(.system(size: 16, weight: .semibold, design: .monospaced))
                        }
                        .foregroundStyle(LGColor.textTitle)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.s400)
                        .background(LGColor.surfaceRaised)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(LGColor.accentBlue, lineWidth: 1.5)
                                .shadow(color: LGColor.accentBlue.opacity(0.6), radius: 8)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(.rect)

                    Text("Secure authentication via Apple ID")
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundStyle(LGColor.textSubtle)
                }
                .padding(.horizontal, Spacing.s600)
                .padding(.bottom, Spacing.s800)
            }
        }
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
