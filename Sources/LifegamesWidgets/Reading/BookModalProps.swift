import Foundation

public struct BookModalProps: Hashable, Codable, Sendable {
    public let title: String
    public let author: String
    public let asin: String
    public let status: String
    public let statusLabel: String
    public let rating: Int?
    public let progress: Int?
    public let finishedAt: String?
    public let pages: Int?
    public let year: Int?
    public let description: String?
    public let genres: [String]
    public let notes: String?
    public let series: String?
    public let seriesNumber: Int?
    public let seriesTotal: Int?
    public let coverUrl: String?

    public init(
        title: String, author: String, asin: String,
        status: String, statusLabel: String, rating: Int? = nil,
        progress: Int? = nil, finishedAt: String? = nil,
        pages: Int? = nil, year: Int? = nil,
        description: String? = nil, genres: [String] = [],
        notes: String? = nil, series: String? = nil,
        seriesNumber: Int? = nil, seriesTotal: Int? = nil,
        coverUrl: String? = nil
    ) {
        self.title = title
        self.author = author
        self.asin = asin
        self.status = status
        self.statusLabel = statusLabel
        self.rating = rating
        self.progress = progress
        self.finishedAt = finishedAt
        self.pages = pages
        self.year = year
        self.description = description
        self.genres = genres
        self.notes = notes
        self.series = series
        self.seriesNumber = seriesNumber
        self.seriesTotal = seriesTotal
        self.coverUrl = coverUrl
    }
}
