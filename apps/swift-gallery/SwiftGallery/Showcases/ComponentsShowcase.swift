import LifegamesComponents
import LifegamesTokens
import SwiftUI

struct ComponentsShowcase: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                componentSection("HealthRingView") {
                    HStack(spacing: 20) {
                        HealthRingView(progress: 0.72, color: LGColor.healthRed, label: "Move", value: "432")
                        HealthRingView(progress: 0.85, color: LGColor.healthGreen, label: "Exercise", value: "26m")
                        HealthRingView(progress: 0.60, color: LGColor.accentPurple, label: "Stand", value: "7h")
                    }
                    .frame(maxWidth: .infinity)
                }

                componentSection("StatItemView") {
                    HStack {
                        StatItemView(label: "Steps", value: "8,432", valueColor: LGColor.accentGreen)
                        Spacer()
                        StatItemView(label: "Distance", value: "5.2 km")
                        Spacer()
                        StatItemView(label: "Calories", value: "432", valueColor: LGColor.healthRed)
                    }
                }

                componentSection("MetricCardView") {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        MetricCardView(
                            title: "Heart Rate", value: "72", unit: "bpm",
                            icon: "heart.fill", color: LGColor.accentPink
                        )
                        MetricCardView(
                            title: "Steps", value: "8,247",
                            icon: "figure.walk", color: LGColor.accentGreen
                        )
                    }
                }

                componentSection("WidgetHeaderView") {
                    VStack(spacing: 8) {
                        WidgetHeaderView(label: "HEALTH", dotColor: LGColor.accentPink, timestamp: "today")
                        WidgetHeaderView(label: "LOCATION", dotColor: LGColor.accentBlue, timestamp: "live")
                        WidgetHeaderView(label: "BOOKSHELF", dotColor: LGColor.accentAmber, timestamp: "library")
                    }
                }

                componentSection("LiveDotView") {
                    HStack(spacing: 20) {
                        VStack(spacing: 6) {
                            LiveDotView(color: LGColor.accentGreen)
                            Text("neonGreen")
                                .font(.system(size: 9, design: .monospaced))
                                .foregroundStyle(LGColor.textMuted)
                        }
                        VStack(spacing: 6) {
                            LiveDotView(color: LGColor.accentPink)
                            Text("neonPink")
                                .font(.system(size: 9, design: .monospaced))
                                .foregroundStyle(LGColor.textMuted)
                        }
                        VStack(spacing: 6) {
                            LiveDotView(color: LGColor.accentBlue)
                            Text("neonBlue")
                                .font(.system(size: 9, design: .monospaced))
                                .foregroundStyle(LGColor.textMuted)
                        }
                    }
                }

                componentSection("PulsingMapMarker") {
                    PulsingMapMarker(color: LGColor.accentGreen)
                        .frame(height: 50)
                }

                componentSection("ECGBackgroundView") {
                    ECGBackgroundView(color: LGColor.accentPink)
                        .frame(height: 60)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
            .padding()
        }
        .gradientBackground()
        .navigationTitle("Components")
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
            .preferredColorScheme(.dark)
    }

    private func componentSection<Content: View>(_ name: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(name)
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .kerning(1)
                .foregroundStyle(LGColor.textSubtle)
                .textCase(.uppercase)
            content()
        }
    }
}

#Preview("Components") {
    NavigationStack {
        ComponentsShowcase()
    }
    .preferredColorScheme(.dark)
}
