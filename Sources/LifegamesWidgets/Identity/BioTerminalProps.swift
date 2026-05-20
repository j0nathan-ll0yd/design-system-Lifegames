import Foundation

public struct BioTerminalProps: Hashable, Codable, Sendable {
    public let lines: [TerminalLine]

    public init(lines: [TerminalLine]) {
        self.lines = lines
    }

    public struct TerminalLine: Hashable, Codable, Sendable {
        public let type: String
        public let text: String?

        public init(type: String, text: String? = nil) {
            self.type = type
            self.text = text
        }
    }
}
