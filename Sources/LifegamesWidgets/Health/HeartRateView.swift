import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct HeartRateView: View {
    public let props: HeartRateProps

    public init(props: HeartRateProps) {
        self.props = props
    }

    private var accentColor: Color {
        switch props.zoneColor {
        case "green": return Color.colorAccentGreen
        case "amber": return Color.colorAccentAmber
        case "pink": return Color.colorAccentPink
        case "red": return Color(hex: "#ef4444")
        default: return Color.colorAccentGreen
        }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "HEART RATE", dotColor: accentColor, timestamp: "live")

            ZStack {
                ECGBackgroundView(color: accentColor)
                    .frame(height: 80)
                    .opacity(0.4)

                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(alignment: .firstTextBaseline, spacing: 4) {
                            Text("\(props.bpm)")
                                .font(.system(size: 36, weight: .bold, design: .monospaced))
                                .foregroundStyle(accentColor)
                                .neonGlow(accentColor, radius: 4)
                            Text("BPM")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(Color.colorTextMuted)
                        }

                        Text(props.zone)
                            .font(.system(size: 10, weight: .semibold))
                            .textCase(.uppercase)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(accentColor.opacity(0.15))
                            .foregroundStyle(accentColor)
                            .clipShape(Capsule())
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 2) {
                        Text("HRV")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundStyle(Color.colorTextMuted)
                        Text("\(props.hrv)")
                            .font(.system(size: 22, weight: .bold, design: .monospaced))
                            .foregroundStyle(Color.colorAccentPurple)
                        Text("ms")
                            .font(.system(size: 10))
                            .foregroundStyle(Color.colorTextMuted)
                    }
                }
                .padding(.horizontal, 18)
            }
            .padding(.bottom, 12)
        }
        .neonCard(accent: accentColor)
    }
}

#Preview("Heart Rate") {
    VStack(spacing: 16) {
        HeartRateView(props: HeartRateProps(bpm: 62, hrv: 45, zone: "Resting"))
        HeartRateView(props: HeartRateProps(bpm: 142, hrv: 28, zone: "Elevated"))
    }
    .padding()
    .background(Color.colorSurfaceBase)
    .preferredColorScheme(.dark)
}
