import Foundation

public struct HeartRateProps: Hashable, Codable, Sendable {
    public let bpm: Int
    public let hrv: Int
    public let zone: String

    public init(bpm: Int, hrv: Int, zone: String) {
        self.bpm = bpm
        self.hrv = hrv
        self.zone = zone
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
