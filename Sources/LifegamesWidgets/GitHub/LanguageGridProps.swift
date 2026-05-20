import Foundation

public struct LanguageGridProps: Hashable, Codable, Sendable {
    public let languages: [Language]

    public struct Language: Hashable, Codable, Sendable {
        public let name: String
        public let pct: Double
        public let color: String
        public let repos: Int
    }
}
