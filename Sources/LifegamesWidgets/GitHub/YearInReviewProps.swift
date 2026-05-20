import Foundation

public struct YearInReviewProps: Hashable, Codable, Sendable {
    public let totalContributions: Int
    public let topLanguage: String
    public let mostActiveMonth: String
    public let reposCreated: Int
    public let longestStreak: Int
}
