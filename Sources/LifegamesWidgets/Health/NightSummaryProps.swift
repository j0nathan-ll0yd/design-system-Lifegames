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

public extension NightSummaryProps {
    /// Build a NightSummaryProps from raw sleep-stage durations.
    ///
    /// Mirrors the web runtime contract in `@lifegames/web/runtime/sleep.ts`:
    /// `duration` and the phase-percentage denominator are `core + deep + rem`
    /// — **awake is NEVER counted as sleep**. Consumers (iOS app, watch app,
    /// design gallery, screenshots) must go through this factory so the rule
    /// can't drift.
    static func from(
        sleepScore: Int,
        coreSeconds: TimeInterval,
        deepSeconds: TimeInterval,
        remSeconds: TimeInterval,
        awakeSeconds: TimeInterval
    ) -> NightSummaryProps {
        let totalSleep = coreSeconds + deepSeconds + remSeconds
        return NightSummaryProps(
            sleepScore: sleepScore,
            duration: SleepDuration.format(totalSleep),
            deepFormatted: SleepDuration.format(deepSeconds),
            remFormatted: SleepDuration.format(remSeconds),
            coreFormatted: SleepDuration.format(coreSeconds),
            awakeFormatted: SleepDuration.format(awakeSeconds),
            deepPct: SleepDuration.percentage(deepSeconds, of: totalSleep),
            remPct: SleepDuration.percentage(remSeconds, of: totalSleep)
        )
    }

    /// Returns true iff there is any actual sleep (core+deep+rem > 0).
    /// Use this to decide between `.populated` and `.empty` widget states —
    /// a night that is 100% awake should render as `.empty`, matching the web.
    static func hasSleep(
        coreSeconds: TimeInterval,
        deepSeconds: TimeInterval,
        remSeconds: TimeInterval
    ) -> Bool {
        coreSeconds + deepSeconds + remSeconds > 0
    }
}

enum SleepDuration {
    static func format(_ seconds: TimeInterval) -> String {
        let hours = Int(seconds) / 3600
        let minutes = (Int(seconds) % 3600) / 60
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        }
        return "\(minutes)m"
    }

    static func percentage(_ part: TimeInterval, of total: TimeInterval) -> Int {
        guard total > 0 else { return 0 }
        return Int((part / total * 100).rounded())
    }
}
