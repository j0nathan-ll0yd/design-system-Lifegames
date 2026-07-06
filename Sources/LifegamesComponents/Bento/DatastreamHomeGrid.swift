import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

// MARK: - DatastreamTile

/// Identifies which grid tile a `DatastreamHomeGrid` selection came from.
public enum DatastreamTile: Hashable, Sendable {
    case health
    case location
    case books
    case coffee
    case settings
}

// MARK: - DatastreamHomeGrid

/// Direction-1 bento layout for the Datastream home screen.
///
/// Composes the five bento tiles from `DatastreamHomeData`:
/// 1. **Health** hero (full-width) — three activity rings + steps + resting HR.
/// 2. **Location** (wide) + **Books** (small) — paired row.
/// 3. **Coffee** (full-width) — mug + caffeine stats.
/// 4. **Settings** (full-width) — nav affordance.
///
/// The grid fills its width and scrolls vertically. Callers typically embed it in a
/// `NavigationView` or full-screen container; the grid itself adds no navigation chrome.
///
/// Pass `onSelect` to make each tile a tappable button (one VoiceOver element with the
/// button trait per tile). With the default `nil`, tiles render display-only — gallery
/// and preview embeddings are unaffected.
public struct DatastreamHomeGrid: View {
    public let data: DatastreamHomeData
    public let onSelect: ((DatastreamTile) -> Void)?

    public init(data: DatastreamHomeData = .sample, onSelect: ((DatastreamTile) -> Void)? = nil) {
        self.data = data
        self.onSelect = onSelect
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.s300) {
                gridHeader
                healthTile
                locationBookRow
                coffeeTile
                settingsTile
            }
            .padding(.horizontal, Spacing.s400)
            .padding(.vertical, Spacing.s400)
        }
        .background(LGColor.surfaceBase)
    }

    // MARK: - Top header

    private var gridHeader: some View {
        VStack(alignment: .leading, spacing: Spacing.s150) {
            Text("Your datastream")
                .font(.system(size: 26, weight: .bold, design: .default))
                .foregroundStyle(LGColor.textTitle)

            HStack(spacing: Spacing.s150) {
                LiveDotView(color: LGColor.accentGreen)
                Text("\(data.dateLabel) · Updated just now")
                    .font(.system(size: 13))
                    .foregroundStyle(LGColor.textMuted)
            }
        }
        .padding(.bottom, Spacing.s100)
    }

    // MARK: - Selection wrapper

    /// Wraps a tile in a plain-style `Button` when `onSelect` is set (the tile stays one
    /// VoiceOver element, gaining the button trait); renders it unchanged when `nil`.
    @ViewBuilder
    private func selectable(_ tile: DatastreamTile, @ViewBuilder content: () -> some View) -> some View {
        if let onSelect {
            Button {
                onSelect(tile)
            } label: {
                content()
            }
            .buttonStyle(.plain)
        } else {
            content()
        }
    }

    // MARK: - Tiles

    /// Full-width Health hero tile — rings + steps + resting HR, with a MOVE badge and a
    /// three-column movement metrics row (Move / Exercise / Stand), matching the web design.
    private var healthTile: some View {
        selectable(.health) {
            healthTileContent
        }
    }

    private var healthTileContent: some View {
        BentoTileView(
            title: "Health",
            accent: LGColor.accentPink,
            size: .hero,
            badgeText: "\(Int((data.moveProgress * 100).rounded()))% MOVE",
            badgeColor: LGColor.accentGreen
        ) {
            HStack(alignment: .center, spacing: Spacing.s500) {
                ActivityRingsView(
                    move: data.moveProgress,
                    exercise: data.exerciseProgress,
                    stand: data.standProgress,
                    size: 128
                )

                // Right column: big steps → one-line subtitle → divider → metrics
                VStack(alignment: .leading, spacing: Spacing.s300) {
                    Text(data.steps.formatted())
                        .font(.system(size: 46, weight: .bold, design: .rounded))
                        .foregroundStyle(LGColor.textTitle)

                    // "steps · 58 bpm resting" — one muted line
                    HStack(spacing: 5) {
                        Text("steps ·")
                            .foregroundStyle(LGColor.textMuted)
                        Text("\(data.restingHR) bpm")
                            .foregroundStyle(LGColor.accentPink)
                        Text("resting")
                            .foregroundStyle(LGColor.textMuted)
                    }
                    .font(.system(size: 14))

                    Rectangle()
                        .fill(Color.white.opacity(0.07))
                        .frame(height: 1)

                    HStack(spacing: 0) {
                        metricColumn(value: data.moveValue, unit: "KCAL", ring: "MOVE", color: LGColor.accentPink)
                        metricDivider
                        metricColumn(value: data.exerciseValue, unit: "MIN", ring: "EXERCISE", color: LGColor.accentGreen)
                        metricDivider
                        metricColumn(value: data.standValue, unit: "H", ring: "STAND", color: LGColor.accentBlue)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .frame(maxWidth: .infinity)
    }

    /// A single movement metric column: colored value + two-line uppercase label.
    private func metricColumn(value: String, unit: String, ring: String, color: Color) -> some View {
        VStack(spacing: 3) {
            Text(value)
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(color)
            Text("\(unit)\n\(ring)")
                .font(.system(size: 8.5, weight: .semibold))
                .kerning(0.5)
                .multilineTextAlignment(.center)
                .lineSpacing(1)
                .foregroundStyle(LGColor.textMuted)
        }
        .frame(maxWidth: .infinity)
    }

    private var metricDivider: some View {
        Rectangle()
            .fill(Color.white.opacity(0.07))
            .frame(width: 1, height: 30)
    }

    /// Paired row: Location (wide) + Books (small).
    private var locationBookRow: some View {
        HStack(alignment: .top, spacing: Spacing.s300) {
            selectable(.location) {
                BentoTileView(title: "Location", accent: LGColor.accentBlue, size: .wide) {
                    LocationMapTile(
                        latitude: data.latitude,
                        longitude: data.longitude,
                        placeName: data.placeName,
                        subtitle: data.placeSubtitle,
                        statusText: data.locationStatus
                    )
                    .frame(maxWidth: .infinity)
                    .frame(height: 160)
                }
                .frame(maxWidth: .infinity)
            }

            selectable(.books) {
                BentoTileView(title: "Books", accent: LGColor.accentAmber, size: .small) {
                    BookCoverTile(
                        coverURL: data.bookCoverURL,
                        progress: data.bookProgress
                    )
                    .frame(maxWidth: .infinity)
                    .frame(height: 160)
                }
                .frame(width: 130)
            }
        }
    }

    /// Full-width Coffee / Caffeine tile — mug + divider + stats, matching HTML layout.
    private var coffeeTile: some View {
        selectable(.coffee) {
            coffeeTileContent
        }
    }

    private var coffeeTileContent: some View {
        BentoTileView(title: "Caffeine", accent: LGColor.accentOrange, size: .wide) {
            HStack(alignment: .center, spacing: Spacing.s350) {
                // Left: mug scaled to 50×47 + mg label
                VStack(spacing: 3) {
                    CoffeeMugView(
                        fillPercent: Double(data.caffeineMg) / Double(max(data.caffeineTarget, 1)),
                        beverage: .espresso,
                        animated: true,
                        showHandle: false
                    )
                    .scaleEffect(0.38)
                    .frame(width: 50, height: 47)
                    .clipped()

                    Text("\(data.caffeineMg) mg")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(LGColor.textTitle)
                }

                // Vertical divider
                Rectangle()
                    .fill(Color.white.opacity(0.07))
                    .frame(width: 1, height: 50)

                // Right: target / cups / last beverage
                VStack(alignment: .leading, spacing: 5) {
                    Text("/ \(data.caffeineTarget) mg daily target")
                        .font(.system(size: 10))
                        .foregroundStyle(LGColor.textSubtle)
                    Text("\(data.cups) cups today")
                        .font(.system(size: 9.5))
                        .foregroundStyle(LGColor.textMuted)
                    Text("\(data.lastBeverage) · 2h ago")
                        .font(.system(size: 9.5))
                        .foregroundStyle(LGColor.textSubtle)
                        .opacity(0.7)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .frame(maxWidth: .infinity)
    }

    /// Full-width Settings nav tile — gear icon + title + subtitle in one compact row.
    private var settingsTile: some View {
        selectable(.settings) {
            BentoTileView(
                title: "Settings",
                systemImage: "gearshape.fill",
                accent: LGColor.accentIndigo,
                size: .full
            ) {
                Text("Account, data, diagnostics")
                    .font(.system(size: 12))
                    .foregroundStyle(LGColor.textMuted)
            }
            .frame(maxWidth: .infinity)
        }
    }
}

// MARK: - Previews

#if os(iOS)
    #Preview("Datastream Home Grid") {
        DatastreamHomeGrid(data: .sample)
            .preferredColorScheme(.dark)
    }

    #Preview("Datastream Home Grid — Selectable") {
        DatastreamHomeGrid(data: .sample, onSelect: { _ in })
            .preferredColorScheme(.dark)
    }
#endif
