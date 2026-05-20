import SwiftUI

public enum MotionTokens {
    public static let durationFast: Double = 0.1
    public static let durationNormal: Double = 0.15
    public static let durationSlow: Double = 0.3

    public static func standard(duration: Double = durationNormal) -> Animation {
        .easeInOut(duration: duration)
    }

    public static func decelerate(duration: Double = durationNormal) -> Animation {
        .easeOut(duration: duration)
    }

    public static func accelerate(duration: Double = durationNormal) -> Animation {
        .easeIn(duration: duration)
    }
}
