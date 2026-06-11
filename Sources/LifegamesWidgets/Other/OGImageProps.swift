import Foundation
import LifegamesCopy

public struct OGImageProps: Hashable, Codable, Sendable {
    public let name: String
    public let title: String
    public let quote: String
    public let experience: String

    public init(
        name: String = CopyLoader.identity.person.name,
        title: String = CopyLoader.identity.person.jobTitle.uppercased(),
        quote: String = CopyLoader.identity.seo.ogImageQuote,
        experience: String = CopyLoader.identity.person.experiencePhrase
    ) {
        self.name = name
        self.title = title
        self.quote = quote
        self.experience = experience
    }
}
