import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct OGImageView: View {
    public let props: OGImageProps

    public init(props: OGImageProps) {
        self.props = props
    }

    public var body: some View {
        ZStack {
            Color.colorSurfaceBase

            VStack(spacing: 0) {
                gradientBar
                Spacer()
                gradientBar
            }

            HStack(spacing: 0) {
                avatarSection
                    .frame(width: 200)

                Rectangle()
                    .fill(Color.white.opacity(0.04))
                    .frame(width: 1)
                    .padding(.vertical, 40)

                metricsSection
                    .frame(maxWidth: .infinity)
            }
        }
        .frame(width: 600, height: 315)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var gradientBar: some View {
        LinearGradient(
            colors: [Color.colorAccentPink, Color.colorAccentBlue, Color.colorAccentGreen],
            startPoint: .leading,
            endPoint: .trailing
        )
        .frame(height: 2)
    }

    private var avatarSection: some View {
        VStack(spacing: 12) {
            Circle()
                .fill(
                    LinearGradient(
                        colors: [Color.colorAccentPink.opacity(0.3), Color.colorAccentBlue.opacity(0.2)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 80, height: 80)
                .overlay(
                    Circle()
                        .stroke(Color.colorAccentPink.opacity(0.25), lineWidth: 1.5)
                )
                .overlay(
                    Image(systemName: "person.fill")
                        .font(.system(size: 30))
                        .foregroundStyle(Color.colorAccentPink.opacity(0.5))
                )

            Text(props.name)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(Color.colorTextTitle)

            Text(props.title)
                .font(.system(size: 7, weight: .medium))
                .kerning(2)
                .foregroundStyle(Color.colorAccentPink)
        }
    }

    private var metricsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("HUMAN DATASTREAM")
                .font(.system(size: 8))
                .kerning(4)
                .foregroundStyle(Color.colorTextMuted)

            HStack(spacing: 24) {
                OGMetric(label: "HEART RATE", value: "58", unit: "BPM", color: Color.colorAccentAmber)
                OGMetric(label: "SLEEP", value: "7h 24m", color: Color.colorAccentPurple)
                OGMetric(label: "STEPS", value: "6,842", color: Color.colorAccentPink)
            }

            HStack(spacing: 24) {
                OGMetric(label: "CONTRIBUTIONS", value: "1,847", color: Color.colorAccentGreen)
                OGMetric(label: "REPOSITORIES", value: "42", color: Color.colorAccentBlue)
                OGMetric(label: "HYDRATION", value: "74 oz", color: Color.colorAccentBlue)
            }

            Text(props.quote)
                .font(.system(size: 10))
                .italic()
                .foregroundStyle(Color.white.opacity(0.25))

            Text(props.experience)
                .font(.system(size: 8, design: .monospaced))
                .foregroundStyle(Color.colorTextMuted)
        }
        .padding(.horizontal, 24)
    }
}

private struct OGMetric: View {
    let label: String
    let value: String
    var unit: String?
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.system(size: 6))
                .kerning(1)
                .foregroundStyle(Color.colorTextMuted)

            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(value)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(color)
                if let unit {
                    Text(unit)
                        .font(.system(size: 9))
                        .foregroundStyle(Color.colorTextMuted)
                }
            }
        }
    }
}

#Preview("OG Image") {
    OGImageView(props: OGImageProps())
        .padding()
        .background(Color.colorSurfaceBase)
        .preferredColorScheme(.dark)
}
