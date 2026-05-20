import Foundation

public struct ContributionBreakdownProps: Hashable, Codable, Sendable {
    public let commits: Int
    public let pullRequests: Int
    public let issues: Int
    public let reviews: Int
}
