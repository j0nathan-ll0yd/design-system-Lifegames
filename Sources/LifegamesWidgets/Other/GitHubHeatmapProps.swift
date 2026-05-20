import Foundation

public struct GitHubHeatmapProps: Hashable, Codable, Sendable {
    public let contributions: [[Int]]
    public let totalContributions: Int
    public let repos: Int
    public let stars: Int

    public init(contributions: [[Int]], totalContributions: Int, repos: Int, stars: Int) {
        self.contributions = contributions
        self.totalContributions = totalContributions
        self.repos = repos
        self.stars = stars
    }
}
