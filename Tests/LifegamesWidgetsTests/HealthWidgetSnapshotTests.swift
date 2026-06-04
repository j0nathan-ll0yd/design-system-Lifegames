#if canImport(UIKit)
import LifegamesTokens
import SnapshotTesting
import SwiftUI
import Testing
@testable import LifegamesWidgets

@Suite("Health Widget Snapshots")
@MainActor
struct HealthWidgetSnapshotTests {
    private let layout: SwiftUISnapshotLayout = .device(config: .iPhone13Pro)

    private func wrap<V: View>(_ view: V) -> some View {
        view
            .frame(width: 360)
            .padding()
            .background(LGColor.surfaceBase)
            .preferredColorScheme(.dark)
    }

    // MARK: - HeartRate
    // Populated zone variants render the ECG via the `animateECG: false` test seam, which
    // draws the static (non-scrolling) PQRST waveform. That makes the frame fully
    // deterministic — exact pixel matching, no perceptual tolerance needed — while still
    // exercising the real waveform shape and all zone signals (BPM, accent color, zone
    // badge, HRV color). `accessibilityReduceMotion` can't be injected (env keypath is
    // get-only), so the internal seam is the deterministic path.

    @Test func heartRateLoading() {
        assertSnapshot(of: wrap(HeartRateView(state: .loading)), as: .image(layout: layout))
    }

    @Test func heartRateEmpty() {
        assertSnapshot(of: wrap(HeartRateView(state: .empty)), as: .image(layout: layout))
    }

    @Test func heartRateBradycardia() {
        assertSnapshot(of: wrap(HeartRateView(
            props: HeartRateProps(bpm: 42, hrv: 58, zone: "resting"), animateECG: false
        )), as: .image(layout: layout))
    }

    @Test func heartRateResting() {
        assertSnapshot(of: wrap(HeartRateView(
            props: HeartRateProps(bpm: 55, hrv: 45, zone: "resting"), animateECG: false
        )), as: .image(layout: layout))
    }

    @Test func heartRateNormal() {
        assertSnapshot(of: wrap(HeartRateView(
            props: HeartRateProps(bpm: 72, hrv: 32, zone: "moderate"), animateECG: false
        )), as: .image(layout: layout))
    }

    @Test func heartRateFatBurn() {
        assertSnapshot(of: wrap(HeartRateView(
            props: HeartRateProps(bpm: 128, hrv: 24, zone: "elevated"), animateECG: false
        )), as: .image(layout: layout))
    }

    @Test func heartRatePeak() {
        assertSnapshot(of: wrap(HeartRateView(
            props: HeartRateProps(bpm: 165, hrv: 14, zone: "high"), animateECG: false
        )), as: .image(layout: layout))
    }

    // MARK: - Hydration

    @Test func hydrationLoading() {
        assertSnapshot(of: wrap(HydrationView(state: .loading)), as: .image(layout: layout))
    }

    @Test func hydrationEmpty() {
        assertSnapshot(of: wrap(HydrationView(state: .empty)), as: .image(layout: layout))
    }

    @Test func hydrationNormal() {
        assertSnapshot(of: wrap(HydrationView(props: HydrationProps(
            waterOz: 54, caffeineMg: 280, waterMax: 100, caffeineMax: 500,
            waterRangeLo: 64, waterRangeHi: 80, caffeineRangeLo: 200, caffeineRangeHi: 400
        ))), as: .image(layout: layout))
    }

    @Test func hydrationDehydrated() {
        assertSnapshot(of: wrap(HydrationView(props: HydrationProps(
            waterOz: 12, caffeineMg: 80, waterMax: 100, caffeineMax: 500,
            waterRangeLo: 64, waterRangeHi: 80, caffeineRangeLo: 200, caffeineRangeHi: 400
        ))), as: .image(layout: layout))
    }

    @Test func hydrationOverhydrated() {
        assertSnapshot(of: wrap(HydrationView(props: HydrationProps(
            waterOz: 100, caffeineMg: 480, waterMax: 100, caffeineMax: 500,
            waterRangeLo: 64, waterRangeHi: 80, caffeineRangeLo: 200, caffeineRangeHi: 400
        ))), as: .image(layout: layout))
    }

    // MARK: - NightSummary

    @Test func nightSummaryLoading() {
        assertSnapshot(of: wrap(NightSummaryView(state: .loading)), as: .image(layout: layout))
    }

    @Test func nightSummaryEmpty() {
        assertSnapshot(of: wrap(NightSummaryView(state: .empty)), as: .image(layout: layout))
    }

    @Test func nightSummaryGood() {
        assertSnapshot(of: wrap(NightSummaryView(props: NightSummaryProps(
            sleepScore: 78, duration: "7h 24m",
            deepFormatted: "1h 12m", remFormatted: "1h 48m",
            coreFormatted: "3h 32m", awakeFormatted: "0h 52m",
            deepPct: 16, remPct: 24
        ))), as: .image(layout: layout))
    }

    @Test func nightSummaryExcellent() {
        assertSnapshot(of: wrap(NightSummaryView(props: NightSummaryProps(
            sleepScore: 94, duration: "8h 12m",
            deepFormatted: "1h 48m", remFormatted: "2h 06m",
            coreFormatted: "3h 54m", awakeFormatted: "0h 24m",
            deepPct: 22, remPct: 26
        ))), as: .image(layout: layout))
    }

    @Test func nightSummaryPoor() {
        assertSnapshot(of: wrap(NightSummaryView(props: NightSummaryProps(
            sleepScore: 42, duration: "4h 18m",
            deepFormatted: "0h 22m", remFormatted: "0h 44m",
            coreFormatted: "2h 30m", awakeFormatted: "1h 22m",
            deepPct: 9, remPct: 17
        ))), as: .image(layout: layout))
    }

    // MARK: - Workouts

    @Test func workoutsLoading() {
        assertSnapshot(of: wrap(WorkoutsView(state: .loading)), as: .image(layout: layout))
    }

    @Test func workoutsRestDay() {
        assertSnapshot(of: wrap(WorkoutsView(state: .empty)), as: .image(layout: layout))
    }

    @Test func workoutsSingle() {
        assertSnapshot(of: wrap(WorkoutsView(props: WorkoutsProps(workouts: [
            WorkoutsProps.Workout(activityType: "Running", duration: 1800, energyBurned: 320, distance: 5200),
        ]))), as: .image(layout: layout))
    }

    @Test func workoutsMulti() {
        assertSnapshot(of: wrap(WorkoutsView(props: WorkoutsProps(workouts: [
            WorkoutsProps.Workout(activityType: "Running", duration: 1800, energyBurned: 320, distance: 5200),
            WorkoutsProps.Workout(activityType: "Strength Training", duration: 2700, energyBurned: 240, distance: 0),
        ]))), as: .image(layout: layout))
    }
}
#endif
