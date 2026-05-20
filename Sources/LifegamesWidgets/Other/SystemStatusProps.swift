import Foundation

public struct SystemStatusProps: Hashable, Codable, Sendable {
    public let lines: [StatusLine]

    public init(lines: [StatusLine]) {
        self.lines = lines
    }

    public struct StatusLine: Hashable, Codable, Sendable {
        public let key: String
        public let value: String
        public let status: String

        public init(key: String, value: String, status: String = "online") {
            self.key = key
            self.value = value
            self.status = status
        }

        public var dotColor: String {
            switch status.lowercased() {
            case "online": return "green"
            case "stale": return "amber"
            case "offline", "error": return "red"
            default: return "green"
            }
        }

        public var keyColorName: String {
            switch key {
            case "Health": return "red"
            case "Sleep": return "purple"
            case "Location": return "blue"
            case "Books", "Articles": return "amber"
            case "Github Events", "Github Stars": return "green"
            case "Theatre Reviews": return "yellow"
            default: return "green"
            }
        }
    }
}
