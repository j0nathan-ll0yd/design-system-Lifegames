import Foundation

public struct ContributionGridProps: Hashable, Codable, Sendable {
    public let contributions: [[Int]]
    public let stats: Stats

    public struct Stats: Hashable, Codable, Sendable {
        public let repos: Int
        public let stars: Int
        public let contributions: Int
    }
}
