import Foundation

public struct ProfileCardProps: Hashable, Codable, Sendable {
    public let avatarUrl: String
    public let name: String
    public let bio: String
    public let followers: Int
    public let following: Int
    public let createdAt: String
    public let publicRepos: Int
}
