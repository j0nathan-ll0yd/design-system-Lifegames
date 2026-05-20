import Foundation

public struct LocationProps: Hashable, Codable, Sendable {
    public let totalVisits: Int
    public let totalPlaces: Int
    public let totalDurationHours: Double
    public let citiesVisited: Int
    public let currentCity: String?
    public let last90Days: [DayEntry]
    public let topPlaces: [Place]
    public let cityBreakdown: [CityEntry]
    public let categoryBreakdown: [CategoryEntry]
    public let streaks: Streaks
    public let explorationStats: ExplorationStats

    public struct DayEntry: Hashable, Codable, Sendable {
        public let date: String
        public let count: Int
        public let uniquePlaces: Int
        public let totalDurationMinutes: Int
    }

    public struct Place: Hashable, Codable, Sendable {
        public let name: String
        public let category: String?
        public let visitCount: Int
        public let totalDurationMinutes: Int
        public let lastVisitAt: String?
    }

    public struct CityEntry: Hashable, Codable, Sendable {
        public let city: String
        public let visitCount: Int
    }

    public struct CategoryEntry: Hashable, Codable, Sendable {
        public let category: String
        public let visitCount: Int
        public let totalMinutes: Int
    }

    public struct Streaks: Hashable, Codable, Sendable {
        public let currentStreak: Int
        public let longestStreak: Int
        public let totalActiveDays: Int
    }

    public struct ExplorationStats: Hashable, Codable, Sendable {
        public let totalNeighborhoods: Int
        public let totalCities: Int
        public let totalStates: Int
    }
}
