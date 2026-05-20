import Foundation

public struct WeeklyPulseProps: Hashable, Codable, Sendable {
    public let weeks: [Week]
    public let maxWeek: Int

    public struct Week: Hashable, Codable, Sendable {
        public let total: Int
        public let label: String
    }
}
