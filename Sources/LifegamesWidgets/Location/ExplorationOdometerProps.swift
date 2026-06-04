import Foundation

public struct ExplorationOdometerProps: Hashable, Codable, Sendable {
    public let totalVisits: Int
    public let totalPlaces: Int
    public let citiesVisited: Int
    public let totalStates: Int
    public let currentCity: String?

    public init(
        totalVisits: Int,
        totalPlaces: Int,
        citiesVisited: Int,
        totalStates: Int,
        currentCity: String?
    ) {
        self.totalVisits = totalVisits
        self.totalPlaces = totalPlaces
        self.citiesVisited = citiesVisited
        self.totalStates = totalStates
        self.currentCity = currentCity
    }
}
