import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

/// **Status:** Experimental
///
/// Brand-agnostic detail / show template — the canonical pair to `ListTemplate`
/// (list picks an item; detail shows it). The design system owns the vertical
/// detail LAYOUT (a scrolling stack of hero → metadata → description → actions
/// over a tokenized surface); the host fills each slot with its own content.
///
/// All four content zones are `@ViewBuilder` slots, so the template carries no
/// typed title / image / stat fields — that would presume a domain (a video, a
/// product, a profile) and break slot purity. The host supplies whatever each
/// zone needs:
///
/// - `hero` — the media / image zone (a thumbnail, artwork, map, or banner).
/// - `metadata` — a compact stat / fact row (e.g. `MetricContentView` cards).
/// - `description` — an "about" / long-copy block.
/// - `actions` — the primary + secondary action row (e.g. `LGButton`s).
///
/// `metadata`, `description`, and `actions` default to `EmptyView`, so a sparse
/// detail (hero only) is valid. The `accent` (default `LGColor.accentDefault`)
/// is reserved for host theming and is not consumed by the bare layout — slots
/// own their own coloring. All colors resolve to semantic tokens.
///
/// Nav chrome (`NavigationStack`, title, toolbar) is HOST-owned; this template
/// renders the scrolling content column only.
public struct DetailTemplate<Hero: View, Metadata: View, Description: View, Actions: View>: View {
    public var accent: Color
    public let hero: Hero
    public let metadata: Metadata
    public let description: Description
    public let actions: Actions

    public init(
        accent: Color = LGColor.accentDefault,
        @ViewBuilder hero: () -> Hero,
        @ViewBuilder metadata: () -> Metadata = { EmptyView() },
        @ViewBuilder description: () -> Description = { EmptyView() },
        @ViewBuilder actions: () -> Actions = { EmptyView() }
    ) {
        self.accent = accent
        self.hero = hero()
        self.metadata = metadata()
        self.description = description()
        self.actions = actions()
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.s400) {
                hero
                metadata
                description

                Spacer(minLength: Spacing.s200)

                actions
            }
            .padding(Spacing.s400)
        }
        .background(LGColor.surfaceBase)
    }
}

// Preview fills the slots with neutral local mock content (no cross-module
// molecules / no domain types) so the template's own preview stays
// self-contained; the swift-gallery "Templates" section demonstrates real fills.
#if os(iOS)
    #Preview("Detail Template") {
        DetailTemplate(accent: LGColor.accentBlue) {
            RoundedRectangle(cornerRadius: 20)
                .fill(LGColor.surfaceRaised)
                .frame(height: 200)
                .overlay(
                    Image(systemName: "photo")
                        .font(.system(size: 48))
                        .foregroundStyle(LGColor.accentBlue.opacity(0.7))
                )
        } metadata: {
            VStack(alignment: .leading, spacing: Spacing.s200) {
                Text("Mock Title")
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundStyle(LGColor.textTitle)

                HStack(spacing: Spacing.s300) {
                    MetricContentView(label: "Views", value: "12K", systemImage: "eye.fill", accent: LGColor.accentBlue)
                        .neonCard(accent: LGColor.accentBlue)
                    MetricContentView(label: "Length", value: "8:42", systemImage: "timer", accent: LGColor.accentCyan)
                        .neonCard(accent: LGColor.accentCyan)
                }
            }
        } description: {
            VStack(alignment: .leading, spacing: Spacing.s200) {
                Text("ABOUT")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(LGColor.textMuted)
                Text("A neutral mock description block standing in for host-supplied long copy in the detail template's description slot.")
                    .font(.system(size: 14))
                    .foregroundStyle(LGColor.textPrimary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        } actions: {
            VStack(spacing: Spacing.s300) {
                LGButton("Primary Action", variant: .primary, accent: LGColor.accentBlue) {}
                LGButton("Secondary Action", variant: .secondary, accent: LGColor.accentBlue) {}
            }
        }
        .preferredColorScheme(.dark)
    }
#endif
