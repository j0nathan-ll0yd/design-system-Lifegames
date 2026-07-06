import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

// MARK: - Size + State

/// Semantic size hint for the bento tile. The parent layout controls the actual frame;
/// this enum carries intent so future layout helpers can derive sizes automatically.
public enum BentoTileSize {
    case small
    case wide
    case hero
    case full
}

/// Rendering state of the tile's content slot.
public enum BentoTileState {
    case normal
    case loading
    case empty
}

// MARK: - BentoTileView

/// Generic bento-grid tile shell.
///
/// Renders a `.neonCard(accent:)` container with:
/// - A header row: uppercase title in the accent color, a pulsing live dot, and a trailing chevron.
/// - A content slot: real content when `.normal`; a shimmer skeleton when `.loading`; a
///   muted "—" placeholder when `.empty`.
///
/// Accessibility: the tile is a combined element with a label (the title) and a hint
/// ("Opens <title>"), making it browsable as a single VoiceOver item.
///
/// Usage:
/// ```swift
/// BentoTileView(title: "Health", accent: LGColor.accentPink, size: .hero) {
///     HealthRingView(...)
/// }
/// ```
public struct BentoTileView<Content: View>: View {
    public let title: String
    public let systemImage: String?
    public let accent: Color
    public let size: BentoTileSize
    public let state: BentoTileState
    public let badgeText: String?
    public let badgeColor: Color?
    private let content: () -> Content

    public init(
        title: String,
        systemImage: String? = nil,
        accent: Color,
        size: BentoTileSize = .small,
        state: BentoTileState = .normal,
        badgeText: String? = nil,
        badgeColor: Color? = nil,
        @ViewBuilder content: @escaping () -> Content
    ) {
        self.title = title
        self.systemImage = systemImage
        self.accent = accent
        self.size = size
        self.state = state
        self.badgeText = badgeText
        self.badgeColor = badgeColor
        self.content = content
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: Spacing.s300) {
            headerRow
            contentSlot
        }
        .neonCard(accent: accent)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(title)
        .accessibilityHint("Opens \(title)")
    }

    // MARK: - Header row

    private var headerRow: some View {
        HStack(spacing: Spacing.s150) {
            if let systemImage {
                Image(systemName: systemImage)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(accent)
            }
            Text(title.uppercased())
                .font(.system(size: 10, weight: .semibold))
                .kerning(2)
                .foregroundStyle(accent)
            Spacer()
            if let badgeText {
                Text(badgeText)
                    .font(.system(size: 10, weight: .bold))
                    .kerning(0.5)
                    .foregroundStyle(badgeColor ?? accent)
                    .padding(.horizontal, Spacing.s250)
                    .padding(.vertical, Spacing.s100)
                    .background((badgeColor ?? accent).opacity(0.12), in: Capsule())
                    .overlay(Capsule().stroke((badgeColor ?? accent).opacity(0.4), lineWidth: 1))
            }
            LiveDotView(color: accent)
            Image(systemName: "chevron.right")
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(LGColor.textMuted.opacity(0.35))
        }
    }

    // MARK: - Content slot

    @ViewBuilder
    private var contentSlot: some View {
        switch state {
        case .normal:
            content()
        case .loading:
            skeletonContent
        case .empty:
            emptyContent
        }
    }

    private var skeletonContent: some View {
        VStack(alignment: .leading, spacing: Spacing.s250) {
            RoundedRectangle(cornerRadius: 4)
                .fill(LGColor.textMuted.opacity(0.12))
                .frame(maxWidth: .infinity)
                .frame(height: 14)
            RoundedRectangle(cornerRadius: 4)
                .fill(LGColor.textMuted.opacity(0.08))
                .frame(maxWidth: 120)
                .frame(height: 10)
            RoundedRectangle(cornerRadius: 4)
                .fill(LGColor.textMuted.opacity(0.06))
                .frame(maxWidth: 80)
                .frame(height: 10)
        }
        .redacted(reason: .placeholder)
    }

    private var emptyContent: some View {
        HStack {
            Spacer()
            Text("—")
                .font(.system(size: 24, weight: .light))
                .foregroundStyle(LGColor.textMuted.opacity(0.3))
            Spacer()
        }
        .frame(minHeight: 40)
    }
}

// MARK: - Previews

#if os(iOS)
    #Preview("BentoTile — Normal") {
        VStack(spacing: 12) {
            BentoTileView(title: "Health", accent: LGColor.accentPink, size: .hero) {
                Text("Content goes here")
                    .foregroundStyle(LGColor.textMuted)
                    .font(.system(size: 12))
            }
            HStack(spacing: 12) {
                BentoTileView(title: "Location", accent: LGColor.accentBlue, size: .wide) {
                    Text("Map")
                        .foregroundStyle(LGColor.textMuted)
                        .font(.system(size: 12))
                }
                BentoTileView(title: "Books", accent: LGColor.accentAmber, size: .small) {
                    Text("Cover")
                        .foregroundStyle(LGColor.textMuted)
                        .font(.system(size: 12))
                }
            }
        }
        .padding()
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
    }

    #Preview("BentoTile — Loading") {
        BentoTileView(title: "Health", accent: LGColor.accentPink, state: .loading) {
            EmptyView()
        }
        .padding()
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
    }

    #Preview("BentoTile — Empty") {
        BentoTileView(title: "Books", accent: LGColor.accentAmber, state: .empty) {
            EmptyView()
        }
        .padding()
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
    }
#endif
