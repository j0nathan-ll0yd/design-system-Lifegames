import LifegamesComponents
import LifegamesTokens
import LifegamesWidgets
import SwiftUI

struct HealthWidgetsShowcase: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 28) {
            sectionHeader("Heart Rate")
            HeartRateShowcaseSection()

            sectionHeader("Hydration")
            HydrationShowcaseSection()

            sectionHeader("Night Summary")
            NightSummaryShowcaseSection()

            sectionHeader("Workouts")
            WorkoutsShowcaseSection()
        }
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title.uppercased())
            .font(.system(size: 10, weight: .bold, design: .monospaced))
            .kerning(2)
            .foregroundStyle(LGColor.accentPink)
    }
}

private struct HeartRateShowcaseSection: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 28) {
            showcaseSection("Loading") { HeartRateView(state: .loading) }
            showcaseSection("Empty") { HeartRateView(state: .empty) }
            showcaseSection("Bradycardia — 42 bpm / HRV 35") {
                HeartRateView(props: HeartRateProps(bpm: 42, hrv: 35, zone: "Bradycardia"))
            }
            showcaseSection("Resting Zone — 52 bpm / HRV 45") {
                HeartRateView(props: HeartRateProps(bpm: 52, hrv: 45, zone: "Resting Zone"))
            }
            showcaseSection("Normal Zone — 75 bpm / HRV 42") {
                HeartRateView(props: HeartRateProps(bpm: 75, hrv: 42, zone: "Normal Zone"))
            }
            showcaseSection("Fat Burn — 130 bpm / HRV 28") {
                HeartRateView(props: HeartRateProps(bpm: 130, hrv: 28, zone: "Fat Burn"))
            }
            showcaseSection("Peak Zone — 165 bpm / HRV 15") {
                HeartRateView(props: HeartRateProps(bpm: 165, hrv: 15, zone: "Peak Zone"))
            }
        }
    }
}

private struct HydrationShowcaseSection: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 28) {
            showcaseSection("Loading") { HydrationView(state: .loading) }
            showcaseSection("Empty") { HydrationView(state: .empty) }
            showcaseSection("Normal") {
                HydrationView(props: HydrationProps(
                    waterOz: 64, caffeineMg: 180,
                    waterMax: 96, caffeineMax: 400,
                    waterRangeLo: 64, waterRangeHi: 96,
                    caffeineRangeLo: 0, caffeineRangeHi: 300
                ))
            }
            showcaseSection("Dehydrated") {
                HydrationView(props: HydrationProps(
                    waterOz: 20, caffeineMg: 400,
                    waterMax: 96, caffeineMax: 400,
                    waterRangeLo: 64, waterRangeHi: 96,
                    caffeineRangeLo: 0, caffeineRangeHi: 300
                ))
            }
            showcaseSection("Overhydrated") {
                HydrationView(props: HydrationProps(
                    waterOz: 120, caffeineMg: 80,
                    waterMax: 96, caffeineMax: 400,
                    waterRangeLo: 64, waterRangeHi: 96,
                    caffeineRangeLo: 0, caffeineRangeHi: 300
                ))
            }
        }
    }
}

private struct NightSummaryShowcaseSection: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 28) {
            showcaseSection("Loading") { NightSummaryView(state: .loading) }
            showcaseSection("Empty") { NightSummaryView(state: .empty) }
            showcaseSection("Good Sleep — Score 82") {
                NightSummaryView(props: NightSummaryProps(
                    sleepScore: 82, duration: "7h 22m",
                    deepFormatted: "1h 28m", remFormatted: "1h 38m",
                    coreFormatted: "3h 42m", awakeFormatted: "34m",
                    deepPct: 20, remPct: 22
                ))
            }
            showcaseSection("Excellent — Score 95") {
                NightSummaryView(props: NightSummaryProps(
                    sleepScore: 95, duration: "8h 10m",
                    deepFormatted: "2h 02m", remFormatted: "2h 00m",
                    coreFormatted: "3h 48m", awakeFormatted: "20m",
                    deepPct: 25, remPct: 25
                ))
            }
            showcaseSection("Poor — Score 48") {
                NightSummaryView(props: NightSummaryProps(
                    sleepScore: 48, duration: "5h 04m",
                    deepFormatted: "0h 24m", remFormatted: "0h 48m",
                    coreFormatted: "3h 12m", awakeFormatted: "40m",
                    deepPct: 8, remPct: 16
                ))
            }
        }
    }
}

private struct WorkoutsShowcaseSection: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 28) {
            showcaseSection("Loading") { WorkoutsView(state: .loading) }
            showcaseSection("Rest Day") { WorkoutsView(state: .empty) }
            showcaseSection("Single Workout") {
                WorkoutsView(props: WorkoutsProps(workouts: [
                    WorkoutsProps.Workout(activityType: "Running", duration: 32, energyBurned: 340, distance: 5200),
                ]))
            }
            showcaseSection("Multi Workout") {
                WorkoutsView(props: WorkoutsProps(workouts: [
                    WorkoutsProps.Workout(activityType: "Running", duration: 30, energyBurned: 320, distance: 5000),
                    WorkoutsProps.Workout(activityType: "Strength Training", duration: 45, energyBurned: 280, distance: 0),
                ]))
            }
            showcaseSection("Heavy Day") {
                WorkoutsView(props: WorkoutsProps(workouts: [
                    WorkoutsProps.Workout(activityType: "Cycling", duration: 60, energyBurned: 520, distance: 18000),
                    WorkoutsProps.Workout(activityType: "Strength Training", duration: 50, energyBurned: 310, distance: 0),
                    WorkoutsProps.Workout(activityType: "Walking", duration: 25, energyBurned: 150, distance: 2800),
                ]))
            }
        }
    }
}

private func showcaseSection<Content: View>(_ name: String, @ViewBuilder content: () -> Content) -> some View {
    VStack(alignment: .leading, spacing: 10) {
        Text(name)
            .font(.system(size: 10, weight: .bold, design: .monospaced))
            .kerning(1)
            .foregroundStyle(LGColor.textSubtle)
            .textCase(.uppercase)
        content()
    }
}
