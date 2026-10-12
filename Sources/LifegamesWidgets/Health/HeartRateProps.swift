import Foundation

public struct HeartRateProps: Hashable, Codable, Sendable {
    /// Current heart rate, nil when the export carried none. A missing (or 0) heart rate
    /// renders the no-reading mark, never 0 (atlas decision 0160 F1).
    public let bpm: Int?
    /// HRV SDNN in ms, nil when the export carried none.
    public let hrv: Int?
    public let zone: String
    public var restingHeartRate: Double?
    public var respiratoryRate: Double?
    /// Wrist temperature delta in °C from the user's 30-day baseline.
    public var wristTemperatureDelta: Double?
    /// When true, the widget renders a paused overlay indicating the watch is not worn.
    public var watchPaused: Bool
    /// Refines the paused overlay: when true (with `watchPaused`), the overlay
    /// renders the `paused.labelCharging`/`descriptionCharging` copy variants —
    /// parity with the web widget's `watch.source === 'charging'` path. Ignored
    /// when `watchPaused` is false.
    public var watchCharging: Bool

    public init(
        bpm: Int?,
        hrv: Int?,
        zone: String,
        restingHeartRate: Double? = nil,
        respiratoryRate: Double? = nil,
        wristTemperatureDelta: Double? = nil,
        watchPaused: Bool = false,
        watchCharging: Bool = false
    ) {
        self.bpm = bpm
        self.hrv = hrv
        self.zone = zone
        self.restingHeartRate = restingHeartRate
        self.respiratoryRate = respiratoryRate
        self.wristTemperatureDelta = wristTemperatureDelta
        self.watchPaused = watchPaused
        self.watchCharging = watchCharging
    }

    /// The heart rate as a reading: nil when missing or not positive. A heart rate of 0
    /// is no reading (parity with the web `formatPositiveVital`).
    public var bpmReading: Int? {
        guard let bpm, bpm > 0 else { return nil }
        return bpm
    }

    /// The zone of the current reading, nil when there is no reading. A zone belongs to
    /// a reading: a missing heart rate has no zone colour.
    public var heartRateZone: HeartRateZone? {
        bpmReading.map { HeartRateZone.classify(bpm: $0) }
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
