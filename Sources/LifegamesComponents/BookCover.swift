import LifegamesTokens
import SwiftUI

/// Dual-mode book cover: gradient placeholder (default) or async image load.
/// Placeholder mirrors iOS `coverPlaceholder` (gradient + book icon + title); self-clips to `cornerRadius`.
/// AsyncImage branch mirrors CoverImageView without the UIKit screenshot path (stays iOS-only).
/// Pass `borderColor` to draw a highlight ring (e.g. amber for the currently-reading book) — matches web `.shelf-book-active`.
public struct BookCover: View {
    public let title: String
    public let imageURL: URL?
    public let width: CGFloat
    public let height: CGFloat
    public let accent: Color
    public let cornerRadius: CGFloat
    public let borderColor: Color?

    public init(
        title: String,
        imageURL: URL? = nil,
        width: CGFloat,
        height: CGFloat,
        accent: Color = LGColor.accentAmber,
        cornerRadius: CGFloat = 6,
        borderColor: Color? = nil
    ) {
        self.title = title
        self.imageURL = imageURL
        self.width = width
        self.height = height
        self.accent = accent
        self.cornerRadius = cornerRadius
        self.borderColor = borderColor
    }

    public var body: some View {
        placeholder
            .overlay {
                if let url = imageURL {
                    AsyncImage(url: url) { phase in
                        if case let .success(image) = phase {
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(width: width, height: height)
                                .clipped()
                        }
                    }
                }
            }
            .frame(width: width, height: height)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
            .overlay {
                if let borderColor {
                    RoundedRectangle(cornerRadius: cornerRadius)
                        .stroke(borderColor, lineWidth: 1.5)
                }
            }
    }

    private var placeholder: some View {
        LinearGradient(
            colors: [accent.opacity(0.3), accent.opacity(0.1)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .frame(width: width, height: height)
        .overlay {
            VStack(spacing: 4) {
                Image(systemName: "book.closed.fill")
                    .font(.system(size: width * 0.25))
                    .foregroundStyle(accent.opacity(0.6))
                Text(title)
                    .font(.system(size: 9, weight: .medium))
                    .foregroundStyle(LGColor.textMuted)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .padding(.horizontal, 4)
            }
        }
    }
}

#Preview("Book Cover") {
    HStack(spacing: 16) {
        // Placeholder mode (no image)
        BookCover(title: "Project Hail Mary", width: 80, height: 120)
        // Placeholder with different accent
        BookCover(title: "The Martian", width: 80, height: 120, accent: LGColor.accentBlue)
        // Image mode (remote URL — will show placeholder until loaded)
        BookCover(
            title: "Dune",
            imageURL: URL(string: "https://d1pfm520aduift.cloudfront.net/images/books/1984820710.webp"),
            width: 80,
            height: 120,
            accent: LGColor.accentGreen
        )
    }
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}
