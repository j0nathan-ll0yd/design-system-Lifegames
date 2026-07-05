import LifegamesTokens
import SwiftUI

/// Concentric Apple-style triple activity rings: Move (outer, pink), Exercise (middle, green), Stand (inner, blue).
///
/// Matches the SVG ring design from `variation-1b-datastream-real.html`.
/// Each ring is a faint full-circle track plus a trimmed progress arc that starts at 12 o'clock
/// (achieved via `.rotationEffect(.degrees(-90))`). When `exercise >= 1.0` a bright green dot
/// appears at the top of the middle ring to indicate the goal was exceeded.
///
/// Sizing ratios derived from the HTML viewBox-100 geometry:
///   - Outer  (Move):     diameter = `size`,        lineWidth ≈ size × 0.075
///   - Middle (Exercise): diameter = `size × 0.72`, lineWidth ≈ size × 0.065
///   - Inner  (Stand):    diameter = `size × 0.44`, lineWidth ≈ size × 0.055
public struct ActivityRingsView: View {
    public let move: Double
    public let exercise: Double
    public let stand: Double
    public let size: CGFloat

    public init(move: Double, exercise: Double, stand: Double, size: CGFloat = 104) {
        self.move = move
        self.exercise = exercise
        self.stand = stand
        self.size = size
    }

    private var moveLineWidth: CGFloat {
        size * 0.075
    }

    private var exerciseLineWidth: CGFloat {
        size * 0.065
    }

    private var standLineWidth: CGFloat {
        size * 0.055
    }

    public var body: some View {
        ZStack {
            // OUTER: Move ring (pink)
            Circle()
                .stroke(LGColor.accentPink.opacity(0.13), lineWidth: moveLineWidth)

            Circle()
                .trim(from: 0, to: min(move, 1))
                .stroke(
                    LGColor.accentPink,
                    style: StrokeStyle(lineWidth: moveLineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .shadow(color: LGColor.accentPink.opacity(0.4), radius: 4)

            // MIDDLE: Exercise ring (green)
            Circle()
                .stroke(LGColor.accentGreen.opacity(0.10), lineWidth: exerciseLineWidth)
                .frame(width: size * 0.72, height: size * 0.72)

            Circle()
                .trim(from: 0, to: min(exercise, 1))
                .stroke(
                    LGColor.accentGreen,
                    style: StrokeStyle(lineWidth: exerciseLineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .shadow(color: LGColor.accentGreen.opacity(0.4), radius: 4)
                .frame(width: size * 0.72, height: size * 0.72)

            // Exceeded indicator: bright dot at 12 o'clock of the middle ring
            if exercise >= 1.0 {
                Circle()
                    .fill(LGColor.accentGreen)
                    .frame(width: size * 0.08, height: size * 0.08)
                    .shadow(color: LGColor.accentGreen.opacity(0.9), radius: 4)
                    .offset(y: -(size * 0.72 / 2))
            }

            // INNER: Stand ring (blue)
            Circle()
                .stroke(LGColor.accentBlue.opacity(0.10), lineWidth: standLineWidth)
                .frame(width: size * 0.44, height: size * 0.44)

            Circle()
                .trim(from: 0, to: min(stand, 1))
                .stroke(
                    LGColor.accentBlue,
                    style: StrokeStyle(lineWidth: standLineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .shadow(color: LGColor.accentBlue.opacity(0.4), radius: 4)
                .frame(width: size * 0.44, height: size * 0.44)
        }
        .frame(width: size, height: size)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Activity rings")
        .accessibilityValue(
            "Move \(Int((move * 100).rounded()))%, Exercise \(Int((exercise * 100).rounded()))%, Stand \(Int((stand * 100).rounded()))%"
        )
    }
}

// MARK: - Preview

#if os(iOS)
    #Preview("Activity Rings") {
        ActivityRingsView(move: 0.974, exercise: 1.0, stand: 0.917)
            .padding(Spacing.s600)
            .background(LGColor.surfaceBase)
            .preferredColorScheme(.dark)
    }
#endif
