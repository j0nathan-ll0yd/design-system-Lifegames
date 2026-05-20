import Foundation

public struct CodeVelocityProps: Hashable, Codable, Sendable {
    public let weeks: [Week]

    public struct Week: Hashable, Codable, Sendable {
        public let additions: Int
        public let deletions: Int
    }
}
