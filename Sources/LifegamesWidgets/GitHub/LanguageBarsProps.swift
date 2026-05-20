import Foundation

public struct LanguageBarsProps: Hashable, Codable, Sendable {
    public let languages: [Language]

    public struct Language: Hashable, Codable, Sendable {
        public let name: String
        public let pct: Double
        public let color: String
    }
}
