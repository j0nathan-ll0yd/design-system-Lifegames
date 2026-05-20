import Foundation

public struct StreakCounterProps: Hashable, Codable, Sendable {
    public let current: Int
    public let longest: Int
    public let recentDays: [RecentDay]

    public struct RecentDay: Hashable, Codable, Sendable {
        public let date: String
        public let active: Bool
    }
}
