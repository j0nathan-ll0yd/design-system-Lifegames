// CoffeeTrackingProps.swift — presentational props for the Acaia coffee-tracking UI.
// Lives in LifegamesComponentsCore; no BLE/HealthKit/TCA types (GOVERNANCE P3 / C-PRESENTATIONAL).
import Foundation

public struct CoffeeTrackingProps: Hashable, Codable, Sendable {
    // MARK: - Connection state

    public enum ScaleConnection: String, Codable, Sendable {
        case unpaired // no scale ever paired (first-run / onboarding)
        case searching // scanning / connecting
        case connected // live, streaming weight data
        case error // connection or protocol failure (see errorMessage)
    }

    // MARK: - Beverage type

    public enum Beverage: String, Codable, Sendable {
        case drip, espresso, coldBrew
    }

    // MARK: - Raw signals (the only stored truth)

    public var connection: ScaleConnection
    /// Non-nil only when connection == .error.
    public var errorMessage: String?
    /// nil when unknown or scale is unpaired.
    public var batteryPercent: Int?
    /// true while a cup is actively being tracked.
    public var isSessionActive: Bool
    /// false while the cup is lifted — meter holds at last stable value (§4).
    public var isCupOnScale: Bool
    /// Baseline captured at "New Cup" (the full-cup weight).
    public var startWeightGrams: Double
    /// Last settled reading — non-increasing upstream; drives fill (§4).
    public var lastStableWeightGrams: Double
    /// Instantaneous reading; may be ~0 while the cup is lifted.
    public var currentWeightGrams: Double
    /// Δweight/Δt derived client-side; 0 when idle.
    public var flowRateGramsPerSec: Double
    public var sessionElapsedSeconds: Int
    public var dailyCaffeineMg: Int
    /// Default 400 mg (FDA guideline).
    public var dailyTargetMg: Int
    public var cupsToday: Int
    public var beverage: Beverage

    // MARK: - Derived (computed — cannot contradict raw signals)

    /// Grams consumed this cup. Never negative.
    public var consumedGrams: Double {
        max(0, startWeightGrams - lastStableWeightGrams)
    }

    /// Fraction of this cup consumed, clamped to [0, 1].
    /// Guards ÷0: returns 0 when startWeightGrams == 0 (empty-scale New Cup → never NaN).
    public var fillPercent: Double {
        startWeightGrams > 0 ? min(consumedGrams / startWeightGrams, 1) : 0
    }

    /// Estimated caffeine from consumed liquid (display estimate; ±~30%).
    public var caffeineMgThisCup: Int {
        Int((consumedGrams * beverage.caffeineMgPerGram).rounded())
    }

    /// A tracked cup whose scale link has failed. The session outlives the link — meter,
    /// elapsed timer and persisted snapshot all survive — so this is NOT the never-paired
    /// empty state, and `isCupOnScale` carries no presence information while it holds.
    public var isLinkLostMidSession: Bool {
        isSessionActive && connection == .error
    }

    /// True while the cup is genuinely lifted mid-sip. Excludes the link-lost case, where
    /// `isCupOnScale` is forced false by the consumer and means "unknown", not "lifted".
    public var isSipping: Bool {
        isSessionActive && !isCupOnScale && !isLinkLostMidSession
    }

    // MARK: - Init

    public init(
        connection: ScaleConnection = .unpaired,
        errorMessage: String? = nil,
        batteryPercent: Int? = nil,
        isSessionActive: Bool = false,
        isCupOnScale: Bool = false,
        startWeightGrams: Double = 0,
        lastStableWeightGrams: Double = 0,
        currentWeightGrams: Double = 0,
        flowRateGramsPerSec: Double = 0,
        sessionElapsedSeconds: Int = 0,
        dailyCaffeineMg: Int = 0,
        dailyTargetMg: Int = 400,
        cupsToday: Int = 0,
        beverage: Beverage = .drip
    ) {
        self.connection = connection
        self.errorMessage = errorMessage
        self.batteryPercent = batteryPercent
        self.isSessionActive = isSessionActive
        self.isCupOnScale = isCupOnScale
        self.startWeightGrams = startWeightGrams
        self.lastStableWeightGrams = lastStableWeightGrams
        self.currentWeightGrams = currentWeightGrams
        self.flowRateGramsPerSec = flowRateGramsPerSec
        self.sessionElapsedSeconds = sessionElapsedSeconds
        self.dailyCaffeineMg = dailyCaffeineMg
        self.dailyTargetMg = dailyTargetMg
        self.cupsToday = cupsToday
        self.beverage = beverage
    }
}

// MARK: - Beverage caffeine density

public extension CoffeeTrackingProps.Beverage {
    /// mg caffeine per gram of liquid consumed (USDA-derived defaults, ±~30%; display estimate only).
    var caffeineMgPerGram: Double {
        switch self {
        case .drip: 0.40
        case .espresso: 2.1
        case .coldBrew: 2.0
        }
    }
}
