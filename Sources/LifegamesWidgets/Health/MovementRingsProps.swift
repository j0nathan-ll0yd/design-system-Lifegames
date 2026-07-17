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
    /// When true, the widget renders a paused overlay indicating the watch is not worn.
    public var watchPaused: Bool
    /// Refines the paused overlay: when true (with `watchPaused`), the overlay
    /// renders the `paused.labelCharging`/`descriptionCharging` copy variants —
    /// parity with the web widget's `watch.source === 'charging'` path. Ignored
    /// when `watchPaused` is false.
    public var watchCharging: Bool

    public init(
        moveKcal: Double,
        exerciseMin: Double,
        standHr: Double,
        steps: Int,
        distanceMeters: Double,
        flights: Int,
        daylightMin: Double,
        goals: Goals = Goals(),
        solar: Solar? = nil,
        watchPaused: Bool = false,
        watchCharging: Bool = false
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
        self.watchPaused = watchPaused
        self.watchCharging = watchCharging
    }
}
