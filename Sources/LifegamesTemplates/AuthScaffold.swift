import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

/// **Status:** Experimental
///
/// Brand-agnostic auth shell. Launch and Login collapse into one branded
/// surface: a centered branding slot (wordmark / backdrop), a title/subtitle,
/// an optional primary action (e.g. Sign in with Apple — the host owns its
/// style), and an optional footer (legal / alternate actions).
///
/// Pure Launch = omit `primaryAction` (defaults to `EmptyView`).
/// Login = fill it. All static text is host-owned `LocalizedStringKey`; the
/// `accent` (default `LGColor.accentDefault`) tints the ambient glow only.
public struct AuthScaffold<Branding: View, PrimaryAction: View, Footer: View>: View {
    public let title: LocalizedStringKey
    public let subtitle: LocalizedStringKey?
    public var accent: Color
    public let branding: Branding
    public let primaryAction: PrimaryAction
    public let footer: Footer

    public init(
        title: LocalizedStringKey,
        subtitle: LocalizedStringKey? = nil,
        accent: Color = LGColor.accentDefault,
        @ViewBuilder branding: () -> Branding,
        @ViewBuilder primaryAction: () -> PrimaryAction = { EmptyView() },
        @ViewBuilder footer: () -> Footer = { EmptyView() }
    ) {
        self.title = title
        self.subtitle = subtitle
        self.accent = accent
        self.branding = branding()
        self.primaryAction = primaryAction()
        self.footer = footer()
    }

    public var body: some View {
        ZStack {
            LGColor.surfaceBase
                .ignoresSafeArea()

            RadialGradient(
                colors: [accent.opacity(0.10), .clear],
                center: .top,
                startRadius: 0,
                endRadius: 500
            )
            .ignoresSafeArea()

            VStack(spacing: Spacing.s600) {
                Spacer()

                branding

                VStack(spacing: Spacing.s200) {
                    Text(title)
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundStyle(LGColor.textTitle)
                        .multilineTextAlignment(.center)

                    if let subtitle {
                        Text(subtitle)
                            .font(.system(size: 15))
                            .foregroundStyle(LGColor.textMuted)
                            .multilineTextAlignment(.center)
                    }
                }

                Spacer()

                VStack(spacing: Spacing.s400) {
                    primaryAction
                    footer
                }
            }
            .padding(.horizontal, Spacing.s600)
            .padding(.vertical, Spacing.s800)
        }
    }
}

#Preview("Auth — Launch (no action)") {
    AuthScaffold(
        title: "Welcome",
        subtitle: "Your library, ready offline.",
        accent: LGColor.accentBlue
    ) {
        Image(systemName: "square.stack.3d.up.fill")
            .font(.system(size: 56))
            .foregroundStyle(LGColor.accentBlue)
    }
    .preferredColorScheme(.dark)
}

#Preview("Auth — Login (with action)") {
    AuthScaffold(
        title: "Sign In",
        subtitle: "Continue to your account.",
        accent: LGColor.accentPink
    ) {
        Image(systemName: "square.stack.3d.up.fill")
            .font(.system(size: 56))
            .foregroundStyle(LGColor.accentPink)
    } primaryAction: {
        Button {} label: {
            Text("Continue")
                .font(.system(size: 16, weight: .semibold))
                .frame(maxWidth: .infinity)
                .frame(minHeight: 44)
        }
        .buttonStyle(.borderedProminent)
        .tint(LGColor.accentPink)
    } footer: {
        Text("By continuing you agree to the Terms.")
            .font(.system(size: 12))
            .foregroundStyle(LGColor.textSubtle)
            .multilineTextAlignment(.center)
    }
    .preferredColorScheme(.dark)
}
