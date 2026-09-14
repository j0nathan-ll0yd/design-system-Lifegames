@testable import LifegamesComponents
import SwiftUI
import XCTest

/// Which source `BookCoverTile` renders from, asserted as a value rather than as pixels.
///
/// A snapshot cannot be the evidence here. The baseline would be minted by the same change it
/// verifies, which is not acceptance evidence — and the defect this branch exists to fix
/// (atlas decision 0135) was invisible precisely because a failed cover and an absent cover
/// render identically. Pixels are the one thing that cannot tell these three cases apart.
final class BookCoverTileSourceTests: XCTestCase {
    func testSuppliedImageRendersTheImageBranch() {
        let tile = BookCoverTile(coverImage: Image(systemName: "book.fill"), progress: 0.5)
        XCTAssertEqual(tile.coverSource, .image)
    }

    func testNilImageFallsBackToThePlaceholderRatherThanAURL() {
        // The authenticated path supplies nil while the fetch is in flight, and permanently
        // when the object does not exist. Neither may silently fall back to an anonymous URL.
        let tile = BookCoverTile(coverImage: nil, progress: 0.5)
        XCTAssertEqual(tile.coverSource, .placeholder)
        XCTAssertNil(tile.coverURL)
    }

    func testURLInitializerStillRendersTheRemoteBranch() {
        let url = try! XCTUnwrap(URL(string: "https://example.invalid/cover.webp"))
        let tile = BookCoverTile(coverURL: url, progress: 0.5)
        XCTAssertEqual(tile.coverSource, .remote(url))
    }

    func testURLInitializerWithNoURLRendersThePlaceholder() {
        let tile = BookCoverTile(coverURL: nil, progress: 0.5)
        XCTAssertEqual(tile.coverSource, .placeholder)
    }

    /// The grid reads `bookCoverImage`; a caller that never sets it must keep the URL branch.
    func testHomeDataDefaultsToNoSuppliedImage() {
        XCTAssertNil(DatastreamHomeData.sample.bookCoverImage)
    }

    /// The sample's cover URL was retired on 2026-08-27 (LP #250 moved `<asin>.webp` to
    /// `<asin>-<version>.webp`) and its prefix is focus-suppressed for anonymous callers.
    /// Pinned so a future edit cannot reintroduce a URL that renders broken.
    func testHomeDataSampleCarriesNoDeadCoverURL() {
        XCTAssertNil(DatastreamHomeData.sample.bookCoverURL)
    }
}
