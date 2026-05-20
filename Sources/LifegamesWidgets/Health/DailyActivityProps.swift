import Foundation

public struct DailyActivityProps: Hashable, Codable, Sendable {
    public let steps: Int
    public let distance: Int
    public let exerciseMinutes: Int
    public let activeCalories: Int
    public let basalCalories: Int
    public let totalCalories: Int

    public init(
        steps: Int, distance: Int, exerciseMinutes: Int,
        activeCalories: Int, basalCalories: Int, totalCalories: Int
    ) {
        self.steps = steps
        self.distance = distance
        self.exerciseMinutes = exerciseMinutes
        self.activeCalories = activeCalories
        self.basalCalories = basalCalories
        self.totalCalories = totalCalories
    }
}
