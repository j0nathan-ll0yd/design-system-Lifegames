@testable import LifegamesWidgets

/// The props behind every `HealthWidgetSnapshotTests` image. That suite and
/// `HealthWidgetBehaviorTests` read the same values, so each behavioral assertion holds the
/// exact state its image shows. The snapshot suite runs only on the iOS Simulator lane
/// (`.github/workflows/swift-snapshots.yml`); the behavioral suite also runs under `swift test`.
enum HealthWidgetStates {
    // MARK: - HeartRate. `zone` is the legacy prop; the view derives its zone from `bpm`.

    static let heartRateBradycardia = HeartRateProps(bpm: 42, hrv: 58, zone: "resting")
    static let heartRateResting = HeartRateProps(bpm: 55, hrv: 45, zone: "resting")
    static let heartRateNormal = HeartRateProps(bpm: 72, hrv: 32, zone: "moderate")
    static let heartRateFatBurn = HeartRateProps(bpm: 128, hrv: 24, zone: "elevated")
    static let heartRatePeak = HeartRateProps(bpm: 165, hrv: 14, zone: "high")

    // MARK: - Hydration

    static let hydrationNormal = hydration(waterOz: 54, caffeineMg: 280)
    static let hydrationDehydrated = hydration(waterOz: 12, caffeineMg: 80)
    static let hydrationOverhydrated = hydration(waterOz: 100, caffeineMg: 480)

    private static func hydration(waterOz: Int, caffeineMg: Int) -> HydrationProps {
        HydrationProps(
            waterOz: waterOz, caffeineMg: caffeineMg, waterMax: 100, caffeineMax: 500,
            waterRangeLo: 64, waterRangeHi: 80, caffeineRangeLo: 200, caffeineRangeHi: 400
        )
    }

    // MARK: - NightSummary

    static let nightSummaryGood = NightSummaryProps(
        sleepScore: 78, duration: "7h 24m",
        deepFormatted: "1h 12m", remFormatted: "1h 48m",
        coreFormatted: "3h 32m", awakeFormatted: "0h 52m",
        deepPct: 16, remPct: 24
    )
    static let nightSummaryExcellent = NightSummaryProps(
        sleepScore: 94, duration: "8h 12m",
        deepFormatted: "1h 48m", remFormatted: "2h 06m",
        coreFormatted: "3h 54m", awakeFormatted: "0h 24m",
        deepPct: 22, remPct: 26
    )
    static let nightSummaryPoor = NightSummaryProps(
        sleepScore: 42, duration: "4h 18m",
        deepFormatted: "0h 22m", remFormatted: "0h 44m",
        coreFormatted: "2h 30m", awakeFormatted: "1h 22m",
        deepPct: 9, remPct: 17
    )

    // MARK: - Workouts

    static let running = WorkoutsProps.Workout(
        activityType: "Running", duration: 1800, energyBurned: 320, distance: 5200
    )
    static let strength = WorkoutsProps.Workout(
        activityType: "Strength Training", duration: 2700, energyBurned: 240, distance: 0
    )
    static let workoutsSingle = WorkoutsProps(workouts: [running])
    static let workoutsMulti = WorkoutsProps(workouts: [running, strength])
}
