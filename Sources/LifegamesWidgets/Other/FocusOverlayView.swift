import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct FocusOverlayView: View {
    public let props: FocusOverlayProps

    public init(props: FocusOverlayProps) {
        self.props = props
    }

    private let redColor = Color(hex: "#ef4444")

    public var body: some View {
        VStack(spacing: 0) {
            HStack {
                Spacer()
                HStack(spacing: 8) {
                    LiveDotView(color: redColor)
                    Text("SHIFT ACTIVE")
                        .font(.system(size: 9, weight: .semibold))
                        .kerning(2)
                        .foregroundStyle(redColor)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(redColor.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 6))
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(redColor.opacity(0.3), lineWidth: 1)
                )
            }
            .padding(20)

            Spacer()

            VStack(spacing: 24) {
                NoEntryIcon(color: redColor)

                Text("Shift Active")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(Color.colorTextTitle)

                Text("Jonathan is currently heads-down at work. The dashboard will be available after hours.")
                    .font(.system(size: 12))
                    .foregroundStyle(Color.colorTextMuted)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 320)

                Rectangle()
                    .fill(Color.white.opacity(0.06))
                    .frame(maxWidth: 360, maxHeight: 1)

                VStack(spacing: 6) {
                    Text("CURRENT TIME (PST)")
                        .font(.system(size: 9, weight: .medium))
                        .kerning(3)
                        .foregroundStyle(Color.colorTextMuted)

                    Text(props.currentTime.isEmpty ? "--:--:--" : props.currentTime)
                        .font(.system(size: 32, weight: .semibold, design: .monospaced))
                        .foregroundStyle(Color.colorAccentAmber)

                    Text(props.timeZone)
                        .font(.system(size: 10))
                        .kerning(1)
                        .foregroundStyle(Color.colorTextMuted)
                }

                HStack(spacing: 24) {
                    VStack(spacing: 2) {
                        Text("SHIFT START")
                            .font(.system(size: 8, weight: .medium))
                            .kerning(2)
                            .foregroundStyle(Color.colorTextMuted)
                        Text(props.shiftStart)
                            .font(.system(size: 13, weight: .semibold, design: .monospaced))
                            .foregroundStyle(redColor)
                    }
                    VStack(spacing: 2) {
                        Text("SHIFT END")
                            .font(.system(size: 8, weight: .medium))
                            .kerning(2)
                            .foregroundStyle(Color.colorTextMuted)
                        Text(props.shiftEnd)
                            .font(.system(size: 13, weight: .semibold, design: .monospaced))
                            .foregroundStyle(Color.colorAccentGreen)
                    }
                }
            }
            .padding(40)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.white.opacity(0.08), lineWidth: 1)
            )
            .frame(maxWidth: 440)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.colorSurfaceBase)
    }
}

private struct NoEntryIcon: View {
    let color: Color

    var body: some View {
        ZStack {
            Circle()
                .stroke(color, lineWidth: 4)
                .frame(width: 60, height: 60)
                .shadow(color: color.opacity(0.15), radius: 15)
            RoundedRectangle(cornerRadius: 2)
                .fill(color)
                .frame(width: 32, height: 4)
        }
    }
}

#Preview("Focus Overlay") {
    FocusOverlayView(props: FocusOverlayProps(
        isActive: true, currentTime: "10:15:42",
        shiftStart: "07:00", shiftEnd: "15:00"
    ))
    .preferredColorScheme(.dark)
}
