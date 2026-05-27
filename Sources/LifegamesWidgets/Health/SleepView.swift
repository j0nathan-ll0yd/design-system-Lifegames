import LifegamesComponents
import LifegamesTokens
import SwiftUI

/// Sleep widget rendering total duration, four phase capsules, and optional score.
///
/// Phase colour mapping (matches production iOS sleep section):
/// - Core  -> `LGColor.accentBlue`
/// - Deep  -> `LGColor.accentPurple`
/// - REM   -> `LGColor.accentCyan`
/// - Awake -> `LGColor.textMuted`
public struct SleepView: View {
    public let props: SleepProps

    public init(props: SleepProps) {
        self.props = props
    }

    private struct PhaseInfo {
        let label: String
        let formatted: String
        let color: Color
    }

    private var phases: [PhaseInfo] {
        [
            PhaseInfo(label: "Core", formatted: props.coreFormatted, color: LGColor.accentBlue),
            PhaseInfo(label: "Deep", formatted: props.deepFormatted, color: LGColor.accentPurple),
            PhaseInfo(label: "REM", formatted: props.remFormatted, color: LGColor.accentCyan),
            PhaseInfo(label: "Awake", formatted: props.awakeFormatted, color: LGColor.textMuted),
        ]
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline, spacing: 12) {
                Text(props.duration)
                    .font(.system(size: 24, weight: .bold))
                    .foregroundStyle(LGColor.textTitle)

                if let score = props.sleepScore {
                    HStack(spacing: 6) {
                        Text("SCORE")
                            .font(.system(size: 9, weight: .bold, design: .monospaced))
                            .kerning(2)
                            .foregroundStyle(LGColor.textMuted)
                        Text("\(score)")
                            .font(.system(size: 13, weight: .bold, design: .monospaced))
                            .foregroundStyle(LGColor.accentPurple)
                    }
                }

                Spacer(minLength: 0)
            }

            HStack(spacing: 8) {
                ForEach(Array(phases.enumerated()), id: \.offset) { _, phase in
                    VStack(spacing: 3) {
                        Text(phase.label)
                            .font(.system(size: 9))
                            .foregroundStyle(LGColor.textMuted)
                        Text(phase.formatted)
                            .font(.system(size: 11, weight: .semibold, design: .monospaced))
                            .foregroundStyle(phase.color)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
                    .background(phase.color.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
        }
        .padding(16)
    }
}

#Preview("Sleep") {
    VStack(spacing: 16) {
        SleepView(props: SleepProps(
            duration: "7h 24m",
            coreFormatted: "3h 32m",
            deepFormatted: "1h 12m",
            remFormatted: "1h 48m",
            awakeFormatted: "0h 52m",
            sleepScore: 82
        ))

        SleepView(props: SleepProps(
            duration: "5h 41m",
            coreFormatted: "2h 50m",
            deepFormatted: "0h 48m",
            remFormatted: "1h 33m",
            awakeFormatted: "0h 30m",
            sleepScore: nil
        ))
    }
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}
