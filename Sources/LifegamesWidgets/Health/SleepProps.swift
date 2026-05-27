import Foundation

/// Props for `SleepView`.
///
/// Matches the production iOS sleep section: four phase capsules
/// (Core / Deep / REM / Awake), total duration, and an optional sleep score.
public struct SleepProps: Hashable, Codable, Sendable {
    /// Total time asleep, formatted (e.g. "7h 24m").
    public let duration: String
    /// Core sleep duration, formatted (e.g. "3h 32m").
    public let coreFormatted: String
    /// Deep sleep duration, formatted.
    public let deepFormatted: String
    /// REM sleep duration, formatted.
    public let remFormatted: String
    /// Time awake during the night, formatted.
    public let awakeFormatted: String
    /// Optional sleep score (0...100). `nil` hides the score row.
    public let sleepScore: Int?

    public init(
        duration: String,
        coreFormatted: String,
        deepFormatted: String,
        remFormatted: String,
        awakeFormatted: String,
        sleepScore: Int?
    ) {
        self.duration = duration
        self.coreFormatted = coreFormatted
        self.deepFormatted = deepFormatted
        self.remFormatted = remFormatted
        self.awakeFormatted = awakeFormatted
        self.sleepScore = sleepScore
    }
}
