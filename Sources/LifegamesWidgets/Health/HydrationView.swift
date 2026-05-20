import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct HydrationView: View {
    public let props: HydrationProps

    public init(props: HydrationProps) {
        self.props = props
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "HYDRATION", dotColor: Color.colorAccentPink, timestamp: "today")

            HStack(spacing: 0) {
                VesselView(
                    label: "Water",
                    value: "\(props.waterOz) oz",
                    fillPercent: props.waterPercent,
                    color: Color.colorAccentBlue
                )

                Rectangle()
                    .fill(Color.white.opacity(0.06))
                    .frame(width: 1, height: 80)

                VesselView(
                    label: "Caffeine",
                    value: "\(props.caffeineMg) mg",
                    fillPercent: props.caffeinePercent,
                    color: Color.colorAccentAmber
                )
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: Color.colorAccentPink)
    }
}

private struct VesselView: View {
    let label: String
    let value: String
    let fillPercent: Double
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            ZStack(alignment: .bottom) {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.white.opacity(0.04))
                    .frame(width: 44, height: 80)

                RoundedRectangle(cornerRadius: 6)
                    .fill(
                        LinearGradient(
                            colors: [color.opacity(0.6), color.opacity(0.3)],
                            startPoint: .bottom,
                            endPoint: .top
                        )
                    )
                    .frame(width: 40, height: 76 * fillPercent)
                    .animation(.easeInOut(duration: 1.2), value: fillPercent)
            }

            Text(value)
                .font(.system(size: 12, weight: .bold, design: .monospaced))
                .foregroundStyle(color)

            Text(label)
                .font(.system(size: 10))
                .foregroundStyle(Color.colorTextMuted)
        }
        .frame(maxWidth: .infinity)
    }
}

#Preview("Hydration") {
    HydrationView(props: HydrationProps(
        waterOz: 54, caffeineMg: 280, waterMax: 100, caffeineMax: 500,
        waterRangeLo: 64, waterRangeHi: 80, caffeineRangeLo: 200, caffeineRangeHi: 400
    ))
    .padding()
    .background(Color.colorSurfaceBase)
    .preferredColorScheme(.dark)
}
