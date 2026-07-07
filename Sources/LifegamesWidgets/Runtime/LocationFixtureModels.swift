// LocationFixtureModels.swift — Codable wire models for the location app-preview fixtures.
// Mirrors packages/schemas/authored/{visit-timeline,saved-places,place-search-results}.schema.json.
// Consumed by app-side preview fixture modules (S98): decode via
// `WidgetFixtures.data(category: "location", name: ...)`, then map to app domain
// types. Visit timestamps are absolute ISO-8601 strings authored against
// `referenceDate`; consumers re-anchor them to `Date()` so previews stay recent.
import Foundation

/// A timeline of location visits (visit-timeline.*.json).
public struct VisitTimelineProps: Equatable, Codable, Sendable {
    public struct Entry: Equatable, Codable, Sendable {
        public let id: Int
        public let clientUuid: String
        public let latitude: Double
        public let longitude: Double
        public let geohash: String
        /// ISO-8601; parse relative to `referenceDate` and re-anchor to now.
        public let arrivalTime: String
        public let departureTime: String?
        public let placeName: String?
        public let placeCategory: String?
        public let address: String?
        public let city: String?
        public let state: String?
        public let country: String?
        public let needsGeocode: Bool?
        public let isSynced: Bool
        public let createdAt: String?
    }

    /// ISO-8601 'now' the visit timestamps were authored against.
    public let referenceDate: String
    public let visits: [Entry]
}

/// User-saved geofenced places (saved-places.json).
public struct SavedPlacesProps: Equatable, Codable, Sendable {
    public struct Entry: Equatable, Codable, Sendable {
        public let id: Int
        public let name: String
        public let latitude: Double
        public let longitude: Double
        public let geohash: String
        public let radiusMeters: Double
        public let category: String
        public let icon: String
    }

    public let places: [Entry]
}

/// Place search results (place-search-results.json).
public struct PlaceSearchResultsProps: Equatable, Codable, Sendable {
    public struct Entry: Equatable, Codable, Sendable {
        public let id: String
        public let name: String
        public let category: String
        public let address: String
        public let city: String
        public let state: String
        public let latitude: Double
        public let longitude: Double
        public let distance: Double
    }

    public let results: [Entry]
}
