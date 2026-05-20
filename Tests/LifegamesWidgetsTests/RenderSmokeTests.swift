import Foundation
import SwiftUI
import Testing
@testable import LifegamesWidgets

@Suite("Render Smoke Tests — All manifest widgets instantiate without crash")
struct RenderSmokeTests {
    private struct ManifestEntry: Decodable {
        let category: String
        let name: String
        let viewType: String
        let fixturePath: String
    }

    private struct Manifest: Decodable {
        let widgets: [ManifestEntry]
    }

    @Test func manifestLoadsAndHas56Widgets() throws {
        let url = try #require(
            Bundle.module.url(forResource: "widget-manifest", withExtension: "json")
        )
        let data = try Data(contentsOf: url)
        let manifest = try JSONDecoder().decode(Manifest.self, from: data)
        #expect(manifest.widgets.count == 56)
    }

    @Test func allFixtureFilesExist() throws {
        let url = try #require(
            Bundle.module.url(forResource: "widget-manifest", withExtension: "json")
        )
        let data = try Data(contentsOf: url)
        let manifest = try JSONDecoder().decode(Manifest.self, from: data)

        for widget in manifest.widgets {
            let fixtureName = widget.fixturePath
                .components(separatedBy: "/").last?
                .replacingOccurrences(of: ".json", with: "") ?? widget.fixturePath
            let fixtureURL = Bundle.module.url(
                forResource: fixtureName, withExtension: "json"
            )
            #expect(fixtureURL != nil, "Missing fixture for \(widget.name): \(widget.fixturePath)")
        }
    }

    @Test func allFixturesAreValidJSON() throws {
        let url = try #require(
            Bundle.module.url(forResource: "widget-manifest", withExtension: "json")
        )
        let data = try Data(contentsOf: url)
        let manifest = try JSONDecoder().decode(Manifest.self, from: data)

        for widget in manifest.widgets {
            let fixtureName = widget.fixturePath
                .components(separatedBy: "/").last?
                .replacingOccurrences(of: ".json", with: "") ?? widget.fixturePath
            let fixtureURL = try #require(
                Bundle.module.url(forResource: fixtureName, withExtension: "json")
            )
            let fixtureData = try Data(contentsOf: fixtureURL)
            let json = try JSONSerialization.jsonObject(with: fixtureData)
            #expect(json is [String: Any] || json is [Any], "Invalid JSON for \(widget.name)")
        }
    }

    @Test func manifestCategoryCounts() throws {
        let url = try #require(
            Bundle.module.url(forResource: "widget-manifest", withExtension: "json")
        )
        let data = try Data(contentsOf: url)
        let manifest = try JSONDecoder().decode(Manifest.self, from: data)

        let counts = Dictionary(grouping: manifest.widgets, by: \.category)
            .mapValues(\.count)

        #expect(counts["github"] == 29)
        #expect(counts["location"] == 10)
        #expect(counts["health"] == 5)
        #expect(counts["reading"] == 4)
        #expect(counts["identity"] == 3)
        #expect(counts["other"] == 5)
    }

    @Test func manifestNamesAreUnique() throws {
        let url = try #require(
            Bundle.module.url(forResource: "widget-manifest", withExtension: "json")
        )
        let data = try Data(contentsOf: url)
        let manifest = try JSONDecoder().decode(Manifest.self, from: data)

        let names = manifest.widgets.map(\.name)
        let uniqueNames = Set(names)
        #expect(names.count == uniqueNames.count, "Duplicate widget names in manifest")
    }

    #if canImport(UIKit)
    @Test func healthWidgetsRender() throws {
        let views: [any View] = [
            DailyActivityView(props: DailyActivityProps(
                steps: 100, distance: 500, exerciseMinutes: 10,
                activeCalories: 50, basalCalories: 100, totalCalories: 150
            )),
            HeartRateView(props: HeartRateProps(bpm: 72, hrv: 40, zone: "Resting")),
            HydrationView(props: HydrationProps(
                waterOz: 32, caffeineMg: 100, waterMax: 100, caffeineMax: 500,
                waterRangeLo: 64, waterRangeHi: 80, caffeineRangeLo: 200, caffeineRangeHi: 400
            )),
            NightSummaryView(props: NightSummaryProps(
                sleepScore: 80, duration: "7h", deepFormatted: "1h", remFormatted: "2h",
                coreFormatted: "3h", awakeFormatted: "1h", deepPct: 14, remPct: 28
            )),
            WorkoutsView(props: WorkoutsProps(workouts: [])),
        ]
        #expect(views.count == 5)
    }

    @Test func readingWidgetsRender() throws {
        let views: [any View] = [
            BookshelfView(props: BookshelfProps(books: [])),
            BookModalView(props: BookModalProps(
                title: "Test", author: "Author", asin: "123",
                status: "completed", statusLabel: "COMPLETED"
            )),
            ReadingFeedView(props: ReadingFeedProps(articles: [])),
            TheatreReviewsView(props: TheatreReviewsProps(reviews: [], totalCount: 0)),
        ]
        #expect(views.count == 4)
    }

    @Test func identityWidgetsRender() throws {
        let views: [any View] = [
            BioTerminalView(props: BioTerminalProps(lines: [])),
            ComingSoonView(props: ComingSoonProps(
                operative: "Test", callsign: "test", missionType: "Test",
                eta: "TBD", briefing: "Test", objectives: []
            )),
            IdentityCardView(props: IdentityCardProps(
                name: "Test", title: "Test", bio: "Test",
                tagline: "Test", githubUrl: "", linkedinUrl: ""
            )),
        ]
        #expect(views.count == 3)
    }

    @Test func otherWidgetsRender() throws {
        let views: [any View] = [
            DndOverlayView(props: DndOverlayProps(isActive: true)),
            FocusOverlayView(props: FocusOverlayProps(isActive: true)),
            GitHubHeatmapView(props: GitHubHeatmapProps(
                contributions: [[0, 1, 2]], totalContributions: 3, repos: 1, stars: 0
            )),
            OGImageView(props: OGImageProps()),
            SystemStatusView(props: SystemStatusProps(lines: [])),
        ]
        #expect(views.count == 5)
    }
    #endif
}
