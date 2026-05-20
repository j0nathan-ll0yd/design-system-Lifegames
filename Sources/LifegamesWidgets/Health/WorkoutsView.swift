import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct WorkoutsView: View {
    public let props: WorkoutsProps

    public init(props: WorkoutsProps) {
        self.props = props
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "WORKOUTS", dotColor: Color.colorAccentPink, timestamp: "today")

            if props.workouts.isEmpty {
                restDayView
            } else {
                VStack(spacing: 10) {
                    ForEach(Array(props.workouts.enumerated()), id: \.offset) { _, workout in
                        WorkoutCard(workout: workout)
                    }
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 16)
            }
        }
        .neonCard(accent: Color.colorAccentPink)
    }

    private var restDayView: some View {
        VStack(spacing: 12) {
            Image(systemName: "figure.mind.and.body")
                .font(.system(size: 32))
                .foregroundStyle(Color.colorAccentPink.opacity(0.6))

            Text("Recovery Day")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Color.colorTextTitle)

            Text("No workouts recorded")
                .font(.system(size: 11))
                .foregroundStyle(Color.colorTextMuted)

            Text("Your body recovers while you rest")
                .font(.system(size: 10))
                .foregroundStyle(Color.colorTextMuted.opacity(0.7))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .padding(.horizontal, 18)
    }
}

private struct WorkoutCard: View {
    let workout: WorkoutsProps.Workout

    private var icon: String {
        switch workout.activityType.lowercased() {
        case let t where t.contains("walk"): return "figure.walk"
        case let t where t.contains("run"): return "figure.run"
        case let t where t.contains("bootcamp"), let t where t.contains("strength"):
            return "dumbbell.fill"
        case let t where t.contains("cycle"), let t where t.contains("bike"):
            return "figure.outdoor.cycle"
        default: return "figure.mixed.cardio"
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 14))
                    .foregroundStyle(Color.colorAccentPink.opacity(0.8))
                    .frame(width: 28, height: 28)
                    .background(Color.colorAccentPink.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 6))

                Text(workout.activityType)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color.colorTextTitle)
            }

            HStack(spacing: 16) {
                StatPill(label: "Duration", value: workout.durationFormatted)
                StatPill(label: "Calories", value: "\(workout.energyBurned) kcal")
                if workout.distance > 0 {
                    StatPill(label: "Distance", value: String(format: "%.2f km", Double(workout.distance) / 1000.0))
                }
            }
        }
        .padding(12)
        .background(Color.white.opacity(0.03))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color.white.opacity(0.06), lineWidth: 1)
        )
    }
}

private struct StatPill: View {
    let label: String
    let value: String

    var body: some View {
        VStack(spacing: 2) {
            Text(label)
                .font(.system(size: 9))
                .foregroundStyle(Color.colorTextMuted)
            Text(value)
                .font(.system(size: 11, weight: .medium, design: .monospaced))
                .foregroundStyle(Color.colorTextTitle)
        }
    }
}

#Preview("Workouts") {
    VStack(spacing: 16) {
        WorkoutsView(props: WorkoutsProps(workouts: [
            .init(activityType: "Outdoor Walk", duration: 2400, energyBurned: 180, distance: 3200),
            .init(activityType: "Barry's Bootcamp", duration: 3300, energyBurned: 520, distance: 0),
        ]))
        WorkoutsView(props: WorkoutsProps(workouts: []))
    }
    .padding()
    .background(Color.colorSurfaceBase)
    .preferredColorScheme(.dark)
}
