import Foundation

public struct ReadingFeedProps: Hashable, Codable, Sendable {
    public let articles: [Article]

    public init(articles: [Article]) {
        self.articles = articles
    }

    public struct Article: Hashable, Codable, Sendable {
        public let title: String
        public let source: String
        public let date: String
        public let url: String?

        public init(title: String, source: String, date: String, url: String? = nil) {
            self.title = title
            self.source = source
            self.date = date
            self.url = url
        }
    }
}
