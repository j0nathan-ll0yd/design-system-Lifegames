import LifegamesTokens
import SwiftUI

/// **Status:** Experimental
///
/// Brand-agnostic call-to-action button — the design system's canonical button
/// primitive. The title is a host-owned `LocalizedStringKey`; the `accent`
/// (default `LGColor.accentDefault`) drives the fill / outline / text tint, and
/// every color resolves to a semantic token (no raw hex). Four variants cover
/// the standard CTA hierarchy and two shapes cover the standard radii; a
/// destructive variant pins itself to `LGColor.accentRed` regardless of the
/// injected `accent`.
///
/// Guarantees a ≥44pt touch target (S70) and a full-bounds `.contentShape`.
/// This is NOT for HIG-locked system controls (e.g. Sign in with Apple) — those
/// stay host-styled.
public struct LGButton: View {
    /// The CTA hierarchy: filled primary, outlined secondary, text-only ghost,
    /// and a destructive variant tied to the destructive token.
    public enum Variant {
        case primary
        case secondary
        case ghost
        case destructive
    }

    /// The corner treatment: a tokenized rounded rectangle or a full pill.
    public enum Shape {
        case `default`
        case pill
    }

    public let title: LocalizedStringKey
    public var variant: Variant
    public var shape: Shape
    public var accent: Color
    public let action: () -> Void

    public init(
        _ title: LocalizedStringKey,
        variant: Variant = .primary,
        shape: Shape = .default,
        accent: Color = LGColor.accentDefault,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.variant = variant
        self.shape = shape
        self.accent = accent
        self.action = action
    }

    /// The variant's effective tint — destructive overrides the injected accent
    /// with the semantic destructive token.
    private var tint: Color {
        variant == .destructive ? LGColor.accentRed : accent
    }

    private var foreground: Color {
        switch variant {
        case .primary:
            return LGColor.surfaceBase
        case .secondary, .ghost, .destructive:
            return tint
        }
    }

    @ViewBuilder
    private var background: some View {
        switch variant {
        case .primary:
            shapeView.fill(tint)
        case .secondary:
            shapeView.stroke(tint, lineWidth: 1.5)
        case .ghost:
            shapeView.fill(.clear)
        case .destructive:
            shapeView.fill(tint.opacity(0.08))
                .overlay(shapeView.stroke(tint.opacity(0.5), lineWidth: 1))
        }
    }

    public var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(foreground)
                .frame(maxWidth: .infinity)
                .frame(minHeight: 44)
                .padding(.horizontal, Spacing.s400)
                .background(background)
                .clipShape(shapeView)
                .contentShape(.rect)
        }
        .buttonStyle(.plain)
    }

    private var shapeView: AnyShape {
        switch shape {
        case .default:
            return AnyShape(RoundedRectangle(cornerRadius: 14))
        case .pill:
            return AnyShape(Capsule())
        }
    }
}

#if os(iOS)
    #Preview("LGButton — variants & shapes") {
        ScrollView {
            VStack(spacing: Spacing.s400) {
                LGButton("Primary", variant: .primary, accent: LGColor.accentBlue) {}
                LGButton("Secondary", variant: .secondary, accent: LGColor.accentBlue) {}
                LGButton("Ghost", variant: .ghost, accent: LGColor.accentBlue) {}
                LGButton("Destructive", variant: .destructive) {}

                LGButton("Primary Pill", variant: .primary, shape: .pill, accent: LGColor.accentPink) {}
                LGButton("Secondary Pill", variant: .secondary, shape: .pill, accent: LGColor.accentPink) {}
                LGButton("Ghost Pill", variant: .ghost, shape: .pill, accent: LGColor.accentCyan) {}
                LGButton("Destructive Pill", variant: .destructive, shape: .pill) {}
            }
            .padding(Spacing.s400)
        }
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
    }
#endif
