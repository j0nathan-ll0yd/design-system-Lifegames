import Foundation
@testable import LifegamesWidgets

extension WidgetFixtureCatalogTests {
    static var readingRows: [FixtureCatalogRow] {
        // BookshelfView — wire envelope {books: {books: [...]}}; adapter required.
        // skeleton/empty use init(state:) and don't load JSON.
        bookshelfRows +
            // BookModalView — flat wire shape; adapter handles desc→description rename.
            // Empty stub fixtures (book-modal.json, .populated-min, .populated-max, .skeleton, .empty) are {}
            // and handled by Kind.skeleton/Kind.empty — not cataloged here.
            bookModalRows +
            // ReadingFeedView — wire envelope {reading: {articles: [...]}}; adapter required.
            readingFeedRows +
            // TheatreReviewsView — wire maps rating→grade, imageUrl→posterUrl, totalReviews→totalCount.
            theatreReviewsRows
    }

    // MARK: - Bookshelf

    private static var bookshelfRows: [FixtureCatalogRow] {
        [
            bookshelfRow("bookshelf"),
            bookshelfRow("bookshelf.populated-min"),
            bookshelfRow("bookshelf.populated-max"),
            bookshelfRow("bookshelf.all-completed"),
            bookshelfRow("bookshelf.all-in-progress"),
            bookshelfRow("bookshelf.dense-shelf"),
            bookshelfRow("bookshelf.mixed"),
            bookshelfRow("bookshelf.mostly-empty"),
        ]
    }

    private static func bookshelfRow(_ name: String) -> FixtureCatalogRow {
        .adapted(
            category: "reading",
            name: name,
            propsTypeName: "BookshelfProps",
            adapt: { Adapters.bookshelf(fromFixture: $0) }
        )
    }

    // MARK: - BookModal

    private static var bookModalRows: [FixtureCatalogRow] {
        [
            bookModalRow("book-modal.currently-reading"),
            bookModalRow("book-modal.completed-with-rating"),
            bookModalRow("book-modal.series-book"),
            bookModalRow("book-modal.wishlist"),
        ]
    }

    private static func bookModalRow(_ name: String) -> FixtureCatalogRow {
        .adapted(
            category: "reading",
            name: name,
            propsTypeName: "BookModalProps",
            adapt: { Adapters.bookModal(fromFixture: $0) }
        )
    }

    // MARK: - ReadingFeed

    private static var readingFeedRows: [FixtureCatalogRow] {
        [
            readingFeedRow("reading-feed"),
            readingFeedRow("reading-feed.populated-min"),
            readingFeedRow("reading-feed.populated-max"),
            readingFeedRow("reading-feed.binge-week"),
            readingFeedRow("reading-feed.mixed-types"),
            readingFeedRow("reading-feed.quiet-week"),
            readingFeedRow("reading-feed.recent-burst"),
            readingFeedRow("reading-feed.single-entry"),
        ]
    }

    private static func readingFeedRow(_ name: String) -> FixtureCatalogRow {
        .adapted(
            category: "reading",
            name: name,
            propsTypeName: "ReadingFeedProps",
            adapt: { Adapters.readingFeed(fromFixture: $0) }
        )
    }

    // MARK: - TheatreReviews

    private static var theatreReviewsRows: [FixtureCatalogRow] {
        [
            theatreReviewsRow("theatre-reviews"),
            theatreReviewsRow("theatre-reviews.populated-min"),
            theatreReviewsRow("theatre-reviews.populated-max"),
            theatreReviewsRow("theatre-reviews.mixed-ratings"),
            theatreReviewsRow("theatre-reviews.regional-tour"),
            theatreReviewsRow("theatre-reviews.single-show"),
            theatreReviewsRow("theatre-reviews.subscription-season"),
            theatreReviewsRow("theatre-reviews.west-end-season"),
        ]
    }

    private static func theatreReviewsRow(_ name: String) -> FixtureCatalogRow {
        .adapted(
            category: "reading",
            name: name,
            propsTypeName: "TheatreReviewsProps",
            adapt: { Adapters.theatreReviews(fromFixture: $0) }
        )
    }
}
