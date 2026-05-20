import LifegamesTokens
import SwiftUI

public struct HealthRingView: View {
    public let progress: Double
    public let color: Color
    public let label: String
    public let value: String
    public var lineWidth: CGFloat
    public var size: CGFloat

    public init(
        progress: Double, color: Color, label: String, value: String,
        lineWidth: CGFloat = 8, size: CGFloat = 80
    ) {
        self.progress = progress
        self.color = color
        self.label = label
        self.value = value
        self.lineWidth = lineWidth
        self.size = size
    }

    public var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .stroke(color.opacity(0.15), lineWidth: lineWidth)

                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(
                        color,
                        style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))

                Text(value)
                    .font(.system(size: size * 0.22, weight: .semibold, design: .rounded))
                    .foregroundStyle(Color.colorTextTitle)
            }
            .frame(width: size, height: size)

            Text(label)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Color.colorTextMuted)
        }
    }
}

#Preview("Health Ring") {
    HStack(spacing: 20) {
        HealthRingView(progress: 0.72, color: Color.colorHealthRed, label: "Move", value: "432")
        HealthRingView(progress: 0.85, color: Color.colorHealthGreen, label: "Exercise", value: "26m")
        HealthRingView(progress: 0.60, color: Color.colorAccentPurple, label: "Stand", value: "7h")
    }
    .padding()
    .background(Color.colorSurfaceBase)
    .preferredColorScheme(.dark)
}
