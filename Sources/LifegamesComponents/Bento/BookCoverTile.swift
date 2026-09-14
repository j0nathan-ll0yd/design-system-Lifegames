import LifegamesTokens
import SwiftUI

// MARK: - BookCoverTile

/// Book cover tile for the bento grid.
///
/// Renders the book cover with `.aspectRatio(contentMode: .fill)` from one of two sources,
/// and falls back to an amber gradient "spine" placeholder when neither yields an image.
/// A thin amber progress strip is pinned to the bottom edge (width proportional to `progress`),
/// with a percentage label.
///
/// ## Two sources, and why
///
/// ``init(coverImage:progress:)`` takes an ALREADY-LOADED image. It exists because a caller
/// whose images are private cannot hand this tile a URL: the bytes arrive over a
/// bearer-authenticated channel the tile has no credential for, so the caller must fetch and
/// decode them itself (atlas decision 0135). `AsyncImage` cannot express that.
///
/// ``init(coverURL:progress:)`` stays for callers whose images are public and anonymously
/// fetchable. It is unchanged, so every existing caller compiles untouched.
public struct BookCoverTile: View {
    public let coverURL: URL?
    public let coverImage: Image?
    public let progress: Double

    public init(coverURL: URL?, progress: Double) {
        self.coverURL = coverURL
        coverImage = nil
        self.progress = progress
    }

    /// Renders an image the caller has already fetched and decoded.
    public init(coverImage: Image?, progress: Double) {
        coverURL = nil
        self.coverImage = coverImage
        self.progress = progress
    }

    /// Which branch ``coverImage(width:height:)`` will render.
    ///
    /// Exposed so the branch decision can be asserted directly. A snapshot cannot serve as
    /// that evidence here: the baseline would be minted by the same change it verifies.
    enum CoverSource: Equatable {
        case image
        case remote(URL)
        case placeholder
    }

    /// A supplied image wins over a URL. Both initializers nil the other field, so the two
    /// can never both be set today; the precedence is stated anyway so a future memberwise
    /// initializer cannot make the branch ambiguous.
    var coverSource: CoverSource {
        if coverImage != nil {
            return .image
        }
        if let coverURL {
            return .remote(coverURL)
        }
        return .placeholder
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
        switch coverSource {
        case .image:
            if let coverImage {
                coverImage
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: width, height: height)
                    .clipped()
            }
        case let .remote(url):
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
        case .placeholder:
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
    // No remote-cover preview. The cover keys this tile used to preview against were retired
    // on 2026-08-27 (LP #250 moved `<asin>.webp` to `<asin>-<version>.webp`), and the prefix
    // they lived under is suppressed for unauthenticated callers whenever a hiding focus mode
    // is active (atlas decision 0135). Any URL written here renders broken and rots on the next
    // content change. A bundled sample asset is the right way to preview a filled tile; it is
    // deliberately not in this change.
    #Preview("Book Cover Tile — Placeholder") {
        BookCoverTile(coverImage: nil, progress: 0.35)
            .frame(width: 120, height: 160)
            .padding()
            .background(LGColor.surfaceBase)
            .preferredColorScheme(.dark)
    }
#endif
