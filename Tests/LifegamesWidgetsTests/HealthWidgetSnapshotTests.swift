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
            props: HealthWidgetStates.heartRateBradycardia, animateECG: false
        )), as: .image(layout: layout))
    }

    @Test func heartRateResting() {
        assertSnapshot(of: wrap(HeartRateView(
            props: HealthWidgetStates.heartRateResting, animateECG: false
        )), as: .image(layout: layout))
    }

    @Test func heartRateNormal() {
        assertSnapshot(of: wrap(HeartRateView(
            props: HealthWidgetStates.heartRateNormal, animateECG: false
        )), as: .image(layout: layout))
    }

    @Test func heartRateFatBurn() {
        assertSnapshot(of: wrap(HeartRateView(
            props: HealthWidgetStates.heartRateFatBurn, animateECG: false
        )), as: .image(layout: layout))
    }

    @Test func heartRatePeak() {
        assertSnapshot(of: wrap(HeartRateView(
            props: HealthWidgetStates.heartRatePeak, animateECG: false
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
        assertSnapshot(of: wrap(HydrationView(props: HealthWidgetStates.hydrationNormal)), as: .image(layout: layout))
    }

    @Test func hydrationDehydrated() {
        assertSnapshot(of: wrap(HydrationView(props: HealthWidgetStates.hydrationDehydrated)), as: .image(layout: layout))
    }

    @Test func hydrationOverhydrated() {
        assertSnapshot(of: wrap(HydrationView(props: HealthWidgetStates.hydrationOverhydrated)), as: .image(layout: layout))
    }

    // MARK: - NightSummary

    @Test func nightSummaryLoading() {
        assertSnapshot(of: wrap(NightSummaryView(state: .loading)), as: .image(layout: layout))
    }

    @Test func nightSummaryEmpty() {
        assertSnapshot(of: wrap(NightSummaryView(state: .empty)), as: .image(layout: layout))
    }

    @Test func nightSummaryGood() {
        assertSnapshot(of: wrap(NightSummaryView(props: HealthWidgetStates.nightSummaryGood)), as: .image(layout: layout))
    }

    @Test func nightSummaryExcellent() {
        assertSnapshot(of: wrap(NightSummaryView(props: HealthWidgetStates.nightSummaryExcellent)), as: .image(layout: layout))
    }

    @Test func nightSummaryPoor() {
        assertSnapshot(of: wrap(NightSummaryView(props: HealthWidgetStates.nightSummaryPoor)), as: .image(layout: layout))
    }

    // MARK: - Workouts

    @Test func workoutsLoading() {
        assertSnapshot(of: wrap(WorkoutsView(state: .loading)), as: .image(layout: layout))
    }

    @Test func workoutsRestDay() {
        assertSnapshot(of: wrap(WorkoutsView(state: .empty)), as: .image(layout: layout))
    }

    @Test func workoutsSingle() {
        assertSnapshot(of: wrap(WorkoutsView(props: HealthWidgetStates.workoutsSingle)), as: .image(layout: layout))
    }

    @Test func workoutsMulti() {
        assertSnapshot(of: wrap(WorkoutsView(props: HealthWidgetStates.workoutsMulti)), as: .image(layout: layout))
    }
}
#endif
