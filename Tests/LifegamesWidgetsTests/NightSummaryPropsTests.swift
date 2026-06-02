import Foundation
import Testing
@testable import LifegamesWidgets

/// Pins the awake-exclusion contract on the Swift side. Mirrors
/// `packages/web/tests/runtime/sleep.test.ts` so iOS and web cannot drift.
///
/// Invariant: `core + deep + rem` is "sleep". Awake time is "in bed but not
/// asleep" and MUST NOT contribute to the headline duration or to the
/// phase-percentage denominator.
@Suite("NightSummaryProps — awake exclusion contract")
struct NightSummaryPropsTests {
    // MARK: - Duration

    @Test func duration_sumsCoreDeepRem_excludesAwake() {
        let props = NightSummaryProps.from(
            sleepScore: 80,
            coreSeconds: 4 * 3600,
            deepSeconds: 1 * 3600 + 30 * 60,
            remSeconds: 1 * 3600 + 30 * 60,
            awakeSeconds: 99 * 3600 // huge awake — must be ignored
        )
        #expect(props.duration == "7h 0m")
    }

    @Test func duration_isZero_whenOnlyAwake() {
        let props = NightSummaryProps.from(
            sleepScore: 0,
            coreSeconds: 0,
            deepSeconds: 0,
            remSeconds: 0,
            awakeSeconds: 9999
        )
        #expect(props.duration == "0m")
    }

    @Test func duration_formatsTypicalNight() {
        // 7h 22m of actual sleep, 38m awake
        let props = NightSummaryProps.from(
            sleepScore: 85,
            coreSeconds: 5 * 3600,
            deepSeconds: 1 * 3600,
            remSeconds: 1 * 3600 + 22 * 60,
            awakeSeconds: 38 * 60
        )
        #expect(props.duration == "7h 22m")
    }

    // MARK: - Phase formatting

    @Test func phaseFormatters_useShortMinutesForSubHour() {
        let props = NightSummaryProps.from(
            sleepScore: 0,
            coreSeconds: 0, deepSeconds: 30 * 60, remSeconds: 0, awakeSeconds: 0
        )
        #expect(props.deepFormatted == "30m")
    }

    @Test func phaseFormatters_useHoursMinutesAtOrAboveOneHour() {
        let props = NightSummaryProps.from(
            sleepScore: 0,
            coreSeconds: 3600 + 45 * 60,
            deepSeconds: 0, remSeconds: 0, awakeSeconds: 0
        )
        #expect(props.coreFormatted == "1h 45m")
    }

    @Test func awakeFormatted_stillRenders_evenThoughItIsExcludedFromTotal() {
        // Awake is excluded from `duration` but must still be shown to the user.
        let props = NightSummaryProps.from(
            sleepScore: 80,
            coreSeconds: 3600, deepSeconds: 0, remSeconds: 0,
            awakeSeconds: 45 * 60
        )
        #expect(props.awakeFormatted == "45m")
        #expect(props.duration == "1h 0m")
    }

    // MARK: - Percentages

    @Test func percentages_denominatorExcludesAwake() {
        // Awake = 99999s would crater all percentages if it leaked into the denominator.
        let props = NightSummaryProps.from(
            sleepScore: 0,
            coreSeconds: 0, deepSeconds: 1800, remSeconds: 1800,
            awakeSeconds: 99_999
        )
        #expect(props.deepPct == 50)
        #expect(props.remPct == 50)
    }

    @Test func percentages_zeroWhenNoSleep() {
        let props = NightSummaryProps.from(
            sleepScore: 0,
            coreSeconds: 0, deepSeconds: 0, remSeconds: 0,
            awakeSeconds: 3600
        )
        #expect(props.deepPct == 0)
        #expect(props.remPct == 0)
    }

    @Test func percentages_roundToNearestInteger() {
        // 1:1:1 split → 33/33/33 (not 34 by truncation)
        let props = NightSummaryProps.from(
            sleepScore: 0,
            coreSeconds: 1, deepSeconds: 1, remSeconds: 1,
            awakeSeconds: 0
        )
        #expect(props.deepPct == 33)
        #expect(props.remPct == 33)
    }

    // MARK: - hasSleep gate

    @Test func hasSleep_trueWhenAnyPhaseNonzero() {
        #expect(NightSummaryProps.hasSleep(coreSeconds: 1, deepSeconds: 0, remSeconds: 0))
        #expect(NightSummaryProps.hasSleep(coreSeconds: 0, deepSeconds: 1, remSeconds: 0))
        #expect(NightSummaryProps.hasSleep(coreSeconds: 0, deepSeconds: 0, remSeconds: 1))
    }

    @Test func hasSleep_falseWhenAllPhasesZero() {
        // Awake-only nights must NOT count as sleep — they render as `.empty`.
        #expect(!NightSummaryProps.hasSleep(coreSeconds: 0, deepSeconds: 0, remSeconds: 0))
    }
}
