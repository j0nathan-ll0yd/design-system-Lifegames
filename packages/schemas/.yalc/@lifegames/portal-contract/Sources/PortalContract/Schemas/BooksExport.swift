// AUTO-GENERATED — do not edit. Regenerate: pnpm -C packages/portal-contract codegen

// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To parse the JSON, add this file to your project and do:
//
//   let booksExport = try BooksExport(json)

import Foundation

// MARK: - BooksExport
public struct BooksExport {
    public let books: [Book]
    public let generatedAt: String

    public init(books: [Book], generatedAt: String) {
        self.books = books
        self.generatedAt = generatedAt
    }
}

// MARK: - Book
public struct Book {
    public let asin, author: String
    public let averageRating, category: String?
    public let currentPage: Double?
    public let description, images, isbn10, isbn13: String?
    public let mainImage, mainImageAvif, mainImageCard, mainImageCardAvif: String?
    public let mainImageThumb, mainImageThumbAvif, notes: String?
    public let pageCount: Double?
    public let publicationDate: String?
    public let publishedYear, rating: Double?
    public let series: String?
    public let seriesNumber, seriesTotal: Double?
    public let status: String?
    public let title: String
    public let totalPages: Double?

    public init(asin: String, author: String, averageRating: String?, category: String?, currentPage: Double?, description: String?, images: String?, isbn10: String?, isbn13: String?, mainImage: String?, mainImageAvif: String?, mainImageCard: String?, mainImageCardAvif: String?, mainImageThumb: String?, mainImageThumbAvif: String?, notes: String?, pageCount: Double?, publicationDate: String?, publishedYear: Double?, rating: Double?, series: String?, seriesNumber: Double?, seriesTotal: Double?, status: String?, title: String, totalPages: Double?) {
        self.asin = asin
        self.author = author
        self.averageRating = averageRating
        self.category = category
        self.currentPage = currentPage
        self.description = description
        self.images = images
        self.isbn10 = isbn10
        self.isbn13 = isbn13
        self.mainImage = mainImage
        self.mainImageAvif = mainImageAvif
        self.mainImageCard = mainImageCard
        self.mainImageCardAvif = mainImageCardAvif
        self.mainImageThumb = mainImageThumb
        self.mainImageThumbAvif = mainImageThumbAvif
        self.notes = notes
        self.pageCount = pageCount
        self.publicationDate = publicationDate
        self.publishedYear = publishedYear
        self.rating = rating
        self.series = series
        self.seriesNumber = seriesNumber
        self.seriesTotal = seriesTotal
        self.status = status
        self.title = title
        self.totalPages = totalPages
    }
}
