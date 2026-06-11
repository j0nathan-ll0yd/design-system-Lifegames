// AUTO-GENERATED — do not edit. Regenerate: pnpm -C packages/portal-contract codegen

// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To parse the JSON, add this file to your project and do:
//
//   let workoutsExport = try WorkoutsExport(json)

import Foundation

// MARK: - WorkoutsExport
public struct WorkoutsExport {
    public let date, generatedAt: String
    public let workouts: [Workout]

    public init(date: String, generatedAt: String, workouts: [Workout]) {
        self.date = date
        self.generatedAt = generatedAt
        self.workouts = workouts
    }
}

// MARK: - Workout
public struct Workout {
    public let activityType: String
    public let distance, duration, energyBurned: Double?
    public let source: String

    public init(activityType: String, distance: Double?, duration: Double?, energyBurned: Double?, source: String) {
        self.activityType = activityType
        self.distance = distance
        self.duration = duration
        self.energyBurned = energyBurned
        self.source = source
    }
}
