import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

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
public struct DatastreamHomeGrid: View {
    public let data: DatastreamHomeData

    public init(data: DatastreamHomeData = .sample) {
        self.data = data
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
        VStack(alignment: .leading, spacing: Spacing.s100) {
            Text("DATASTREAM")
                .font(.system(size: 22, weight: .bold, design: .default))
                .tracking(3)
                .foregroundStyle(LGColor.textTitle)

            HStack(spacing: Spacing.s150) {
                LiveDotView(color: LGColor.accentGreen)
                Text("Updated just now")
                    .font(.system(size: 12))
                    .foregroundStyle(LGColor.textMuted)
            }
        }
        .padding(.bottom, Spacing.s100)
    }

    // MARK: - Tiles

    /// Full-width Health hero tile — concentric activity rings + steps + resting HR.
    private var healthTile: some View {
        BentoTileView(title: "Health", accent: LGColor.accentPink, size: .hero) {
            HStack(spacing: Spacing.s400) {
                ActivityRingsView(
                    move: data.moveProgress,
                    exercise: data.exerciseProgress,
                    stand: data.standProgress,
                    size: 104
                )

                VStack(alignment: .leading) {
                    // Steps — big number at top
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text(data.steps.formatted())
                            .font(.system(size: 34, weight: .bold, design: .rounded))
                            .foregroundStyle(LGColor.textTitle)
                        Text("steps")
                            .font(.system(size: 13))
                            .foregroundStyle(LGColor.textMuted)
                    }

                    Spacer()

                    // Resting HR — trailing-aligned at bottom
                    HStack(alignment: .firstTextBaseline, spacing: 3) {
                        Text("\(data.restingHR)")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(LGColor.accentPink)
                        Text("bpm")
                            .font(.system(size: 13))
                            .foregroundStyle(LGColor.accentPink)
                        Text("resting")
                            .font(.system(size: 13))
                            .foregroundStyle(LGColor.textMuted)
                    }
                    .frame(maxWidth: .infinity, alignment: .trailing)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .frame(maxWidth: .infinity)
    }

    /// Paired row: Location (wide) + Books (small).
    private var locationBookRow: some View {
        HStack(alignment: .top, spacing: Spacing.s300) {
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

    /// Full-width Coffee / Caffeine tile — mug + divider + stats, matching HTML layout.
    private var coffeeTile: some View {
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

// MARK: - Previews

#if os(iOS)
    #Preview("Datastream Home Grid") {
        DatastreamHomeGrid(data: .sample)
            .preferredColorScheme(.dark)
    }
#endif
