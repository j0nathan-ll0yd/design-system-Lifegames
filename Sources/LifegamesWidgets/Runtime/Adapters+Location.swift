import Foundation

public extension Adapters {
    // MARK: - ExplorationOdometer

    /// Extracts the fields `ExplorationOdometerView.init` expects from the wire-format
    /// `location/exploration-odometer-v3*.json` envelope.
    /// Returns nil only if `data` is not a JSON object.
    static func explorationOdometer(fromFixture data: Data) -> ExplorationOdometerProps? {
        guard
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return nil }
        let explorationStats = json["explorationStats"] as? [String: Any] ?? [:]
        return ExplorationOdometerProps(
            totalVisits: (json["totalVisits"] as? Int) ?? 0,
            totalPlaces: (json["totalPlaces"] as? Int) ?? 0,
            citiesVisited: (json["citiesVisited"] as? Int) ?? 0,
            totalStates: (explorationStats["totalStates"] as? Int) ?? 0,
            currentCity: json["currentCity"] as? String
        )
    }

    // MARK: - PlaceLeaderboard

    /// Extracts `places` from the wire-format `location/place-leaderboard-v3*.json` envelope.
    /// Returns nil only if `data` is not a JSON object.
    static func placeLeaderboard(fromFixture data: Data) -> [LocationProps.Place]? {
        guard
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return nil }
        let raw = json["topPlaces"] as? [[String: Any]] ?? []
        return raw.map { p in
            LocationProps.Place(
                name: (p["name"] as? String) ?? "",
                category: p["category"] as? String,
                visitCount: (p["visitCount"] as? Int) ?? 0,
                totalDurationMinutes: (p["totalDurationMinutes"] as? Int) ?? 0,
                lastVisitAt: p["lastVisitAt"] as? String
            )
        }
    }
}
