import Foundation

public struct MovementRingsProps: Equatable, Sendable {
    public struct Goals: Equatable, Sendable {
        public var moveKcal: Double
        public var exerciseMin: Double
        public var standHr: Double
        public var daylightMin: Double

        public init(
            moveKcal: Double = 500,
            exerciseMin: Double = 30,
            standHr: Double = 12,
            daylightMin: Double = 20
        ) {
            self.moveKcal = moveKcal
            self.exerciseMin = exerciseMin
            self.standHr = standHr
            self.daylightMin = daylightMin
        }
    }

    public struct Solar: Equatable, Sendable {
        public var sunriseHHmm: String
        public var sunsetHHmm: String
        /// Current daylight progress as a percentage `0...100`.
        public var currentProgressPct: Double

        public init(sunriseHHmm: String, sunsetHHmm: String, currentProgressPct: Double) {
            self.sunriseHHmm = sunriseHHmm
            self.sunsetHHmm = sunsetHHmm
            self.currentProgressPct = currentProgressPct
        }
    }

    public var moveKcal: Double
    public var exerciseMin: Double
    /// Stand hours today (caller pre-converts from minutes).
    public var standHr: Double
    public var steps: Int
    public var distanceMeters: Double
    public var flights: Int
    public var daylightMin: Double
    public var goals: Goals
    public var solar: Solar?

    public init(
        moveKcal: Double,
        exerciseMin: Double,
        standHr: Double,
        steps: Int,
        distanceMeters: Double,
        flights: Int,
        daylightMin: Double,
        goals: Goals = Goals(),
        solar: Solar? = nil
    ) {
        self.moveKcal = moveKcal
        self.exerciseMin = exerciseMin
        self.standHr = standHr
        self.steps = steps
        self.distanceMeters = distanceMeters
        self.flights = flights
        self.daylightMin = daylightMin
        self.goals = goals
        self.solar = solar
    }
}
