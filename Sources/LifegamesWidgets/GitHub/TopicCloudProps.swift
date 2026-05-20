import Foundation

public struct TopicCloudProps: Hashable, Codable, Sendable {
    public let topics: [Topic]

    public struct Topic: Hashable, Codable, Sendable {
        public let name: String
        public let count: Int
        public let size: String
    }
}
