import Foundation

public struct TopReposProps: Hashable, Codable, Sendable {
    public let repos: [Repo]

    public struct Repo: Hashable, Codable, Sendable {
        public let rank: Int
        public let name: String
        public let stars: Int
        public let language: String
        public let languageColor: String
    }
}
