import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct StreakFlameView: View {
    public let currentStreak: Int
    public let longestStreak: Int
    public let totalActiveDays: Int

    public init(currentStreak: Int, longestStreak: Int, totalActiveDays: Int) {
        self.currentStreak = currentStreak
        self.longestStreak = longestStreak
        self.totalActiveDays = totalActiveDays
    }

    @State private var flameScale: CGFloat = 1.0

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "STREAK", dotColor: Color.colorAccentAmber, timestamp: "streak")

            VStack(spacing: 0) {
                VStack(spacing: 4) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 32))
                        .foregroundStyle(Color.colorAccentAmber)
                        .shadow(color: Color.colorAccentAmber.opacity(0.6), radius: 8)
                        .scaleEffect(flameScale)
                        .animation(.easeInOut(duration: 2).repeatForever(autoreverses: true), value: flameScale)
                        .task { flameScale = 1.08 }

                    Text("\(currentStreak)")
                        .font(.system(size: 38, weight: .bold, design: .rounded))
                        .foregroundStyle(Color.colorAccentAmber)
                        .shadow(color: Color.colorAccentAmber.opacity(0.5), radius: 16)

                    Text("day streak")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(Color.colorTextMuted)
                        .textCase(.uppercase)
                        .tracking(1.2)
                }

                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [.clear, Color.colorAccentAmber.opacity(0.3), .clear],
                            startPoint: .leading, endPoint: .trailing
                        )
                    )
                    .frame(width: 60, height: 1)
                    .padding(.vertical, 10)

                HStack(spacing: 24) {
                    VStack(spacing: 2) {
                        Text("\(longestStreak)")
                            .font(.system(size: 18, weight: .bold, design: .rounded))
                            .foregroundStyle(Color.colorAccentAmber)
                        Text("Longest")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundStyle(Color.colorTextMuted)
                            .textCase(.uppercase)
                            .tracking(0.8)
                    }
                    VStack(spacing: 2) {
                        Text("\(totalActiveDays)")
                            .font(.system(size: 18, weight: .bold, design: .rounded))
                            .foregroundStyle(Color.colorAccentAmber)
                        Text("Active Days")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundStyle(Color.colorTextMuted)
                            .textCase(.uppercase)
                            .tracking(0.8)
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: Color.colorAccentAmber)
    }
}
