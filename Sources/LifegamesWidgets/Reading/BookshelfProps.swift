import Foundation

public struct BookshelfProps: Hashable, Codable, Sendable {
    public let books: [Book]

    public init(books: [Book]) {
        self.books = books
    }

    public struct Book: Hashable, Codable, Sendable {
        public let title: String
        public let author: String
        public let asin: String
        public let status: String
        public let rating: Int?
        public let progress: Int?
        public let coverUrl: String?

        public init(
            title: String, author: String, asin: String,
            status: String, rating: Int? = nil, progress: Int? = nil,
            coverUrl: String? = nil
        ) {
            self.title = title
            self.author = author
            self.asin = asin
            self.status = status
            self.rating = rating
            self.progress = progress
            self.coverUrl = coverUrl
        }

        public var statusLabel: String {
            switch status {
            case "in_progress": return "READING"
            case "next": return "UP NEXT"
            case "completed": return "COMPLETED"
            default: return status.uppercased()
            }
        }
    }
}
