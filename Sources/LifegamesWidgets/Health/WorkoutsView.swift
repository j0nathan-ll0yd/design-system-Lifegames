import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct WorkoutsView: View {
    private let state: WidgetState<WorkoutsProps>

    public init(state: WidgetState<WorkoutsProps>) {
        self.state = state
    }

    public init(props: WorkoutsProps) {
        state = props.workouts.isEmpty ? .empty : .populated(props)
    }

    public var body: some View {
        switch state {
        case .loading:
            WorkoutsSkeletonView()
        case .empty:
            WorkoutsRestDayView()
        case let .populated(props):
            WorkoutsPopulatedView(props: props)
        }
    }
}

private struct WorkoutsPopulatedView: View {
    let props: WorkoutsProps

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "WORKOUTS", dotColor: LGColor.accentPink, timestamp: "today")

            VStack(spacing: 10) {
                ForEach(Array(props.workouts.enumerated()), id: \.offset) { _, workout in
                    WorkoutCard(workout: workout)
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: LGColor.accentPink)
    }
}

private struct WorkoutsRestDayView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "WORKOUTS", dotColor: LGColor.accentPink, timestamp: "today")

            VStack(spacing: 12) {
                Image(systemName: "figure.mind.and.body")
                    .font(.system(size: 32))
                    .foregroundStyle(LGColor.accentPink.opacity(0.6))

                Text("Recovery Day")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(LGColor.textTitle)

                Text("No workouts recorded")
                    .font(.system(size: 11))
                    .foregroundStyle(LGColor.textMuted)

                Text("Your body recovers while you rest")
                    .font(.system(size: 10))
                    .foregroundStyle(LGColor.textMuted.opacity(0.7))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .padding(.horizontal, 18)
        }
        .neonCard(accent: LGColor.accentPink)
    }
}

private struct WorkoutsSkeletonView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "WORKOUTS", dotColor: LGColor.accentPink, timestamp: "today")

            VStack(spacing: 10) {
                ForEach(0 ..< 2, id: \.self) { _ in
                    WorkoutCardSkeleton()
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: LGColor.accentPink)
    }
}

private struct WorkoutCardSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                SkeletonBar(width: 28, height: 28, cornerRadius: 6)
                SkeletonBar(width: 120, height: 12)
            }
            HStack(spacing: 16) {
                SkeletonBar(width: 64, height: 10)
                SkeletonBar(width: 64, height: 10)
                SkeletonBar(width: 64, height: 10)
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
                    .foregroundStyle(LGColor.accentPink.opacity(0.8))
                    .frame(width: 28, height: 28)
                    .background(LGColor.accentPink.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 6))

                Text(workout.activityType)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(LGColor.textTitle)
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
                .foregroundStyle(LGColor.textMuted)
            Text(value)
                .font(.system(size: 11, weight: .medium, design: .monospaced))
                .foregroundStyle(LGColor.textTitle)
        }
    }
}

#Preview("Workouts — Loading") {
    WorkoutsView(state: .loading)
        .padding()
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
}

#Preview("Workouts — Empty (Rest Day)") {
    WorkoutsView(state: .empty)
        .padding()
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
}

#Preview("Workouts — Single") {
    WorkoutsView(state: .populated(WorkoutsProps(workouts: [
        .init(activityType: "Outdoor Walk", duration: 2400, energyBurned: 180, distance: 3200),
    ])))
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

#Preview("Workouts — Multi") {
    WorkoutsView(state: .populated(WorkoutsProps(workouts: [
        .init(activityType: "Outdoor Walk", duration: 2400, energyBurned: 180, distance: 3200),
        .init(activityType: "Barry's Bootcamp", duration: 3300, energyBurned: 520, distance: 0),
    ])))
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}
