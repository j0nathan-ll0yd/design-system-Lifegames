// AUTO-GENERATED — do not edit. Regenerate: pnpm -C packages/portal-contract codegen

// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To parse the JSON, add this file to your project and do:
//
//   let theatreReviewsExport = try TheatreReviewsExport(json)

import Foundation

// MARK: - TheatreReviewsExport
public struct TheatreReviewsExport {
    public let generatedAt: String
    public let reviews: [Review]
    public let source: Source
    public let totalReviews: Double

    public init(generatedAt: String, reviews: [Review], source: Source, totalReviews: Double) {
        self.generatedAt = generatedAt
        self.reviews = reviews
        self.source = source
        self.totalReviews = totalReviews
    }
}

// MARK: - Review
public struct Review {
    public let author, excerpt: String
    public let imageHeight: Double?
    public let imageURL: String?
    public let imageWidth: Double?
    public let publishedAt: String
    public let rating: String?
    public let ratingNumeric: Double?
    public let slug, title, url: String

    public init(author: String, excerpt: String, imageHeight: Double?, imageURL: String?, imageWidth: Double?, publishedAt: String, rating: String?, ratingNumeric: Double?, slug: String, title: String, url: String) {
        self.author = author
        self.excerpt = excerpt
        self.imageHeight = imageHeight
        self.imageURL = imageURL
        self.imageWidth = imageWidth
        self.publishedAt = publishedAt
        self.rating = rating
        self.ratingNumeric = ratingNumeric
        self.slug = slug
        self.title = title
        self.url = url
    }
}

public enum Source: String {
    case coasttocoastreviewsCOM
}
