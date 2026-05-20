import Foundation

public struct StarredRepoCardsProps: Hashable, Codable, Sendable {
    public let repos: [Repo]

    public struct Repo: Hashable, Codable, Sendable {
        public let owner: String
        public let name: String
        public let description: String
        public let stars: Int
        public let forks: Int
        public let language: String
        public let languageColor: String
        public let url: String
    }
}
