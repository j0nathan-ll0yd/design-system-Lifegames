import Foundation

public struct HeartRateProps: Hashable, Codable, Sendable {
    public let bpm: Int
    public let hrv: Int
    public let zone: String
    public var restingHeartRate: Double?
    public var respiratoryRate: Double?
    /// Wrist temperature delta in °C from the user's 30-day baseline.
    public var wristTemperatureDelta: Double?
    /// When true, the widget renders a paused overlay indicating the watch is not worn.
    public var watchPaused: Bool

    public init(
        bpm: Int,
        hrv: Int,
        zone: String,
        restingHeartRate: Double? = nil,
        respiratoryRate: Double? = nil,
        wristTemperatureDelta: Double? = nil,
        watchPaused: Bool = false
    ) {
        self.bpm = bpm
        self.hrv = hrv
        self.zone = zone
        self.restingHeartRate = restingHeartRate
        self.respiratoryRate = respiratoryRate
        self.wristTemperatureDelta = wristTemperatureDelta
        self.watchPaused = watchPaused
    }

    public var heartRateZone: HeartRateZone {
        HeartRateZone.classify(bpm: bpm)
    }

    /// Legacy — kept for backward compatibility pending consumer audit
    public var zoneColor: String {
        switch zone.lowercased() {
        case "resting": return "green"
        case "moderate": return "amber"
        case "elevated": return "pink"
        case "high": return "red"
        default: return "green"
        }
    }
}
