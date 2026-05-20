import Foundation

public struct IdentityCardProps: Hashable, Codable, Sendable {
    public let name: String
    public let title: String
    public let bio: String
    public let tagline: String
    public let githubUrl: String
    public let linkedinUrl: String

    public init(
        name: String, title: String, bio: String,
        tagline: String, githubUrl: String, linkedinUrl: String
    ) {
        self.name = name
        self.title = title
        self.bio = bio
        self.tagline = tagline
        self.githubUrl = githubUrl
        self.linkedinUrl = linkedinUrl
    }
}
