import Foundation

public struct DevActivityEvent: Hashable, Codable, Sendable {
    public let type: String
    public let repo: String
    public let title: String
    public let date: String
    public var hash: String?
    public var number: Int?
    public var additions: Int?
    public var deletions: Int?
}

public struct DevActivityProps: Hashable, Codable, Sendable {
    public let events: [DevActivityEvent]
}
