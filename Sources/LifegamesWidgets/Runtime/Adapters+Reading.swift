import Foundation

public extension Adapters {
    // MARK: - Bookshelf

    /// Decodes the `reading/bookshelf*.json` envelope `{books: {books: [...]}}` → `BookshelfProps`.
    /// The wire format wraps the book array inside a nested `books` object; the inner books array
    /// maps directly to `BookshelfProps.Book` (same field names).
    static func bookshelf(fromFixture data: Data) -> BookshelfProps? {
        guard
            let outer = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let booksObj = outer["books"] as? [String: Any],
            let booksArray = booksObj["books"] as? [[String: Any]]
        else { return nil }
        let books = booksArray.map { b in
            BookshelfProps.Book(
                title: b["title"] as? String ?? "",
                author: b["author"] as? String ?? "",
                asin: b["asin"] as? String ?? "",
                status: b["status"] as? String ?? "",
                rating: b["rating"] as? Int,
                progress: b["progress"] as? Int,
                finishedAt: b["finishedAt"] as? String,
                coverUrl: b["coverUrl"] as? String
            )
        }
        return BookshelfProps(books: books)
    }

    // MARK: - BookModal

    /// Decodes the `reading/book-modal*.json` flat envelope → `BookModalProps`.
    /// Wire shape uses `desc` for description; all other fields align with Props.
    /// Returns nil for empty `{}` fixtures (default/populated-min/max/skeleton/empty stubs).
    static func bookModal(fromFixture data: Data) -> BookModalProps? {
        guard
            let b = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let title = b["title"] as? String,
            let author = b["author"] as? String,
            let asin = b["asin"] as? String,
            let status = b["status"] as? String,
            let statusLabel = b["statusLabel"] as? String
        else { return nil }
        return BookModalProps(
            title: title,
            author: author,
            asin: asin,
            status: status,
            statusLabel: statusLabel,
            rating: b["rating"] as? Int,
            progress: b["progress"] as? Int,
            finishedAt: b["finishedAt"] as? String,
            pages: b["pages"] as? Int,
            year: b["year"] as? Int,
            description: b["desc"] as? String,
            genres: b["genres"] as? [String] ?? [],
            notes: b["notes"] as? String,
            series: b["series"] as? String,
            seriesNumber: b["seriesNumber"] as? Int,
            seriesTotal: b["seriesTotal"] as? Int,
            coverUrl: b["coverUrl"] as? String
        )
    }

    // MARK: - ReadingFeed

    /// Decodes the `reading/reading-feed*.json` envelope `{reading: {articles: [...]}}` → `ReadingFeedProps`.
    static func readingFeed(fromFixture data: Data) -> ReadingFeedProps? {
        guard
            let outer = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let readingObj = outer["reading"] as? [String: Any],
            let articlesArray = readingObj["articles"] as? [[String: Any]]
        else { return nil }
        let articles = articlesArray.map { a in
            ReadingFeedProps.Article(
                title: a["title"] as? String ?? "",
                source: a["source"] as? String ?? "",
                date: a["date"] as? String ?? "",
                url: a["url"] as? String
            )
        }
        return ReadingFeedProps(articles: articles)
    }

    // MARK: - TheatreReviews

    /// Decodes the `reading/theatre-reviews*.json` envelope → `TheatreReviewsProps`.
    /// Wire shape: `{reviews: [{title, rating, imageUrl, url, ...}], totalReviews: N}`.
    /// Maps: `rating` → `grade`, `imageUrl` → `posterUrl`, `totalReviews` → `totalCount`.
    static func theatreReviews(fromFixture data: Data) -> TheatreReviewsProps? {
        guard
            let outer = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let reviewsArray = outer["reviews"] as? [[String: Any]]
        else { return nil }
        let totalCount = outer["totalReviews"] as? Int ?? reviewsArray.count
        let reviews = reviewsArray.map { r in
            TheatreReviewsProps.Review(
                title: r["title"] as? String ?? "",
                grade: r["rating"] as? String ?? "",
                posterUrl: r["imageUrl"] as? String,
                url: r["url"] as? String
            )
        }
        return TheatreReviewsProps(reviews: reviews, totalCount: totalCount)
    }
}
