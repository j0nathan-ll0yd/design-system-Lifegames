import LifegamesTokens
import SwiftUI

public struct PortalCardModifier: ViewModifier {
    public func body(content: Content) -> some View {
        content
            .padding(Spacing.s800)
            .background(Color.colorSurfaceRaised)
            .clipShape(RoundedRectangle(cornerRadius: Spacing.s400))
            .overlay(
                RoundedRectangle(cornerRadius: Spacing.s400)
                    .stroke(Color.colorBorderDefault, lineWidth: 1)
            )
    }
}

public struct GlassMorphicModifier: ViewModifier {
    public func body(content: Content) -> some View {
        content
            .padding(Spacing.s800)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: Spacing.s400))
            .overlay(
                RoundedRectangle(cornerRadius: Spacing.s400)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
    }
}

public struct GradientBackgroundModifier: ViewModifier {
    public func body(content: Content) -> some View {
        content
            .background {
                ZStack {
                    Color.colorSurfaceBase
                    RadialGradient(
                        colors: [Color.colorAccentDefault.opacity(0.08), .clear],
                        center: UnitPoint(x: 0.2, y: 0.5),
                        startRadius: 0, endRadius: 400
                    )
                    RadialGradient(
                        colors: [Color.colorAccentPurple.opacity(0.06), .clear],
                        center: UnitPoint(x: 0.8, y: 0.2),
                        startRadius: 0, endRadius: 400
                    )
                    RadialGradient(
                        colors: [Color.colorAccentBlue.opacity(0.05), .clear],
                        center: UnitPoint(x: 0.5, y: 0.8),
                        startRadius: 0, endRadius: 400
                    )
                }
                .ignoresSafeArea()
            }
    }
}

public struct NeonCardModifier: ViewModifier {
    public let accent: Color

    public init(accent: Color) {
        self.accent = accent
    }

    public func body(content: Content) -> some View {
        content
            .padding(Spacing.s450)
            .background(Color.colorSurfaceRaised)
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(Color.colorBorderSubtle, lineWidth: 1)
            )
            .overlay(alignment: .top) {
                UnevenRoundedRectangle(
                    topLeadingRadius: 20, bottomLeadingRadius: 0,
                    bottomTrailingRadius: 0, topTrailingRadius: 20
                )
                .fill(accent)
                .frame(height: 2)
            }
            .shadow(color: accent.opacity(0.15), radius: 20, x: 0, y: 4)
    }
}

public struct GlassCardModifier: ViewModifier {
    public let tint: Color

    public init(tint: Color = .clear) {
        self.tint = tint
    }

    public func body(content: Content) -> some View {
        content
            .padding(24)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(Color.white.opacity(0.12), lineWidth: 1)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .fill(
                        RadialGradient(
                            colors: [tint.opacity(0.05), .clear],
                            center: .topLeading,
                            startRadius: 0, endRadius: 200
                        )
                    )
            )
    }
}

public struct MinimalSectionModifier: ViewModifier {
    public func body(content: Content) -> some View {
        content
            .padding(.vertical, 16)
            .overlay(alignment: .bottom) {
                Rectangle()
                    .fill(Color.white.opacity(0.05))
                    .frame(height: 0.5)
            }
    }
}

#if os(iOS)
    public struct DismissKeyboardOnTapModifier: ViewModifier {
        public func body(content: Content) -> some View {
            content
                .contentShape(Rectangle())
                .onTapGesture {
                    UIApplication.shared.sendAction(
                        #selector(UIResponder.resignFirstResponder),
                        to: nil, from: nil, for: nil
                    )
                }
        }
    }
#endif

public extension View {
    func dismissKeyboardOnTap() -> some View {
        #if os(iOS)
            modifier(DismissKeyboardOnTapModifier())
        #else
            self
        #endif
    }

    func portalCard() -> some View {
        modifier(PortalCardModifier())
    }

    func glassMorphic() -> some View {
        modifier(GlassMorphicModifier())
    }

    func gradientBackground() -> some View {
        modifier(GradientBackgroundModifier())
    }

    func neonCard(accent: Color) -> some View {
        modifier(NeonCardModifier(accent: accent))
    }

    func glassCard(tint: Color = .clear) -> some View {
        modifier(GlassCardModifier(tint: tint))
    }

    func minimalSection() -> some View {
        modifier(MinimalSectionModifier())
    }
}
