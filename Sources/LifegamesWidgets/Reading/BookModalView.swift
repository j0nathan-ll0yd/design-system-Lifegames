import LifegamesComponents
import LifegamesCopy
import LifegamesTokens
import SwiftUI

private let bookModalCopy = CopyLoader.widgets.bookModal

public struct BookModalView: View {
    private let state: WidgetState<BookModalProps>
    public var onDismiss: (() -> Void)?

    public init(state: WidgetState<BookModalProps>, onDismiss: (() -> Void)? = nil) {
        self.state = state
        self.onDismiss = onDismiss
    }

    public init(props: BookModalProps, onDismiss: (() -> Void)? = nil) {
        state = .populated(props)
        self.onDismiss = onDismiss
    }

    public var body: some View {
        switch state {
        case .loading:
            BookModalSkeletonView(onDismiss: onDismiss)
                .modalChrome()
        case .empty:
            BookModalEmptyView(onDismiss: onDismiss)
                .modalChrome()
        case let .populated(props):
            BookModalPopulatedView(props: props, onDismiss: onDismiss)
                .modalChrome()
        }
    }
}

// MARK: - Chrome modifier

private extension View {
    func modalChrome() -> some View {
        background(Color.colorSurfaceRaised)
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(Color.colorBorderSubtle, lineWidth: 1)
            )
            .frame(maxWidth: 400)
    }
}

// MARK: - Populated

private struct BookModalPopulatedView: View {
    let props: BookModalProps
    var onDismiss: (() -> Void)?

    var body: some View {
        VStack(spacing: 0) {
            headerSection
            Divider().overlay(Color.white.opacity(0.06))
            bodySection
        }
    }

    private var headerSection: some View {
        HStack(alignment: .top, spacing: 16) {
            BookCover(
                title: props.title,
                imageURL: props.coverUrl.flatMap { URL(string: $0) },
                width: 100, height: 150
            )

            VStack(alignment: .leading, spacing: 6) {
                Text(props.title)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(Color.colorTextTitle)

                if let series = props.series {
                    HStack(spacing: 4) {
                        Text(series)
                            .font(.system(size: 11))
                            .foregroundStyle(Color.colorTextMuted)
                        if let num = props.seriesNumber {
                            Text("Book \(num)")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundStyle(Color.colorAccentGreen)
                        }
                    }
                }

                Text(props.author)
                    .font(.system(size: 12))
                    .foregroundStyle(Color.colorTextMuted)

                if let rating = props.rating {
                    RatingStars(rating: rating, size: 11)
                }
            }

            Spacer()

            if let onDismiss {
                Button(action: onDismiss) {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(Color.colorTextMuted)
                        .frame(width: 28, height: 28)
                        .background(Color.white.opacity(0.06))
                        .clipShape(Circle())
                }
            }
        }
        .padding(20)
    }

    private var bodySection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 20) {
                StatBlock(value: props.pages.map(String.init) ?? "\u{2014}", label: bookModalCopy.pages)
                StatBlock(value: props.year.map(String.init) ?? "\u{2014}", label: bookModalCopy.published)
                StatBlock(value: props.statusLabel, label: bookModalCopy.status)
            }

            if props.status == "reading", let progress = props.progress {
                VStack(spacing: 4) {
                    ReadingProgressBar(progress: Double(progress) / 100)
                    Text(bookModalCopy.progressSuffix.replacingOccurrences(of: "{percent}", with: "\(progress)"))
                        .font(.system(size: 10))
                        .foregroundStyle(Color.colorTextMuted)
                }
            }

            if props.status == "finished", let finishedAt = props.finishedAt {
                Text("\(bookModalCopy.finishedDate) \(formatFinishedDate(finishedAt))")
                    .font(.system(size: 10))
                    .foregroundStyle(Color.colorAccentGreen)
            }

            if let desc = props.description {
                Text(desc)
                    .font(.system(size: 11))
                    .foregroundStyle(Color.colorTextMuted)
                    .lineLimit(4)
            }

            if !props.genres.isEmpty {
                GenreChips(genres: props.genres, tint: Color.colorTextMuted, wraps: true)
            }

            if let notes = props.notes, props.status == "finished" {
                VStack(alignment: .leading, spacing: 4) {
                    Text(bookModalCopy.notes)
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(Color.colorTextMuted)
                        .textCase(.uppercase)
                    Text(notes)
                        .font(.system(size: 11))
                        .foregroundStyle(Color.colorTextTitle)
                }
            }
        }
        .padding(20)
    }
}

// MARK: - Skeleton

private struct BookModalSkeletonView: View {
    var onDismiss: (() -> Void)?

    var body: some View {
        VStack(spacing: 0) {
            // Header row
            HStack(alignment: .top, spacing: 16) {
                SkeletonBar(width: 100, height: 150, cornerRadius: 4)

                VStack(alignment: .leading, spacing: 8) {
                    SkeletonBar(width: 140, height: 14)
                    SkeletonBar(width: 90, height: 11)
                    SkeletonBar(width: 70, height: 11)
                }

                Spacer()

                if let onDismiss {
                    Button(action: onDismiss) {
                        Image(systemName: "xmark")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(Color.colorTextMuted)
                            .frame(width: 28, height: 28)
                            .background(Color.white.opacity(0.06))
                            .clipShape(Circle())
                    }
                }
            }
            .padding(20)

            Divider().overlay(Color.white.opacity(0.06))

            // Body
            VStack(alignment: .leading, spacing: 16) {
                HStack(spacing: 20) {
                    SkeletonBar(width: 40, height: 13)
                    SkeletonBar(width: 40, height: 13)
                    SkeletonBar(width: 40, height: 13)
                }

                SkeletonBar(height: 6)

                VStack(alignment: .leading, spacing: 6) {
                    SkeletonBar(width: 320, height: 10)
                    SkeletonBar(width: 300, height: 10)
                    SkeletonBar(width: 180, height: 10)
                }
            }
            .padding(20)
        }
    }
}

// MARK: - Empty

private struct BookModalEmptyView: View {
    var onDismiss: (() -> Void)?

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Spacer()
                if let onDismiss {
                    Button(action: onDismiss) {
                        Image(systemName: "xmark")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(Color.colorTextMuted)
                            .frame(width: 28, height: 28)
                            .background(Color.white.opacity(0.06))
                            .clipShape(Circle())
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 20)

            VStack(spacing: 12) {
                Image(systemName: "book.closed")
                    .font(.system(size: 32))
                    .foregroundStyle(Color.colorTextMuted.opacity(0.4))

                Text(bookModalCopy.empty)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color.colorTextTitle)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 40)
            .padding(.horizontal, 20)
        }
    }
}

// MARK: - Supporting

private struct StatBlock: View {
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.system(size: 13, weight: .bold, design: .monospaced))
                .foregroundStyle(Color.colorTextTitle)
            Text(label)
                .font(.system(size: 9))
                .foregroundStyle(Color.colorTextMuted)
        }
    }
}

#Preview("Book Modal — Reading") {
    BookModalView(props: BookModalProps(
        title: "Project Hail Mary",
        author: "Andy Weir",
        asin: "B08FHBV4ZX",
        status: "reading",
        statusLabel: "READING",
        progress: 67,
        pages: 496,
        year: 2021,
        description: "A lone astronaut must save the earth from disaster.",
        genres: ["Sci-Fi", "Adventure", "Space"],
        series: "Standalone",
        coverUrl: previewCoverURL("project-hail-mary")
    ), onDismiss: {})
        .padding()
        .background(Color.colorSurfaceBase)
        .preferredColorScheme(.dark)
}

#Preview("Book Modal — Finished") {
    BookModalView(props: BookModalProps(
        title: "Recursion",
        author: "Blake Crouch",
        asin: "B07HDSHP7N",
        status: "finished",
        statusLabel: "FINISHED",
        rating: 5,
        finishedAt: "2024-03-15T00:00:00Z",
        pages: 329,
        year: 2019,
        description: "A neuroscientist and a detective uncover a terrifying secret about memory.",
        genres: ["Sci-Fi", "Thriller"],
        notes: "Brilliant high-concept thriller. The time-loop mechanics are airtight.",
        coverUrl: previewCoverURL("recursion")
    ), onDismiss: {})
        .padding()
        .background(Color.colorSurfaceBase)
        .preferredColorScheme(.dark)
}

#Preview("Book Modal — Loading") {
    BookModalView(state: .loading, onDismiss: {})
        .padding()
        .background(Color.colorSurfaceBase)
        .preferredColorScheme(.dark)
}
