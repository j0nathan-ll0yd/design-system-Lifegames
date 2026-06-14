import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

/// **Status:** Experimental
///
/// Brand-agnostic auth shell. Launch and Login collapse into one branded
/// surface: a centered branding slot (wordmark / backdrop), an optional
/// title/subtitle, an optional primary action (e.g. Sign in with Apple — the
/// host owns its style), and an optional footer (legal / alternate actions).
///
/// Pure Launch = omit `primaryAction` (defaults to `EmptyView`).
/// Login = fill it. `title` is OPTIONAL: a host whose `branding` slot already
/// carries a self-contained wordmark (custom font / gradient) passes `nil` so
/// the scaffold does not render a second, redundant headline in its own
/// system-font style. All static text is host-owned `LocalizedStringKey`; the
/// `accent` (default `LGColor.accentDefault`) tints the default ambient glow.
///
/// `background` is an OPTIONAL slot: by default the scaffold renders its own
/// neutral surface (`LGColor.surfaceBase` + an `accent`-tinted radial glow). A
/// host with a richer backdrop (layered washes, gradients) supplies its own
/// full-bleed background here; it sits behind the content and ignores safe
/// areas. The slot stays brand-agnostic — the host owns whatever it injects.
public struct AuthScaffold<Branding: View, PrimaryAction: View, Footer: View, Background: View>: View {
    public let title: LocalizedStringKey?
    public let subtitle: LocalizedStringKey?
    public var accent: Color
    public let branding: Branding
    public let primaryAction: PrimaryAction
    public let footer: Footer
    public let background: Background

    public init(
        title: LocalizedStringKey? = nil,
        subtitle: LocalizedStringKey? = nil,
        accent: Color = LGColor.accentDefault,
        @ViewBuilder branding: () -> Branding,
        @ViewBuilder primaryAction: () -> PrimaryAction = { EmptyView() },
        @ViewBuilder footer: () -> Footer = { EmptyView() },
        @ViewBuilder background: () -> Background
    ) {
        self.title = title
        self.subtitle = subtitle
        self.accent = accent
        self.branding = branding()
        self.primaryAction = primaryAction()
        self.footer = footer()
        self.background = background()
    }

    public var body: some View {
        ZStack {
            background
                .ignoresSafeArea()

            VStack(spacing: Spacing.s600) {
                Spacer()

                branding

                if title != nil || subtitle != nil {
                    VStack(spacing: Spacing.s200) {
                        if let title {
                            Text(title)
                                .font(.system(size: 28, weight: .bold, design: .rounded))
                                .foregroundStyle(LGColor.textTitle)
                                .multilineTextAlignment(.center)
                        }

                        if let subtitle {
                            Text(subtitle)
                                .font(.system(size: 15))
                                .foregroundStyle(LGColor.textMuted)
                                .multilineTextAlignment(.center)
                        }
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

/// The scaffold's default auth backdrop: a neutral surface under an
/// `accent`-tinted radial glow. Used when a host does not supply its own
/// `background` slot.
public struct AuthScaffoldDefaultBackground: View {
    public var accent: Color

    public init(accent: Color = LGColor.accentDefault) {
        self.accent = accent
    }

    public var body: some View {
        ZStack {
            LGColor.surfaceBase
            RadialGradient(
                colors: [accent.opacity(0.10), .clear],
                center: .top,
                startRadius: 0,
                endRadius: 500
            )
        }
    }
}

public extension AuthScaffold where Background == AuthScaffoldDefaultBackground {
    /// Convenience initializer: omit the `background` slot to use the scaffold's
    /// own neutral surface + `accent`-tinted glow.
    init(
        title: LocalizedStringKey? = nil,
        subtitle: LocalizedStringKey? = nil,
        accent: Color = LGColor.accentDefault,
        @ViewBuilder branding: () -> Branding,
        @ViewBuilder primaryAction: () -> PrimaryAction = { EmptyView() },
        @ViewBuilder footer: () -> Footer = { EmptyView() }
    ) {
        self.init(
            title: title,
            subtitle: subtitle,
            accent: accent,
            branding: branding,
            primaryAction: primaryAction,
            footer: footer,
            background: { AuthScaffoldDefaultBackground(accent: accent) }
        )
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
