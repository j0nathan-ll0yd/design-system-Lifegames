import Foundation
import Testing
@testable import LifegamesWidgets

@Suite("Contract Tests — Fixture JSON decodes into Props structs")
struct ContractTests {
    private func loadFixture(_ path: String) throws -> Data {
        let name = path.components(separatedBy: "/").last ?? path
        let url = try #require(
            Bundle.module.url(forResource: name, withExtension: "json")
        )
        return try Data(contentsOf: url)
    }

    // MARK: - GitHub (11 widgets, 7 with dedicated Props decode tests)

    @Test func activityFeedFixture() throws {
        let data = try loadFixture("github/activity-feed")
        let root = try JSONDecoder().decode(ActivityFeedFixture.self, from: data)
        #expect(!root.events.isEmpty)
        #expect(!root.events[0].repo.isEmpty)
    }

    @Test func commitLogFixture() throws {
        let data = try loadFixture("github/commit-log")
        let props = try JSONDecoder().decode(CommitLogProps.self, from: data)
        #expect(!props.commits.isEmpty)
    }

    @Test func commitTimelineFixture() throws {
        let data = try loadFixture("github/commit-timeline")
        let props = try JSONDecoder().decode(CommitTimelineProps.self, from: data)
        #expect(!props.commits.isEmpty)
    }

    @Test func languageBarsFixture() throws {
        let data = try loadFixture("github/language-bars")
        let props = try JSONDecoder().decode(LanguageBarsProps.self, from: data)
        #expect(!props.languages.isEmpty)
    }

    @Test func pinnedReposFixture() throws {
        let data = try loadFixture("github/pinned-repos")
        let props = try JSONDecoder().decode(PinnedReposProps.self, from: data)
        #expect(!props.repos.isEmpty)
    }

    @Test func starredRepoListFixture() throws {
        let data = try loadFixture("github/starred-repo-list")
        let props = try JSONDecoder().decode(StarredRepoListProps.self, from: data)
        #expect(!props.repos.isEmpty)
    }

    @Test func weeklyPulseFixture() throws {
        let data = try loadFixture("github/weekly-pulse")
        let props = try JSONDecoder().decode(WeeklyPulseProps.self, from: data)
        #expect(!props.weeks.isEmpty)
    }

    // MARK: - Location (2 widgets)

    @Test func locationFixtures() throws {
        let locationFiles = [
            "exploration-odometer-v3", "place-leaderboard-v3",
        ]
        for file in locationFiles {
            let data = try loadFixture("location/\(file)")
            #expect(data.count > 2, "Location fixture \(file) should have content")
        }
    }

    // MARK: - Health (5 widgets)

    @Test func dailyActivityFixture() throws {
        let data = try loadFixture("health/daily-activity")
        let root = try JSONDecoder().decode(HealthDailyActivityFixture.self, from: data)
        let q = root.health.quantities
        #expect(q.stepCount.value > 0)
        #expect(q.activeEnergyBurned.value > 0)
    }

    @Test func heartRateFixture() throws {
        let data = try loadFixture("health/heart-rate")
        let root = try JSONDecoder().decode(HealthHeartRateFixture.self, from: data)
        #expect(root.health.quantities.heartRate.value > 0)
    }

    @Test func hydrationFixture() throws {
        let data = try loadFixture("health/hydration")
        let root = try JSONDecoder().decode(HealthHydrationFixture.self, from: data)
        #expect(root.health.hydration.waterMax > 0)
    }

    @Test func nightSummaryFixture() throws {
        let data = try loadFixture("health/night-summary")
        let root = try JSONDecoder().decode(HealthNightSummaryFixture.self, from: data)
        #expect(root.health.sleepScore > 0)
    }

    @Test func workoutsFixture() throws {
        let data = try loadFixture("health/workouts")
        let root = try JSONDecoder().decode(HealthWorkoutsFixture.self, from: data)
        #expect(!root.health.workouts.isEmpty)
    }

    // MARK: - Reading (4 widgets)

    @Test func bookshelfFixture() throws {
        let data = try loadFixture("reading/bookshelf")
        let root = try JSONDecoder().decode(BookshelfFixture.self, from: data)
        #expect(!root.books.books.isEmpty)
    }

    @Test func bookModalFixture() throws {
        let data = try loadFixture("reading/book-modal")
        #expect(data.count > 2)
    }

    @Test func readingFeedFixture() throws {
        let data = try loadFixture("reading/reading-feed")
        let root = try JSONDecoder().decode(ReadingFeedFixture.self, from: data)
        #expect(!root.reading.articles.isEmpty)
    }

    @Test func theatreReviewsFixture() throws {
        let data = try loadFixture("reading/theatre-reviews")
        #expect(data.count > 2)
    }

    // MARK: - Identity (3 widgets)

    @Test func bioTerminalFixture() throws {
        let data = try loadFixture("identity/bio-terminal")
        let root = try JSONDecoder().decode(BioTerminalFixture.self, from: data)
        #expect(!root.profile.terminalLines.isEmpty)
    }

    @Test func comingSoonFixture() throws {
        let data = try loadFixture("identity/coming-soon")
        #expect(data.count > 2)
    }

    @Test func identityCardFixture() throws {
        let data = try loadFixture("identity/identity-card")
        #expect(data.count > 2)
    }

    // MARK: - Other (5 widgets)

    @Test func dndOverlayFixture() throws {
        let data = try loadFixture("other/dnd-overlay")
        #expect(data.count > 2)
    }

    @Test func focusOverlayFixture() throws {
        let data = try loadFixture("other/focus-overlay")
        #expect(data.count > 2)
    }

    @Test func githubHeatmapFixture() throws {
        let data = try loadFixture("other/github-heatmap")
        let root = try JSONDecoder().decode(GithubHeatmapFixture.self, from: data)
        #expect(!root.github.contributions.isEmpty)
    }

    @Test func ogImageFixture() throws {
        let data = try loadFixture("other/og-image")
        #expect(data.count > 2)
    }

    @Test func systemStatusFixture() throws {
        let data = try loadFixture("other/system-status")
        let root = try JSONDecoder().decode(SystemStatusFixture.self, from: data)
        #expect(!root.system.lines.isEmpty)
    }
}

// MARK: - Fixture Wrapper Types (match web JSON shape)

private struct ActivityFeedFixture: Decodable {
    let events: [ActivityFeedProps.Event]
}

private struct HealthDailyActivityFixture: Decodable {
    let health: HealthData
    struct HealthData: Decodable {
        let quantities: Quantities
        struct Quantities: Decodable {
            let stepCount: Quantity
            let distanceWalkingRunning: Quantity
            let exerciseTime: Quantity
            let activeEnergyBurned: Quantity
            let basalEnergyBurned: Quantity
        }
    }
}

private struct Quantity: Decodable {
    let value: Double
    let unit: String
}

private struct HealthHeartRateFixture: Decodable {
    let health: HealthData
    struct HealthData: Decodable {
        let quantities: Quantities
        struct Quantities: Decodable {
            let heartRate: Quantity
            let hrvSDNN: Quantity
        }
    }
}

private struct HealthHydrationFixture: Decodable {
    let health: HealthData
    struct HealthData: Decodable {
        let hydration: HydrationData
        struct HydrationData: Decodable {
            let waterOz: Int
            let waterMax: Int
            let waterRangeLo: Int
            let waterRangeHi: Int
            let caffeineMg: Int
            let caffeineMax: Int
            let caffeineRangeLo: Int
            let caffeineRangeHi: Int
        }
    }
}

private struct HealthNightSummaryFixture: Decodable {
    let health: HealthData
    struct HealthData: Decodable {
        let sleepScore: Int
    }
}

private struct HealthWorkoutsFixture: Decodable {
    let health: HealthData
    struct HealthData: Decodable {
        let workouts: [WorkoutEntry]
        struct WorkoutEntry: Decodable {
            let activity_type: String
            let duration: Int
            let energy_burned: Int
            let distance: Int
        }
    }
}

private struct BookshelfFixture: Decodable {
    let books: BooksData
    struct BooksData: Decodable {
        let books: [BookEntry]
        struct BookEntry: Decodable {
            let asin: String
            let title: String
            let author: String
            let status: String
        }
    }
}

private struct ReadingFeedFixture: Decodable {
    let reading: ReadingData
    struct ReadingData: Decodable {
        let articles: [ArticleEntry]
        struct ArticleEntry: Decodable {
            let title: String
            let source: String
            let date: String
        }
    }
}

private struct BioTerminalFixture: Decodable {
    let profile: ProfileData
    struct ProfileData: Decodable {
        let terminalLines: [TerminalLineEntry]
        struct TerminalLineEntry: Decodable {
            let type: String
            let text: String?
        }
    }
}

private struct GithubHeatmapFixture: Decodable {
    let github: GithubData
    struct GithubData: Decodable {
        let contributions: [[Int]]
        let stats: Stats
        struct Stats: Decodable {
            let repos: Int
            let stars: Int
            let contributions: Int
        }
    }
}

private struct SystemStatusFixture: Decodable {
    let system: SystemData
    struct SystemData: Decodable {
        let lines: [StatusLineEntry]
        struct StatusLineEntry: Decodable {
            let key: String
            let value: String
            let dotClass: String
        }
    }
}
