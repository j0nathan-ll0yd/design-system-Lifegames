import LifegamesCopy
import LifegamesTokens
import SwiftUI

public enum HeartRateZone {
    case bradycardia, restingZone, normalZone, fatBurn, peakZone

    public var name: String {
        let copy = CopyLoader.widgets.heartRate
        switch self {
        case .bradycardia: return copy.zoneBradycardia
        case .restingZone: return copy.zoneResting
        case .normalZone: return copy.zoneNormal
        case .fatBurn: return copy.zoneFatBurn
        case .peakZone: return copy.zonePeak
        }
    }

    public var accentColor: Color {
        switch self {
        case .bradycardia: LGColor.accentGreen
        case .restingZone: LGColor.accentGreen
        case .normalZone: LGColor.accentPink
        case .fatBurn: LGColor.accentAmber
        case .peakZone: LGColor.accentRed
        }
    }

    public var ecgSpeed: Double {
        switch self {
        case .bradycardia: 8.0
        case .restingZone: 6.0
        case .normalZone: 4.0
        case .fatBurn: 2.5
        case .peakZone: 1.5
        }
    }

    public var bpmShadowIntensity: Double {
        switch self {
        case .bradycardia: 0.4
        case .restingZone: 0.5
        case .normalZone: 0.6
        case .fatBurn: 0.7
        case .peakZone: 0.8
        }
    }

    /// Opacity applied to the ECG background, matching the web HeartRate widget's
    /// per-zone `ecgOpacity` (higher zones read more prominently).
    public var ecgOpacity: Double {
        switch self {
        case .bradycardia: 0.35
        case .restingZone: 0.35
        case .normalZone: 0.35
        case .fatBurn: 0.4
        case .peakZone: 0.5
        }
    }

    public static func classify(bpm: Int) -> HeartRateZone {
        switch bpm {
        case ..<45: .bradycardia
        case 45 ... 59: .restingZone
        case 60 ... 100: .normalZone
        case 101 ... 140: .fatBurn
        default: .peakZone
        }
    }
}
