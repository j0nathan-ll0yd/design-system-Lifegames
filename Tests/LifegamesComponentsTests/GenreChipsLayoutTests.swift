import LifegamesComponents
import SwiftUI
import Testing
import ViewInspector

/// Behavioral assertions for `GenreChips`. In a column too narrow for one row, the last chip was
/// squeezed until it truncated ("Communica…") or broke mid-word at AX3 ("Communicat / ion").
@Suite("GenreChips — narrow columns")
@MainActor
struct GenreChipsLayoutTests {
    private static let genres = ["Psychology", "Communication"]

    @Test func oneRowFallsBackToFlowingRows() throws {
        let chips = try GenreChips(genres: Self.genres).inspect()
        let fits = try chips.find(ViewType.ViewThatFits.self)
        #expect((try? fits.hStack(0)) != nil, "the single row is tried first")
        // The second choice is the wrapping FlowLayout, which holds the same chips.
        for genre in Self.genres {
            #expect((try? fits.find(text: genre)) != nil, "\(genre)")
        }
    }

    @Test(arguments: [false, true])
    func everyChipIsSizedToItsWholeLabel(wraps: Bool) throws {
        let chips = try GenreChips(genres: Self.genres, wraps: wraps).inspect()
        for genre in Self.genres {
            let chip = try chips.find(text: genre)
            #expect(try chip.fixedSize() == (horizontal: true, vertical: true), "\(genre) never truncates or breaks")
        }
    }

    @Test func wrappingChipsDoNotNeedTheOneRowChoice() throws {
        let chips = try GenreChips(genres: Self.genres, wraps: true).inspect()
        #expect((try? chips.find(ViewType.ViewThatFits.self)) == nil)
    }
}
