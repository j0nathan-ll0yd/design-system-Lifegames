import Foundation
import Testing
@testable import LifegamesSchemas

@Suite("WidgetModels Decode")
struct WidgetModelsDecodeTests {
    @Test func workoutsExportDecodes() throws {
        let json = """
        {
            "date": "2026-06-06",
            "generatedAt": "2026-06-06T12:00:00Z",
            "workouts": [
                {
                    "activityType": "Running",
                    "duration": 1800.0,
                    "energyBurned": 350.0,
                    "distance": 5000.0,
                    "source": "Apple Watch"
                }
            ]
        }
        """
        let data = try #require(json.data(using: .utf8))
        let export = try JSONDecoder().decode(WorkoutsExport.self, from: data)
        #expect(export.workouts.count == 1)
        #expect(export.workouts[0].activityType == "Running")
        #expect(export.workouts[0].source == "Apple Watch")
    }

    @Test func focusExportDecodes() throws {
        let json = """
        {
            "currentFocus": "Deep Work",
            "generatedAt": "2026-06-06T12:00:00Z"
        }
        """
        let data = try #require(json.data(using: .utf8))
        let export = try JSONDecoder().decode(FocusExport.self, from: data)
        #expect(export.currentFocus == "Deep Work")
        #expect(!export.generatedAt.isEmpty)
    }

    @Test func booksExportDecodes() throws {
        let json = """
        {
            "generatedAt": "2026-06-06T12:00:00Z",
            "books": [
                {
                    "asin": "B08N5WRWNW",
                    "author": "Test Author",
                    "title": "Test Book"
                }
            ]
        }
        """
        let data = try #require(json.data(using: .utf8))
        let export = try JSONDecoder().decode(BooksExport.self, from: data)
        #expect(export.books.count == 1)
        #expect(export.books[0].asin == "B08N5WRWNW")
    }
}
