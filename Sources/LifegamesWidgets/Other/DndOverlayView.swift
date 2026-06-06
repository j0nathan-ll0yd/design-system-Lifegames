import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct DndOverlayView: View {
    public let props: DndOverlayProps

    public init(props: DndOverlayProps) {
        self.props = props
    }

    private let cyanColor = LGColor.accentCyan

    public var body: some View {
        VStack(spacing: 0) {
            HStack {
                Spacer()
                HStack(spacing: 8) {
                    LiveDotView(color: cyanColor)
                    Text("PRIVACY MODE")
                        .font(.system(size: 9, weight: .semibold))
                        .kerning(2)
                        .foregroundStyle(cyanColor)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(cyanColor.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 6))
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(cyanColor.opacity(0.3), lineWidth: 1)
                )
            }
            .padding(20)

            Spacer()

            VStack(spacing: 20) {
                ShieldIcon(color: cyanColor)

                Text("CONTENT REDACTED")
                    .font(.system(size: 18, weight: .bold))
                    .kerning(2)
                    .foregroundStyle(cyanColor)

                Text("Do Not Disturb is active. Personal health, location, and activity data has been temporarily redacted to protect privacy during this session.")
                    .font(.system(size: 12))
                    .foregroundStyle(Color.colorTextMuted)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 340)

                VStack(spacing: 6) {
                    RedactedRow(text: "Heart Rate: 72 BPM", color: cyanColor)
                    RedactedRow(text: "Location: San Francisco, CA", color: cyanColor)
                    RedactedRow(text: "Daily Steps: 8,421", color: cyanColor)
                    RedactedRow(text: "Sleep Duration: 7h 23m", color: cyanColor)
                    RedactedRow(text: "Status: Online", color: cyanColor)
                }
                .frame(maxWidth: 360)

                Rectangle()
                    .fill(Color.white.opacity(0.06))
                    .frame(maxWidth: 360, maxHeight: 1)
                    .padding(.vertical, 12)

                VStack(spacing: 6) {
                    Text("CURRENT TIME (PST)")
                        .font(.system(size: 9, weight: .medium))
                        .kerning(3)
                        .foregroundStyle(Color.colorTextMuted)

                    Text(props.currentTime.isEmpty ? "--:--:--" : props.currentTime)
                        .font(.system(size: 32, weight: .semibold, design: .monospaced))
                        .foregroundStyle(cyanColor)

                    Text(props.timeZone)
                        .font(.system(size: 10))
                        .kerning(1)
                        .foregroundStyle(Color.colorTextMuted)
                }
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.colorSurfaceBase)
    }
}

private struct ShieldIcon: View {
    let color: Color
    @State private var glowing = false

    var body: some View {
        Image(systemName: "shield.checkered")
            .font(.system(size: 40))
            .foregroundStyle(color.opacity(0.6))
            .shadow(color: color.opacity(glowing ? 0.35 : 0.15), radius: 20)
            .animation(.easeInOut(duration: 2).repeatForever(autoreverses: true), value: glowing)
            .task { glowing = true }
    }
}

private struct RedactedRow: View {
    let text: String
    let color: Color

    var body: some View {
        ZStack {
            Text(text)
                .font(.system(size: 12))
                .foregroundStyle(Color.white.opacity(0.3))
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(Color.white.opacity(0.03))
                .clipShape(RoundedRectangle(cornerRadius: 6))

            RoundedRectangle(cornerRadius: 6)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(color.opacity(0.1), lineWidth: 1)
                )
        }
    }
}

#Preview("DND Overlay") {
    DndOverlayView(props: DndOverlayProps(isActive: true, currentTime: "14:32:07"))
        .preferredColorScheme(.dark)
}
