import Foundation
import LifegamesCopy

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
        public let finishedAt: String?
        public let coverUrl: String?

        public init(
            title: String, author: String, asin: String,
            status: String, rating: Int? = nil, progress: Int? = nil,
            finishedAt: String? = nil, coverUrl: String? = nil
        ) {
            self.title = title
            self.author = author
            self.asin = asin
            self.status = status
            self.rating = rating
            self.progress = progress
            self.finishedAt = finishedAt
            self.coverUrl = coverUrl
        }

        public var statusLabel: String {
            let copy = CopyLoader.widgets.bookshelf
            switch status {
            case "reading": return copy.statusReading.uppercased()
            case "upNext": return copy.statusUpNext.uppercased()
            case "finished": return copy.statusFinished.uppercased()
            case "pending": return copy.statusPending.uppercased()
            default: return status.uppercased()
            }
        }
    }
}
