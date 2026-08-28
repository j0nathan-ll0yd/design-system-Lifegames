import LifegamesTokens
import SwiftUI

// MARK: - BookCoverTile

/// Book cover tile for the bento grid.
///
/// Renders the book cover via `AsyncImage` with `.aspectRatio(contentMode: .fill)`.
/// A thin amber progress strip is pinned to the bottom edge (width proportional to `progress`),
/// with a percentage label. Falls back to an amber gradient "spine" placeholder when the
/// cover URL is nil or the image fails to load.
public struct BookCoverTile: View {
    public let coverURL: URL?
    public let progress: Double

    public init(coverURL: URL?, progress: Double) {
        self.coverURL = coverURL
        self.progress = progress
    }

    /// Clamped progress in [0, 1].
    private var clampedProgress: Double {
        min(max(progress, 0), 1)
    }

    public var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .bottom) {
                coverImage(width: geo.size.width, height: geo.size.height)
                progressStrip(totalWidth: geo.size.width)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Book cover")
        .accessibilityValue("\(Int(clampedProgress * 100)) percent read")
    }

    // MARK: - Cover image or placeholder

    @ViewBuilder
    private func coverImage(width: CGFloat, height: CGFloat) -> some View {
        if let url = coverURL {
            AsyncImage(url: url) { phase in
                switch phase {
                case let .success(image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: width, height: height)
                        .clipped()
                case .failure:
                    spinePlaceholder(width: width, height: height)
                case .empty:
                    spinePlaceholder(width: width, height: height)
                @unknown default:
                    spinePlaceholder(width: width, height: height)
                }
            }
        } else {
            spinePlaceholder(width: width, height: height)
        }
    }

    private func spinePlaceholder(width: CGFloat, height: CGFloat) -> some View {
        LinearGradient(
            colors: [
                LGColor.accentAmber.opacity(0.5),
                LGColor.accentAmber.opacity(0.15),
                LGColor.surfaceDeep,
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .frame(width: width, height: height)
        .overlay(
            Image(systemName: "book.fill")
                .font(.system(size: 28))
                .foregroundStyle(LGColor.accentAmber.opacity(0.5))
        )
    }

    // MARK: - Progress strip

    private func progressStrip(totalWidth: CGFloat) -> some View {
        VStack(spacing: 0) {
            // Percentage label sits just above the strip
            HStack {
                Spacer()
                Text("\(Int(clampedProgress * 100))%")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundStyle(LGColor.accentAmber)
                    .padding(.horizontal, Spacing.s150)
                    .padding(.vertical, Spacing.s50)
                    .background(LGColor.surfaceDeep.opacity(0.8))
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                    .padding(.trailing, Spacing.s200)
            }
            .padding(.bottom, Spacing.s100)

            // Filled amber strip
            ZStack(alignment: .leading) {
                Rectangle()
                    .fill(LGColor.textMuted.opacity(0.12))
                    .frame(height: 3)
                Rectangle()
                    .fill(LGColor.accentAmber)
                    .frame(width: totalWidth * clampedProgress, height: 3)
            }
        }
    }
}

// MARK: - Previews

#if os(iOS)
    #Preview("Book Cover Tile — With Cover") {
        BookCoverTile(
            coverURL: URL(string: "https://d1pfm520aduift.cloudfront.net/images/books/B07QVH2Q2K.webp"),
            progress: 0.68
        )
        .frame(width: 120, height: 160)
        .padding()
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
    }

    #Preview("Book Cover Tile — Placeholder") {
        BookCoverTile(coverURL: nil, progress: 0.35)
            .frame(width: 120, height: 160)
            .padding()
            .background(LGColor.surfaceBase)
            .preferredColorScheme(.dark)
    }
#endif
