import LifegamesComponents
import LifegamesCopy
import LifegamesTokens
import SwiftUI

private let bookshelfCopy = CopyLoader.widgets.bookshelf

public struct BookshelfView: View {
    private let state: WidgetState<BookshelfProps>

    public init(state: WidgetState<BookshelfProps>) {
        self.state = state
    }

    public init(props: BookshelfProps) {
        state = props.books.isEmpty ? .empty : .populated(props)
    }

    public var body: some View {
        switch state {
        case .loading:
            BookshelfSkeletonView()
        case .empty:
            BookshelfEmptyView()
        case let .populated(props):
            BookshelfPopulatedView(props: props)
        }
    }
}

private struct BookshelfPopulatedView: View {
    let props: BookshelfProps

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: bookshelfCopy.title.uppercased(), dotColor: Color.colorAccentAmber, timestamp: bookshelfCopy.timestampLibrary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 14) {
                    ForEach(Array(props.books.prefix(5).enumerated()), id: \.offset) { _, book in
                        BookCoverItem(book: book)
                    }
                }
                .padding(.horizontal, 18)
            }
            .padding(.bottom, 16)
        }
        .neonCard(accent: Color.colorAccentAmber)
    }
}

private struct BookshelfEmptyView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: bookshelfCopy.title.uppercased(), dotColor: Color.colorAccentAmber, timestamp: bookshelfCopy.timestampLibrary)

            VStack(spacing: 12) {
                Image(systemName: "books.vertical")
                    .font(.system(size: 32))
                    .foregroundStyle(Color.colorAccentAmber.opacity(0.6))

                Text(bookshelfCopy.emptyTitle)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color.colorTextTitle)

                Text(bookshelfCopy.emptyBody)
                    .font(.system(size: 11))
                    .foregroundStyle(Color.colorTextMuted)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .padding(.horizontal, 18)
        }
        .neonCard(accent: Color.colorAccentAmber)
    }
}

private struct BookshelfSkeletonView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: bookshelfCopy.title.uppercased(), dotColor: Color.colorAccentAmber, timestamp: bookshelfCopy.timestampLibrary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 14) {
                    ForEach(0 ..< 3, id: \.self) { _ in
                        BookCoverSkeleton()
                    }
                }
                .padding(.horizontal, 18)
            }
            .padding(.bottom, 16)
        }
        .neonCard(accent: Color.colorAccentAmber)
    }
}

private struct BookCoverSkeleton: View {
    var body: some View {
        VStack(spacing: 6) {
            SkeletonBar(width: 80, height: 120, cornerRadius: 6)
            SkeletonBar(width: 64, height: 10)
            SkeletonBar(width: 48, height: 8)
        }
    }
}

private struct BookCoverItem: View {
    let book: BookshelfProps.Book

    var body: some View {
        VStack(spacing: 6) {
            BookCover(
                title: book.title,
                imageURL: book.coverUrl.flatMap { URL(string: $0) },
                width: 80,
                height: 120,
                borderColor: book.status == "reading" ? Color.colorAccentAmber : nil
            )

            Text(book.title)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(Color.colorTextTitle)
                .lineLimit(1)
                .frame(width: 80)

            Text(book.author)
                .font(.system(size: 9))
                .foregroundStyle(Color.colorTextMuted)
                .lineLimit(1)
                .frame(width: 80)

            if book.status == "reading" {
                if let progress = book.progress {
                    ReadingProgressBar(progress: Double(progress) / 100, color: Color.colorAccentAmber)
                        .frame(width: 60)
                    Text("\(progress)%")
                        .font(.system(size: 8, design: .monospaced))
                        .foregroundStyle(Color.colorAccentAmber)
                } else {
                    BookStatusBadge(BookStatusBadge.Status.from(book.status), label: book.statusLabel, size: 8)
                }
            } else if book.status == "finished", let finishedAt = book.finishedAt {
                Text(formatFinishedDate(finishedAt))
                    .font(.system(size: 8, design: .monospaced))
                    .foregroundStyle(Color.colorAccentGreen)
                    .lineLimit(1)
                    .frame(width: 80)
            } else if let rating = book.rating {
                RatingStars(rating: rating, size: 7)
            } else {
                BookStatusBadge(BookStatusBadge.Status.from(book.status), label: book.statusLabel, size: 8)
            }
        }
    }
}

/// Static formatters — DateFormatter/ISO8601DateFormatter allocation is expensive; reuse (S59).
/// nonisolated(unsafe): these are write-once at init and read-only thereafter (no data race).
private nonisolated(unsafe) let _finishedDateISOFull: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f
}()

private nonisolated(unsafe) let _finishedDateISOBasic: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime]
    return f
}()

private let _finishedDateDisplay: DateFormatter = {
    let f = DateFormatter()
    f.dateFormat = "MMM yyyy"
    return f
}()

/// Formats an ISO-8601 date string (e.g. "2024-03-15T00:00:00Z") to a short display form
/// ("Mar 2024"). Falls back to the raw string if parsing fails. Module-internal.
func formatFinishedDate(_ isoString: String) -> String {
    let date = _finishedDateISOFull.date(from: isoString)
        ?? _finishedDateISOBasic.date(from: isoString)
    guard let date else { return isoString }
    return _finishedDateDisplay.string(from: date)
}

/// Resolves a bundled preview cover image to a local file-URL string (no network).
/// Tries the `book-covers` subdirectory first, then the flattened bundle root,
/// since SwiftPM `.process` resources may or may not preserve directory structure.
/// Module-internal so the Reading widget previews (Bookshelf + BookModal) can share it.
func previewCoverURL(_ name: String) -> String? {
    let bundle = Bundle.module
    let url = bundle.url(forResource: name, withExtension: "jpg", subdirectory: "book-covers")
        ?? bundle.url(forResource: name, withExtension: "jpg")
    return url?.absoluteString
}

#Preview("Bookshelf — Populated") {
    BookshelfView(state: .populated(BookshelfProps(books: [
        .init(
            title: "Project Hail Mary", author: "Andy Weir", asin: "B08FHBV4ZX",
            status: "reading", progress: 67, coverUrl: previewCoverURL("project-hail-mary")
        ),
        .init(
            title: "Recursion", author: "Blake Crouch", asin: "B07HDSHP7N",
            status: "finished", rating: 5, finishedAt: "2024-03-15T00:00:00Z",
            coverUrl: previewCoverURL("recursion")
        ),
        .init(
            title: "Dark Matter", author: "Blake Crouch", asin: "B0180T0IUY",
            status: "finished", rating: 4, coverUrl: previewCoverURL("dark-matter")
        ),
        .init(
            title: "The Martian", author: "Andy Weir", asin: "B00EMXBDMA",
            status: "upNext", coverUrl: previewCoverURL("the-martian")
        ),
    ])))
    .padding()
    .background(Color.colorSurfaceBase)
    .preferredColorScheme(.dark)
}

#Preview("Bookshelf — Placeholders") {
    BookshelfView(state: .populated(BookshelfProps(books: [
        .init(title: "Project Hail Mary", author: "Andy Weir", asin: "B08FHBV4ZX", status: "reading", progress: 67),
        .init(title: "Recursion", author: "Blake Crouch", asin: "B07HDSHP7N", status: "finished", rating: 5, finishedAt: "2024-03-15T00:00:00Z"),
        .init(title: "Dark Matter", author: "Blake Crouch", asin: "B0180T0IUY", status: "finished", rating: 4),
        .init(title: "The Martian", author: "Andy Weir", asin: "B00EMXBDMA", status: "upNext"),
    ])))
    .padding()
    .background(Color.colorSurfaceBase)
    .preferredColorScheme(.dark)
}

#Preview("Bookshelf — Loading") {
    BookshelfView(state: .loading)
        .padding()
        .background(Color.colorSurfaceBase)
        .preferredColorScheme(.dark)
}

#Preview("Bookshelf — Empty") {
    BookshelfView(state: .empty)
        .padding()
        .background(Color.colorSurfaceBase)
        .preferredColorScheme(.dark)
}
