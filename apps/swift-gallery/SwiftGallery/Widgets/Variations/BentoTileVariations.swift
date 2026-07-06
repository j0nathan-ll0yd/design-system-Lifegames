import LifegamesComponents
import LifegamesTokens
import SwiftUI

// MARK: - BentoTileVariations

/// Gallery entries for `BentoTileView` and the composed bento tile family.
enum BentoTileVariations {
    static var entry: WidgetEntry {
        WidgetEntry(
            id: "bento-tile",
            title: "Bento Tile",
            category: .other,
            states: [
                VariationState(id: "health", label: "Health (hero)") { @MainActor in
                    AnyView(healthVariation)
                },
                VariationState(id: "location", label: "Location") { @MainActor in
                    AnyView(locationVariation)
                },
                VariationState(id: "books", label: "Books") { @MainActor in
                    AnyView(booksVariation)
                },
                VariationState(id: "coffee", label: "Coffee") { @MainActor in
                    AnyView(coffeeVariation)
                },
                VariationState(id: "settings", label: "Settings") { @MainActor in
                    AnyView(settingsVariation)
                },
                VariationState(id: "skeleton", label: "Skeleton") { @MainActor in
                    AnyView(skeletonVariation)
                },
                VariationState(id: "empty", label: "Empty") { @MainActor in
                    AnyView(emptyVariation)
                },
            ]
        )
    }

    // MARK: - Individual variations

    private static let data = DatastreamHomeData.sample

    @MainActor private static var healthVariation: some View {
        BentoTileView(title: "Health", accent: LGColor.accentPink, size: .hero) {
            VStack(spacing: Spacing.s400) {
                HStack(spacing: Spacing.s400) {
                    HealthRingView(
                        progress: data.moveProgress,
                        color: LGColor.accentPink,
                        label: "Move",
                        value: data.moveValue,
                        size: 64
                    )
                    HealthRingView(
                        progress: min(data.exerciseProgress, 1.0),
                        color: LGColor.accentGreen,
                        label: "Exercise",
                        value: data.exerciseValue,
                        size: 64
                    )
                    HealthRingView(
                        progress: data.standProgress,
                        color: LGColor.accentBlue,
                        label: "Stand",
                        value: data.standValue,
                        size: 64
                    )
                }
                .frame(maxWidth: .infinity)

                HStack {
                    Text("\(data.steps)")
                        .font(.system(size: 24, weight: .bold, design: .rounded))
                        .foregroundStyle(LGColor.textTitle)
                    Text("steps")
                        .font(.system(size: 13))
                        .foregroundStyle(LGColor.textMuted)
                    Spacer()
                    Text("\(data.restingHR) bpm resting")
                        .font(.system(size: 12))
                        .foregroundStyle(LGColor.textMuted)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(LGColor.surfaceBase)
    }

    @MainActor private static var locationVariation: some View {
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
        .padding()
        .background(LGColor.surfaceBase)
    }

    @MainActor private static var booksVariation: some View {
        BentoTileView(title: "Books", accent: LGColor.accentAmber, size: .small) {
            BookCoverTile(coverURL: data.bookCoverURL, progress: data.bookProgress)
                .frame(maxWidth: .infinity)
                .frame(height: 160)
        }
        .frame(width: 180)
        .padding()
        .background(LGColor.surfaceBase)
    }

    @MainActor private static var coffeeVariation: some View {
        BentoTileView(title: "Coffee", accent: LGColor.accentOrange, size: .wide) {
            HStack(alignment: .center, spacing: Spacing.s500) {
                VStack(spacing: Spacing.s200) {
                    CoffeeMugView(
                        fillPercent: Double(data.caffeineMg) / Double(data.caffeineTarget),
                        beverage: .espresso
                    )
                    Text("\(data.caffeineMg) mg")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(LGColor.accentOrange)
                }
                VStack(alignment: .leading, spacing: Spacing.s150) {
                    Text("/ \(data.caffeineTarget) mg")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(LGColor.textMuted)
                    Text("\(data.cups) cups today")
                        .font(.system(size: 12))
                        .foregroundStyle(LGColor.textTitle)
                    Text("\(data.lastBeverage) · 2h ago")
                        .font(.system(size: 11))
                        .foregroundStyle(LGColor.textMuted)
                }
                Spacer()
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(LGColor.surfaceBase)
    }

    @MainActor private static var settingsVariation: some View {
        BentoTileView(title: "Settings", accent: LGColor.accentIndigo, size: .full) {
            HStack {
                Text("Account, data, diagnostics")
                    .font(.system(size: 13))
                    .foregroundStyle(LGColor.textMuted)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(LGColor.accentIndigo.opacity(0.6))
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(LGColor.surfaceBase)
    }

    @MainActor private static var skeletonVariation: some View {
        BentoTileView(title: "Health", accent: LGColor.accentPink, state: .loading) {
            EmptyView()
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(LGColor.surfaceBase)
    }

    @MainActor private static var emptyVariation: some View {
        BentoTileView(title: "Books", accent: LGColor.accentAmber, state: .empty) {
            EmptyView()
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(LGColor.surfaceBase)
    }
}
