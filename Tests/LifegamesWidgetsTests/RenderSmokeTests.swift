import Foundation
import SwiftUI
import Testing
@testable import LifegamesWidgets

// covers: widget-contract#Every manifest widget has a fixture on disk and instantiates without crashing
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

    @Test func manifestLoadsAndHas32Widgets() throws {
        let url = try #require(
            Bundle.module.url(forResource: "widget-manifest", withExtension: "json")
        )
        let data = try Data(contentsOf: url)
        let manifest = try JSONDecoder().decode(Manifest.self, from: data)
        #expect(manifest.widgets.count == 32)
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

        #expect(counts["github"] == 11)
        #expect(counts["location"] == 2)
        #expect(counts["health"] == 5)
        #expect(counts["reading"] == 4)
        #expect(counts["identity"] == 3)
        #expect(counts["other"] == 7)
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

    // MARK: - Instantiation
    //
    // These cases construct each widget from props. They used to sit behind `#if canImport(UIKit)`,
    // which meant 100% of them were COMPILED OUT on the lane that gates: CI runs `swift test` on
    // macOS (`.github/workflows/ci.yml` test-swift; Package.swift declares `.macOS(.v14)`), where
    // UIKit is not importable. `swift test list --filter RenderSmoke` returned five identifiers and
    // none of these. Nothing here needs UIKit, and with the guard deleted the suite runs in 0.010s
    // on macOS with no simulator and no destination change — so the guard was buying nothing and
    // costing everything.
    //
    // WHAT THIS PROVES, precisely: that each `init(props:)` runs without trapping. It is NOT a render
    // proof. SwiftUI never evaluates `body` by construction — a view whose `body` calls `fatalError`
    // constructs fine — and every `init(props:)` in this target is assignment plus a ternary. The
    // value is a compile-time contract check (each Props initializer still accepts what the suite
    // hands it) plus a cheap trap guard. `widgetsCoverTheManifest` below is what keeps the coverage
    // claim honest.

    /// Manifest widgets with no instantiation case here, and why. Both live in
    /// `Sources/LifegamesWidgetsWatch/`, a different SPM target that this suite does not import —
    /// covering them needs a watch test target, not another line in this file. Named rather than
    /// silently absent so `widgetsCoverTheManifest` can hold the rest to a total.
    static let notInstantiableHere: Set<String> = ["DiagnosticsMonitor", "SyncStatus"]

    /// Every widget an instantiation case below constructs.
    static let instantiated: Set<String> = [
        // health
        "HeartRate", "Hydration", "MovementRings", "NightSummary", "Workouts",
        // reading
        "BookModal", "Bookshelf", "ReadingFeed", "TheatreReviews",
        // identity
        "BioTerminal", "ComingSoon", "IdentityCard",
        // other
        "DndOverlay", "FocusOverlay", "GitHubHeatmap", "OGImage", "SystemStatus",
        // github
        "ActivityFeed", "CommitLog", "CommitTimeline", "DevActivityCards", "DevActivityLog",
        "DevActivityTimeline", "LanguageBars", "LanguageStack", "PinnedRepos", "StarredRepoList",
        "WeeklyPulse",
        // location
        "ExplorationOdometer", "PlaceLeaderboard",
    ]

    /// The reconciliation the instantiation half was missing. The cases hand-list their widgets —
    /// Swift cannot construct a type from a manifest string without a registry that would itself be
    /// hand-written — so the LIST is checked against the manifest instead. A widget added to the
    /// manifest with no instantiation case now REDS here rather than being quietly uncovered, which
    /// is how the pass drifted to 16 of 32 in the first place.
    @Test func widgetsCoverTheManifest() throws {
        let url = try #require(
            Bundle.module.url(forResource: "widget-manifest", withExtension: "json")
        )
        let data = try Data(contentsOf: url)
        let manifest = try JSONDecoder().decode(Manifest.self, from: data)
        let manifestNames = Set(manifest.widgets.map(\.name))

        let uncovered = manifestNames.subtracting(Self.instantiated).subtracting(Self.notInstantiableHere)
        #expect(
            uncovered.isEmpty,
            "Manifest widgets with no instantiation case: \(uncovered.sorted().joined(separator: ", ")). Add a case above, or — if the view lives in another target — name it in notInstantiableHere with a reason."
        )

        let phantom = Self.instantiated.union(Self.notInstantiableHere).subtracting(manifestNames)
        #expect(
            phantom.isEmpty,
            "Named here but not in the manifest: \(phantom.sorted().joined(separator: ", ")). A stale name reads as covered."
        )
    }

    @MainActor
    @Test func healthWidgetsRender() throws {
        let views: [any View] = [
            HeartRateView(props: HeartRateProps(bpm: 72, hrv: 40, zone: "Resting")),
            MovementRingsView(props: MovementRingsProps(
                moveKcal: 420, exerciseMin: 22, standHr: 9, steps: 8000,
                distanceMeters: 6200, flights: 7, daylightMin: 35
            )),
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

    @MainActor
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

    @MainActor
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

    @MainActor
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

    @MainActor
    @Test func githubWidgetsRender() throws {
        let views: [any View] = [
            ActivityFeedView(props: ActivityFeedProps(events: [])),
            CommitLogView(props: CommitLogProps(commits: [])),
            CommitTimelineView(props: CommitTimelineProps(commits: [])),
            DevActivityCardsView(props: DevActivityProps(events: [])),
            DevActivityLogView(props: DevActivityProps(events: [])),
            DevActivityTimelineView(props: DevActivityProps(events: [])),
            LanguageBarsView(props: LanguageBarsProps(languages: [])),
            LanguageStackView(props: LanguageBarsProps(languages: [])),
            PinnedReposView(props: PinnedReposProps(repos: [])),
            StarredRepoListView(props: StarredRepoListProps(repos: [])),
            WeeklyPulseView(props: WeeklyPulseProps(weeks: [], maxWeek: 0)),
        ]
        #expect(views.count == 11)
    }

    @MainActor
    @Test func locationWidgetsRender() throws {
        let views: [any View] = [
            ExplorationOdometerView(
                totalVisits: 0, totalPlaces: 0, citiesVisited: 0, totalStates: 0, currentCity: nil
            ),
            PlaceLeaderboardView(places: []),
        ]
        #expect(views.count == 2)
    }
}
