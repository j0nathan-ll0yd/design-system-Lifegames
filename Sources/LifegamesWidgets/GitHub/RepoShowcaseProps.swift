import Foundation

public struct RepoShowcaseProps: Hashable, Codable, Sendable {
    public let repos: [Repo]

    public struct Repo: Hashable, Codable, Sendable {
        public let name: String
        public let description: String
        public let stars: Int
        public let forks: Int
        public let language: String
        public let languageColor: String
        public let topics: [String]
        public let url: String
    }
}
