import Foundation

public struct WorkoutsProps: Hashable, Codable, Sendable {
    public let workouts: [Workout]

    public init(workouts: [Workout]) {
        self.workouts = workouts
    }

    public struct Workout: Hashable, Codable, Sendable {
        public let activityType: String
        public let duration: Int
        public let energyBurned: Int
        public let distance: Int

        public init(activityType: String, duration: Int, energyBurned: Int, distance: Int) {
            self.activityType = activityType
            self.duration = duration
            self.energyBurned = energyBurned
            self.distance = distance
        }

        public var durationFormatted: String {
            let h = duration / 3600
            let m = (duration % 3600) / 60
            if h > 0 { return "\(h)h \(m)m" }
            return "\(m)m"
        }
    }
}
