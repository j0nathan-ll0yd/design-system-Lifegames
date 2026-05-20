import Foundation

public struct OGImageProps: Hashable, Codable, Sendable {
    public let name: String
    public let title: String
    public let quote: String
    public let experience: String

    public init(
        name: String = "Jonathan Lloyd",
        title: String = "ENGINEERING DIRECTOR",
        quote: String = "Jack into his human datastream",
        experience: String = "24+ years professionally & counting"
    ) {
        self.name = name
        self.title = title
        self.quote = quote
        self.experience = experience
    }
}
