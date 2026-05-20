import Foundation

public enum Adapters {
    public static func adaptHealth(from raw: [String: Any]) -> DailyActivityProps {
        let quantities = raw["quantities"] as? [String: [String: Any]] ?? [:]
        func intVal(_ key: String) -> Int {
            guard let q = quantities[key], let v = q["value"] as? Double else { return 0 }
            return Int(v.rounded())
        }

        let active = intVal("activeEnergyBurned")
        let basal = intVal("basalEnergyBurned")

        return DailyActivityProps(
            steps: intVal("stepCount"),
            distance: intVal("distanceWalkingRunning"),
            exerciseMinutes: intVal("exerciseTime"),
            activeCalories: active,
            basalCalories: basal,
            totalCalories: active + basal
        )
    }

    public static func adaptHeartRate(from raw: [String: Any]) -> HeartRateProps {
        let quantities = raw["quantities"] as? [String: [String: Any]] ?? [:]
        let hr = (quantities["heartRate"]?["value"] as? Double).map { Int($0.rounded()) } ?? 0
        let hrv = (quantities["hrvSDNN"]?["value"] as? Double).map { Int($0.rounded()) } ?? 0
        let zone = classifyHeartRate(hr)
        return HeartRateProps(bpm: hr, hrv: hrv, zone: zone)
    }

    public static func adaptHydration(from raw: [String: Any]) -> HydrationProps {
        let h = raw["hydration"] as? [String: Any] ?? [:]
        return HydrationProps(
            waterOz: (h["waterOz"] as? Double).map { Int($0) } ?? 0,
            caffeineMg: (h["caffeineMg"] as? Double).map { Int($0) } ?? 0,
            waterMax: (h["waterMax"] as? Double).map { Int($0) } ?? 100,
            caffeineMax: (h["caffeineMax"] as? Double).map { Int($0) } ?? 500,
            waterRangeLo: (h["waterRangeLo"] as? Double).map { Int($0) } ?? 64,
            waterRangeHi: (h["waterRangeHi"] as? Double).map { Int($0) } ?? 80,
            caffeineRangeLo: (h["caffeineRangeLo"] as? Double).map { Int($0) } ?? 200,
            caffeineRangeHi: (h["caffeineRangeHi"] as? Double).map { Int($0) } ?? 400
        )
    }

    public static func adaptWorkouts(from raw: [[String: Any]]) -> WorkoutsProps {
        let workouts = raw.map { w in
            WorkoutsProps.Workout(
                activityType: w["activity_type"] as? String ?? "Unknown",
                duration: (w["duration"] as? Double).map { Int($0) } ?? 0,
                energyBurned: (w["energy_burned"] as? Double).map { Int($0.rounded()) } ?? 0,
                distance: (w["distance"] as? Double).map { Int($0) } ?? 0
            )
        }
        return WorkoutsProps(workouts: workouts)
    }

    private static func classifyHeartRate(_ bpm: Int) -> String {
        switch bpm {
        case ..<60: return "Resting"
        case 60 ..< 100: return "Normal"
        case 100 ..< 140: return "Moderate"
        case 140 ..< 170: return "Elevated"
        default: return "High"
        }
    }
}
