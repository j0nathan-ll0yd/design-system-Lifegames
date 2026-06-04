import Foundation

extension WidgetCatalog {
    static var githubEntries: [WidgetEntry] {
        [
            ActivityFeedVariations.entry,
            CommitLogVariations.entry,
            CommitTimelineVariations.entry,
            DevActivityCardsVariations.entry,
            DevActivityLogVariations.entry,
            DevActivityTimelineVariations.entry,
            LanguageBarsVariations.entry,
            LanguageStackVariations.entry,
            PinnedReposVariations.entry,
            StarredRepoListVariations.entry,
            WeeklyPulseVariations.entry,
        ]
    }
}
