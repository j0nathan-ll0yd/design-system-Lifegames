import Foundation

public struct ContributionRingsProps: Hashable, Codable, Sendable {
    public let commits: RingStat
    public let pullRequests: RingStat
    public let issues: RingStat
    public let reviews: RingStat

    public struct RingStat: Hashable, Codable, Sendable {
        public let count: Int
        public let pct: Int
    }
}
