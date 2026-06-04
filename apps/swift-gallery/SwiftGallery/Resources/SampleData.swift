import Foundation

enum SampleData {
    enum HeartRate {
        static let restingBpm = 62
        static let restingHrv = 48
        static let restingZone = "Resting Zone"
    }

    enum Hydration {
        static let waterOz = 64.0
        static let caffeineMg = 180.0
        static let waterMax = 96.0
        static let caffeineMax = 400.0
        static let waterRangeLo = 64.0
        static let waterRangeHi = 96.0
        static let caffeineRangeLo = 0.0
        static let caffeineRangeHi = 300.0
    }

    enum Sleep {
        static let goodScore = 82
        static let goodDuration = "7h 22m"
        static let goodDeep = "1h 28m"
        static let goodRem = "1h 38m"
        static let goodCore = "3h 42m"
        static let goodAwake = "34m"
        static let goodDeepPct = 20
        static let goodRemPct = 22
    }

    enum Workouts {
        struct Entry {
            let activityType: String
            let durationMinutes: Int
            let energyBurned: Double
            let distanceMeters: Double
        }

        static let singleRun = Entry(activityType: "Running", durationMinutes: 32, energyBurned: 340, distanceMeters: 5200)
        static let strengthSession = Entry(activityType: "Strength Training", durationMinutes: 45, energyBurned: 280, distanceMeters: 0)
        static let cyclingSession = Entry(activityType: "Cycling", durationMinutes: 60, energyBurned: 520, distanceMeters: 18000)
    }
}
