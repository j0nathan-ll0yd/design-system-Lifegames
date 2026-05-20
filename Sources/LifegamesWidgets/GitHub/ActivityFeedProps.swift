import Foundation

public struct ActivityFeedProps: Hashable, Codable, Sendable {
    public let events: [Event]

    public struct Event: Hashable, Codable, Sendable {
        public let type: String
        public let repo: String
        public let title: String
        public let date: String
        public let detail: String
    }
}
