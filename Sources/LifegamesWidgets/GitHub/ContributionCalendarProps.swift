import Foundation

public struct ContributionCalendarProps: Hashable, Codable, Sendable {
    public let weeks: [Week]
    public let months: [String]

    public struct Week: Hashable, Codable, Sendable {
        public let firstDay: String
        public let days: [Day]
    }

    public struct Day: Hashable, Codable, Sendable {
        public let date: String
        public let count: Int
        public let level: Int
    }
}
