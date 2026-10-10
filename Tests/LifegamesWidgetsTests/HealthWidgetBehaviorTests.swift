import LifegamesComponents
import SwiftUI
import Testing
import ViewInspector
@testable import LifegamesWidgets

/// Behavioral assertions for every `HealthWidgetSnapshotTests` state. A snapshot image is a
/// self-minted baseline: it proves the pixels did not move, not that they show the right state.
/// Each test here names the rendered text that tells its state apart from its siblings, and the
/// text that must be ABSENT, so a view that renders the wrong branch fails here even when a
/// re-recorded image would bless it.
@Suite("Health widget states — behavioral")
@MainActor
struct HealthWidgetBehaviorTests {
    // MARK: - HeartRate

    @Test func heartRateLoadingShowsChromeOnly() throws {
        #expect(try renderedText(HeartRateView(state: .loading)) == ["HEART RATE", "live"])
    }

    @Test func heartRateEmptyShowsNoDataMessage() throws {
        let text = try renderedText(HeartRateView(state: .empty))
        #expect(text == ["HEART RATE", "live", "No heart rate data"])
        #expect(!text.contains("BPM"))
    }

    // One test per snapshot state, named after it. `HeartRateZone` is not Sendable, so it cannot
    // be a parameterized-test argument.
    @Test func heartRateBradycardiaShowsBradycardiaZone() throws {
        try expectPopulatedHeartRate(HealthWidgetStates.heartRateBradycardia, zone: .bradycardia)
    }

    @Test func heartRateRestingShowsRestingZone() throws {
        try expectPopulatedHeartRate(HealthWidgetStates.heartRateResting, zone: .restingZone)
    }

    @Test func heartRateNormalShowsNormalZone() throws {
        try expectPopulatedHeartRate(HealthWidgetStates.heartRateNormal, zone: .normalZone)
    }

    @Test func heartRateFatBurnShowsFatBurnZone() throws {
        try expectPopulatedHeartRate(HealthWidgetStates.heartRateFatBurn, zone: .fatBurn)
    }

    @Test func heartRatePeakShowsPeakZone() throws {
        try expectPopulatedHeartRate(HealthWidgetStates.heartRatePeak, zone: .peakZone)
    }

    /// The zone comes from `bpm`, never from the legacy `zone` prop: 42 bpm is labelled
    /// "resting" in props and must still render as bradycardia.
    private func expectPopulatedHeartRate(_ props: HeartRateProps, zone: HeartRateZone) throws {
        let bpm = try #require(props.bpm)
        let hrv = try #require(props.hrv)
        #expect(HeartRateZone.classify(bpm: bpm) == zone)
        #expect(props.heartRateZone == zone)
        let text = try renderedText(HeartRateView(props: props, animateECG: false))
        #expect(text.contains("\(bpm)"))
        #expect(text.contains("\(hrv)"))
        // A reading fills the bpm, zone and HRV slots; only the footer vitals may show the mark.
        #expect(Array(text.prefix(8)) == ["HEART RATE", "live", "\(bpm)", "BPM", zone.name, "HRV", "\(hrv)", "ms"])
        #expect(text.contains(zone.name))
        let otherZones = [HeartRateZone.bradycardia, .restingZone, .normalZone, .fatBurn, .peakZone]
            .filter { $0 != zone }
        for other in otherZones {
            #expect(!text.contains(other.name), "\(bpm) bpm must not render \(other.name)")
        }
        #expect(!text.contains("No heart rate data"))
    }

    // MARK: - Hydration

    @Test func hydrationLoadingShowsChromeOnly() throws {
        #expect(try renderedText(HydrationView(state: .loading)) == ["HYDRATION", "today"])
    }

    @Test func hydrationEmptyRendersTheNoReadingMarkNotZero() throws {
        // No measurement is not a measurement of zero (atlas decision 0160, #289): the empty
        // state draws empty vessels and the no-reading mark, never "0 oz" / "0 mg".
        let view = HydrationView(state: .empty)
        let text = try renderedText(view)
        #expect(text == ["HYDRATION", "today", NoReading.mark, "Water", NoReading.mark, "Caffeine"])
        #expect(!text.contains("0 oz"))
        #expect(!text.contains("0 mg"))
        // VoiceOver reads the shared copy for the mark, never "dash".
        let marks = try view.inspect().findAll(ViewType.Text.self).filter { try $0.string() == NoReading.mark }
        #expect(marks.count == 2)
        for mark in marks {
            #expect(try mark.accessibilityLabel().string() == "No reading")
        }
    }

    @Test func hydrationPopulatedValuesCarryNoNoReadingLabel() throws {
        // The label is reserved for the mark: a real reading reads as itself.
        let values = try HydrationView(props: HealthWidgetStates.hydrationNormal).inspect()
            .findAll(ViewType.Text.self).filter { ["54 oz", "280 mg"].contains(try $0.string()) }
        #expect(values.count == 2)
        for value in values {
            #expect((try? value.accessibilityLabel().string()) != "No reading")
        }
    }

    @Test(arguments: [
        (HealthWidgetStates.hydrationNormal, 0.54, 0.56),
        (HealthWidgetStates.hydrationDehydrated, 0.12, 0.16),
        (HealthWidgetStates.hydrationOverhydrated, 1.0, 0.96),
    ])
    func hydrationPopulatedShowsReadingsAndFill(
        props: HydrationProps, waterFill: Double, caffeineFill: Double
    ) throws {
        #expect(try renderedText(HydrationView(props: props))
            == ["HYDRATION", "today", "\(props.waterOz) oz", "Water", "\(props.caffeineMg) mg", "Caffeine"])
        #expect(abs(props.waterPercent - waterFill) < 1e-9)
        #expect(abs(props.caffeinePercent - caffeineFill) < 1e-9)
    }

    @Test func hydrationFillClampsAtFull() {
        let over = HydrationProps(
            waterOz: 150, caffeineMg: 900, waterMax: 100, caffeineMax: 500,
            waterRangeLo: 64, waterRangeHi: 80, caffeineRangeLo: 200, caffeineRangeHi: 400
        )
        #expect(over.waterPercent == 1.0)
        #expect(over.caffeinePercent == 1.0)
    }

    // MARK: - NightSummary

    @Test func nightSummaryLoadingShowsChromeOnly() throws {
        #expect(try renderedText(NightSummaryView(state: .loading)) == ["NIGHT SUMMARY", "last night"])
    }

    @Test func nightSummaryEmptyShowsNoSleepMessage() throws {
        let text = try renderedText(NightSummaryView(state: .empty))
        #expect(text == ["NIGHT SUMMARY", "last night", "No sleep data"])
        #expect(!text.contains("Score"))
    }

    @Test(arguments: [
        HealthWidgetStates.nightSummaryGood,
        HealthWidgetStates.nightSummaryExcellent,
        HealthWidgetStates.nightSummaryPoor,
    ])
    func nightSummaryPopulatedShowsScoreDurationAndPhases(props: NightSummaryProps) throws {
        let text = try renderedText(NightSummaryView(props: props))
        let score = try #require(props.sleepScore)
        #expect(Array(text.prefix(5)) == ["NIGHT SUMMARY", "last night", props.duration, "Score", "\(score)"])
        for phase in [props.deepFormatted, props.remFormatted, props.coreFormatted, props.awakeFormatted] {
            #expect(text.contains(phase))
        }
        #expect(text.contains { $0.hasPrefix("\(props.deepPct)% deep — \(props.remPct)% REM") })
        #expect(!text.contains("No sleep data"))
    }

    // MARK: - Workouts

    @Test func workoutsLoadingShowsChromeOnly() throws {
        #expect(try renderedText(WorkoutsView(state: .loading)) == ["WORKOUTS", "today"])
    }

    @Test func workoutsRestDayShowsRecoveryMessage() throws {
        let text = try renderedText(WorkoutsView(state: .empty))
        #expect(text == ["WORKOUTS", "today", "Recovery Day", "No workouts recorded", "Recovery happens at rest."])
    }

    @Test func workoutsWithNoEntriesRenderTheRestDay() throws {
        // `init(props:)` maps an empty list to `.empty`: the decision the rest-day image depends on.
        #expect(try renderedText(WorkoutsView(props: WorkoutsProps(workouts: [])))
            == renderedText(WorkoutsView(state: .empty)))
    }

    @Test func workoutsSingleShowsOneCard() throws {
        #expect(try renderedText(WorkoutsView(props: HealthWidgetStates.workoutsSingle))
            == ["WORKOUTS", "today", "Running", "Duration", "30m", "Calories", "320 kcal", "Distance", "5.20 km"])
    }

    @Test func workoutsMultiShowsOneCardPerWorkoutAndDistanceOnlyWhenNonZero() throws {
        let text = try renderedText(WorkoutsView(props: HealthWidgetStates.workoutsMulti))
        #expect(text == [
            "WORKOUTS", "today",
            "Running", "Duration", "30m", "Calories", "320 kcal", "Distance", "5.20 km",
            "Strength Training", "Duration", "45m", "Calories", "240 kcal",
        ])
        #expect(!text.contains("Recovery Day"))
    }
}
