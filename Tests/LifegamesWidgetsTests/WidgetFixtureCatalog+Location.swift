import Foundation
@testable import LifegamesWidgets

extension WidgetFixtureCatalogTests {
    static var locationRows: [FixtureCatalogRow] {
        [
            // ExplorationOdometer — wire-shape fixtures, adapter-required
            explorationOdometerRow("exploration-odometer-v3"),
            explorationOdometerRow("exploration-odometer-v3.populated-min"),
            explorationOdometerRow("exploration-odometer-v3.populated-max"),
            explorationOdometerRow("exploration-odometer-v3.homebody"),
            explorationOdometerRow("exploration-odometer-v3.new-city-week"),
            explorationOdometerRow("exploration-odometer-v3.passport-week"),
            explorationOdometerRow("exploration-odometer-v3.roadtripper"),
            explorationOdometerRow("exploration-odometer-v3.weekend-warrior"),
            explorationOdometerRow("exploration-odometer-v3.skeleton"),
            explorationOdometerRow("exploration-odometer-v3.empty"),

            // PlaceLeaderboard — wire-shape fixtures, adapter-required
            placeLeaderboardRow("place-leaderboard-v3"),
            placeLeaderboardRow("place-leaderboard-v3.populated-min"),
            placeLeaderboardRow("place-leaderboard-v3.populated-max"),
            placeLeaderboardRow("place-leaderboard-v3.cafe-loyal"),
            placeLeaderboardRow("place-leaderboard-v3.even-spread"),
            placeLeaderboardRow("place-leaderboard-v3.gym-loyal"),
            placeLeaderboardRow("place-leaderboard-v3.gym-vs-cafe"),
            placeLeaderboardRow("place-leaderboard-v3.tourist-week"),
            placeLeaderboardRow("place-leaderboard-v3.skeleton"),
            placeLeaderboardRow("place-leaderboard-v3.empty"),

            // Data-only app-preview fixtures (S98) — direct Codable decode
            // against LocationFixtureModels wire types; no widget view exists.
            .row(VisitTimelineProps.self, category: "location", name: "visit-timeline.today"),
            .row(VisitTimelineProps.self, category: "location", name: "visit-timeline.week"),
            .row(VisitTimelineProps.self, category: "location", name: "visit-timeline.empty"),
            .row(SavedPlacesProps.self, category: "location", name: "saved-places"),
            .row(PlaceSearchResultsProps.self, category: "location", name: "place-search-results"),
        ]
    }

    private static func explorationOdometerRow(_ name: String) -> FixtureCatalogRow {
        .adapted(
            category: "location",
            name: name,
            propsTypeName: "ExplorationOdometerProps",
            adapt: { Adapters.explorationOdometer(fromFixture: $0) }
        )
    }

    private static func placeLeaderboardRow(_ name: String) -> FixtureCatalogRow {
        .adapted(
            category: "location",
            name: name,
            propsTypeName: "[LocationProps.Place]",
            adapt: { Adapters.placeLeaderboard(fromFixture: $0) }
        )
    }
}
