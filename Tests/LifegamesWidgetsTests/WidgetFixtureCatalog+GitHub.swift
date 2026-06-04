import Foundation
@testable import LifegamesWidgets

extension WidgetFixtureCatalogTests {
    static var githubRows: [FixtureCatalogRow] {
        // All GitHub widgets decode directly — fixture wire shape matches Props type.
        // skeleton/empty fixtures also decode through init(props:) — no Kind discriminator needed.
        activityFeedRows
            + commitLogRows
            + commitTimelineRows
            + devActivityCardsRows
            + devActivityLogRows
            + devActivityTimelineRows
            + languageBarsRows
            + languageStackRows
            + pinnedReposRows
            + starredRepoListRows
            + weeklyPulseRows
    }

    // MARK: - ActivityFeed

    private static var activityFeedRows: [FixtureCatalogRow] {
        [
            "activity-feed",
            "activity-feed.populated-min",
            "activity-feed.populated-max",
            "activity-feed.burst-week",
            "activity-feed.new-contributor",
            "activity-feed.review-heavy-month",
            "activity-feed.skeleton",
            "activity-feed.empty",
        ].map { .row(ActivityFeedProps.self, category: "github", name: $0) }
    }

    // MARK: - CommitLog

    private static var commitLogRows: [FixtureCatalogRow] {
        [
            "commit-log",
            "commit-log.populated-min",
            "commit-log.populated-max",
            "commit-log.conventional-discipline",
            "commit-log.messy-history",
            "commit-log.refactor-sprint",
            "commit-log.skeleton",
            "commit-log.empty",
        ].map { .row(CommitLogProps.self, category: "github", name: $0) }
    }

    // MARK: - CommitTimeline

    private static var commitTimelineRows: [FixtureCatalogRow] {
        [
            "commit-timeline",
            "commit-timeline.populated-min",
            "commit-timeline.populated-max",
            "commit-timeline.gap-and-recovery",
            "commit-timeline.multi-repo-scatter",
            "commit-timeline.ninety-day-streak",
            "commit-timeline.skeleton",
            "commit-timeline.empty",
        ].map { .row(CommitTimelineProps.self, category: "github", name: $0) }
    }

    // MARK: - DevActivityCards

    private static var devActivityCardsRows: [FixtureCatalogRow] {
        [
            "dev-activity-cards",
            "dev-activity-cards.populated-min",
            "dev-activity-cards.populated-max",
            "dev-activity-cards.variation-a",
            "dev-activity-cards.variation-b",
            "dev-activity-cards.variation-c",
            "dev-activity-cards.skeleton",
            "dev-activity-cards.empty",
        ].map { .row(DevActivityProps.self, category: "github", name: $0) }
    }

    // MARK: - DevActivityLog

    private static var devActivityLogRows: [FixtureCatalogRow] {
        [
            "dev-activity-log",
            "dev-activity-log.populated-min",
            "dev-activity-log.populated-max",
            "dev-activity-log.bot-noise",
            "dev-activity-log.merge-marathon",
            "dev-activity-log.mixed-repos",
            "dev-activity-log.pr-burst",
            "dev-activity-log.quiet-day",
            "dev-activity-log.skeleton",
            "dev-activity-log.empty",
        ].map { .row(DevActivityProps.self, category: "github", name: $0) }
    }

    // MARK: - DevActivityTimeline

    private static var devActivityTimelineRows: [FixtureCatalogRow] {
        [
            "dev-activity-timeline",
            "dev-activity-timeline.populated-min",
            "dev-activity-timeline.populated-max",
            "dev-activity-timeline.variation-a",
            "dev-activity-timeline.variation-b",
            "dev-activity-timeline.variation-c",
            "dev-activity-timeline.skeleton",
            "dev-activity-timeline.empty",
        ].map { .row(DevActivityProps.self, category: "github", name: $0) }
    }

    // MARK: - LanguageBars

    private static var languageBarsRows: [FixtureCatalogRow] {
        [
            "language-bars",
            "language-bars.populated-min",
            "language-bars.populated-max",
            "language-bars.variation-a",
            "language-bars.variation-b",
            "language-bars.variation-c",
            "language-bars.skeleton",
            "language-bars.empty",
        ].map { .row(LanguageBarsProps.self, category: "github", name: $0) }
    }

    // MARK: - LanguageStack (uses LanguageBarsProps)

    private static var languageStackRows: [FixtureCatalogRow] {
        [
            "language-stack",
            "language-stack.populated-min",
            "language-stack.populated-max",
            "language-stack.variation-a",
            "language-stack.variation-b",
            "language-stack.variation-c",
            "language-stack.skeleton",
            "language-stack.empty",
        ].map { .row(LanguageBarsProps.self, category: "github", name: $0) }
    }

    // MARK: - PinnedRepos

    private static var pinnedReposRows: [FixtureCatalogRow] {
        [
            "pinned-repos",
            "pinned-repos.populated-min",
            "pinned-repos.populated-max",
            "pinned-repos.variation-a",
            "pinned-repos.variation-b",
            "pinned-repos.variation-c",
            "pinned-repos.skeleton",
            "pinned-repos.empty",
        ].map { .row(PinnedReposProps.self, category: "github", name: $0) }
    }

    // MARK: - StarredRepoList

    private static var starredRepoListRows: [FixtureCatalogRow] {
        [
            "starred-repo-list",
            "starred-repo-list.populated-min",
            "starred-repo-list.populated-max",
            "starred-repo-list.archived-mix",
            "starred-repo-list.freshly-starred",
            "starred-repo-list.one-language",
            "starred-repo-list.org-starred",
            "starred-repo-list.polyglot",
            "starred-repo-list.skeleton",
            "starred-repo-list.empty",
        ].map { .row(StarredRepoListProps.self, category: "github", name: $0) }
    }

    // MARK: - WeeklyPulse

    private static var weeklyPulseRows: [FixtureCatalogRow] {
        [
            "weekly-pulse",
            "weekly-pulse.populated-min",
            "weekly-pulse.populated-max",
            "weekly-pulse.variation-a",
            "weekly-pulse.variation-b",
            "weekly-pulse.variation-c",
            "weekly-pulse.skeleton",
            "weekly-pulse.empty",
        ].map { .row(WeeklyPulseProps.self, category: "github", name: $0) }
    }
}
