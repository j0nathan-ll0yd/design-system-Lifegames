// AUTO-GENERATED — do not edit. Regenerate: pnpm -C packages/portal-contract codegen

// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To parse the JSON, add this file to your project and do:
//
//   let locationExport = try LocationExport(json)

import Foundation

// MARK: - LocationExport
public struct LocationExport {
    public let categoryBreakdown: [CategoryBreakdown]
    public let citiesVisited: Int
    public let cityBreakdown: [CityBreakdown]
    public let currentCity: String?
    public let explorationStats: ExplorationStats
    public let generatedAt: String
    public let last90Days: [Last90Day]
    public let lastSeen: String?
    public let streaks: Streaks
    public let topPlaces: [TopPlace]
    public let totalDurationHours: Double
    public let totalPlaces, totalVisits: Int

    public init(categoryBreakdown: [CategoryBreakdown], citiesVisited: Int, cityBreakdown: [CityBreakdown], currentCity: String?, explorationStats: ExplorationStats, generatedAt: String, last90Days: [Last90Day], lastSeen: String?, streaks: Streaks, topPlaces: [TopPlace], totalDurationHours: Double, totalPlaces: Int, totalVisits: Int) {
        self.categoryBreakdown = categoryBreakdown
        self.citiesVisited = citiesVisited
        self.cityBreakdown = cityBreakdown
        self.currentCity = currentCity
        self.explorationStats = explorationStats
        self.generatedAt = generatedAt
        self.last90Days = last90Days
        self.lastSeen = lastSeen
        self.streaks = streaks
        self.topPlaces = topPlaces
        self.totalDurationHours = totalDurationHours
        self.totalPlaces = totalPlaces
        self.totalVisits = totalVisits
    }
}

// MARK: - CategoryBreakdown
public struct CategoryBreakdown {
    public let category: String
    public let totalMinutes, visitCount: Int

    public init(category: String, totalMinutes: Int, visitCount: Int) {
        self.category = category
        self.totalMinutes = totalMinutes
        self.visitCount = visitCount
    }
}

// MARK: - CityBreakdown
public struct CityBreakdown {
    public let city: String
    public let visitCount: Int

    public init(city: String, visitCount: Int) {
        self.city = city
        self.visitCount = visitCount
    }
}

// MARK: - ExplorationStats
public struct ExplorationStats {
    public let totalCities, totalNeighborhoods, totalStates: Int

    public init(totalCities: Int, totalNeighborhoods: Int, totalStates: Int) {
        self.totalCities = totalCities
        self.totalNeighborhoods = totalNeighborhoods
        self.totalStates = totalStates
    }
}

// MARK: - Last90Day
public struct Last90Day {
    public let count: Int
    public let date: String
    public let totalDurationMinutes, uniquePlaces: Int

    public init(count: Int, date: String, totalDurationMinutes: Int, uniquePlaces: Int) {
        self.count = count
        self.date = date
        self.totalDurationMinutes = totalDurationMinutes
        self.uniquePlaces = uniquePlaces
    }
}

// MARK: - Streaks
public struct Streaks {
    public let currentStreak, longestStreak, totalActiveDays: Int

    public init(currentStreak: Int, longestStreak: Int, totalActiveDays: Int) {
        self.currentStreak = currentStreak
        self.longestStreak = longestStreak
        self.totalActiveDays = totalActiveDays
    }
}

// MARK: - TopPlace
public struct TopPlace {
    public let category, lastVisitAt: String?
    public let name: String
    public let totalDurationMinutes, visitCount: Int

    public init(category: String?, lastVisitAt: String?, name: String, totalDurationMinutes: Int, visitCount: Int) {
        self.category = category
        self.lastVisitAt = lastVisitAt
        self.name = name
        self.totalDurationMinutes = totalDurationMinutes
        self.visitCount = visitCount
    }
}
