import Foundation

public struct CommitTimelineProps: Hashable, Codable, Sendable {
    public let commits: [Commit]

    public struct Commit: Hashable, Codable, Sendable {
        public let hash: String
        public let message: String
        public let repo: String
        public let date: String
        public let repoColor: String
    }
}
