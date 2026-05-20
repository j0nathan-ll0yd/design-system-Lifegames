import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct BookshelfView: View {
    public let props: BookshelfProps

    public init(props: BookshelfProps) {
        self.props = props
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "BOOKSHELF", dotColor: Color.colorAccentAmber, timestamp: "library")

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

private struct BookCoverItem: View {
    let book: BookshelfProps.Book

    var body: some View {
        VStack(spacing: 6) {
            RoundedRectangle(cornerRadius: 4)
                .fill(
                    LinearGradient(
                        colors: [Color.colorAccentAmber.opacity(0.2), Color.colorAccentBlue.opacity(0.1)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 80, height: 120)
                .overlay(
                    Image(systemName: "book.closed.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(Color.colorAccentAmber.opacity(0.4))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 4)
                        .stroke(book.status == "in_progress" ? Color.colorAccentAmber : Color.clear, lineWidth: 1.5)
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

            if book.status == "in_progress" {
                if let progress = book.progress {
                    ProgressView(value: Double(progress), total: 100)
                        .tint(Color.colorAccentAmber)
                        .frame(width: 60)
                    Text("\(progress)%")
                        .font(.system(size: 8, design: .monospaced))
                        .foregroundStyle(Color.colorAccentAmber)
                } else {
                    Text(book.statusLabel)
                        .font(.system(size: 8, weight: .semibold))
                        .foregroundStyle(Color.colorAccentGreen)
                }
            } else if let rating = book.rating {
                HStack(spacing: 1) {
                    ForEach(1 ... 5, id: \.self) { star in
                        Image(systemName: star <= rating ? "star.fill" : "star")
                            .font(.system(size: 7))
                            .foregroundStyle(Color.colorAccentAmber)
                    }
                }
            } else {
                Text(book.statusLabel)
                    .font(.system(size: 8, weight: .medium))
                    .foregroundStyle(Color.colorTextMuted)
            }
        }
    }
}

#Preview("Bookshelf") {
    BookshelfView(props: BookshelfProps(books: [
        .init(title: "Project Hail Mary", author: "Andy Weir", asin: "B08FHBV4ZX", status: "in_progress", progress: 67),
        .init(title: "Recursion", author: "Blake Crouch", asin: "B07HDSHP7N", status: "completed", rating: 5),
        .init(title: "Dark Matter", author: "Blake Crouch", asin: "B0180T0IUY", status: "completed", rating: 4),
        .init(title: "The Martian", author: "Andy Weir", asin: "B00EMXBDMA", status: "next"),
    ]))
    .padding()
    .background(Color.colorSurfaceBase)
    .preferredColorScheme(.dark)
}
