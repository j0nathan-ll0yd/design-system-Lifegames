import Foundation

public struct StarredByLanguageProps: Hashable, Codable, Sendable {
    public let groups: [LanguageGroup]

    public struct LanguageGroup: Hashable, Codable, Sendable {
        public let language: String
        public let languageColor: String
        public let repos: [Repo]
    }

    public struct Repo: Hashable, Codable, Sendable {
        public let owner: String
        public let name: String
        public let stars: Int
        public let starredAt: String
    }
}
