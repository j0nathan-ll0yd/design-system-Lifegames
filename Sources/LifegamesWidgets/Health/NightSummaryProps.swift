import Foundation

public struct NightSummaryProps: Hashable, Codable, Sendable {
    public let sleepScore: Int
    public let duration: String
    public let deepFormatted: String
    public let remFormatted: String
    public let coreFormatted: String
    public let awakeFormatted: String
    public let deepPct: Int
    public let remPct: Int

    public init(
        sleepScore: Int, duration: String,
        deepFormatted: String, remFormatted: String,
        coreFormatted: String, awakeFormatted: String,
        deepPct: Int, remPct: Int
    ) {
        self.sleepScore = sleepScore
        self.duration = duration
        self.deepFormatted = deepFormatted
        self.remFormatted = remFormatted
        self.coreFormatted = coreFormatted
        self.awakeFormatted = awakeFormatted
        self.deepPct = deepPct
        self.remPct = remPct
    }
}
