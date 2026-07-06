import XCTest

/// Accessibility-tree audit for `DatastreamHomeGrid`'s `onSelect` wiring: with a
/// selection handler attached, each bento tile must surface as exactly ONE actionable
/// element carrying the button trait (BentoTileView combines its children and labels
/// the element with the tile title).
final class BentoTileAccessibilityUITests: XCTestCase {
    @MainActor
    func testEachBentoTileIsExactlyOneButtonElement() throws {
        let app = XCUIApplication()
        app.launch()

        app.staticTexts["Screens"].firstMatch.tap()

        let homeBentoRow = app.staticTexts["Home · Datastream"].firstMatch
        XCTAssertTrue(homeBentoRow.waitForExistence(timeout: 5), "Screens catalog should list Home · Datastream")
        homeBentoRow.tap()

        for title in ["Health", "Location", "Books", "Caffeine", "Settings"] {
            let tileButtons = app.buttons.matching(NSPredicate(format: "label == %@", title))
            XCTAssertTrue(
                tileButtons.firstMatch.waitForExistence(timeout: 5),
                "\(title) tile should expose the button trait with label '\(title)'"
            )
            XCTAssertEqual(
                tileButtons.count, 1,
                "\(title) tile should be exactly one actionable element, found \(tileButtons.count)"
            )
        }
    }
}
