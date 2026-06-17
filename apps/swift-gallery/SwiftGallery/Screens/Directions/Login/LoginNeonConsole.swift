import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTemplates
import LifegamesTokens
import SwiftUI

struct LoginNeonConsole: View {
    var body: some View {
        // Built on AuthTemplate. The welcome copy is a self-contained gradient
        // wordmark + subtitle, so `title` is nil and the headline lives in the
        // branding slot alongside the Buffer backdrop. The Apple sign-in control
        // fills `primaryAction`; the security caption is the `footer`. The OMD
        // color washes are supplied via the template's `background` slot.
        AuthTemplate(accent: LGColor.accentBlue) {
            VStack(spacing: 0) {
                welcome

                BufferRingAnimation()
                    .frame(height: 170)
                    .padding(.top, Spacing.s600)
            }
        } primaryAction: {
            VStack(spacing: Spacing.s300) {
                appleButton
                emailButton
            }
        } footer: {
            Text("Secure authentication via Apple ID")
                .font(OMDFont.regular(10))
                .foregroundStyle(LGColor.textSubtle)
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

    private var emailButton: some View {
        Button {} label: {
            HStack(spacing: Spacing.s300) {
                Image(systemName: "envelope.fill")
                    .font(.system(size: 16))
                Text("Continue with Email")
                    .font(OMDFont.semibold(16))
            }
            .foregroundStyle(LGColor.textPrimary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.s400)
            .background(LGColor.surfaceRaised.opacity(0.6))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(LGColor.borderSubtle, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 12))
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
