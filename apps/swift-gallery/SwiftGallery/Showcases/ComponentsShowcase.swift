import LifegamesComponents
import LifegamesTokens
import SwiftUI

struct ComponentsShowcase: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 32) {
                header
                indicatorsSection
                statsSection
                headersSection
                effectsSection
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
        }
        .gradientBackground()
        .navigationTitle("Components")
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
            .preferredColorScheme(.dark)
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("/// PRIMITIVES")
                .font(.system(size: 9, weight: .bold, design: .monospaced))
                .kerning(2.5)
                .foregroundStyle(LGColor.purple400)
            Text("Components")
                .font(.system(size: 32, weight: .bold))
                .foregroundStyle(LGColor.textTitle)
            Text("Indicators, stat blocks, headers, and animated affordances — the parts that compose every widget body.")
                .font(.system(size: 13))
                .foregroundStyle(LGColor.textMuted)
                .fixedSize(horizontal: false, vertical: true)
            Rectangle()
                .fill(LinearGradient(
                    colors: [LGColor.purple400, LGColor.accentPink.opacity(0.0)],
                    startPoint: .leading,
                    endPoint: .trailing
                ))
                .frame(height: 1)
                .padding(.top, 4)
        }
    }

    // MARK: - Sections

    private var indicatorsSection: some View {
        section(title: "Indicators") {
            componentCard(token: "HealthRingView", note: "Animated progress ring with center label") {
                HStack(spacing: 20) {
                    HealthRingView(progress: 0.72, color: LGColor.healthRed, label: "Move", value: "432")
                    HealthRingView(progress: 0.85, color: LGColor.healthGreen, label: "Exercise", value: "26m")
                    HealthRingView(progress: 0.60, color: LGColor.accentPurple, label: "Stand", value: "7h")
                }
                .frame(maxWidth: .infinity)
            }
            componentCard(token: "LiveDotView", note: "Pulsing live-status dot") {
                HStack(spacing: 28) {
                    swatch("accentGreen") {
                        LiveDotView(color: LGColor.accentGreen)
                    }
                    swatch("accentPink") {
                        LiveDotView(color: LGColor.accentPink)
                    }
                    swatch("accentBlue") {
                        LiveDotView(color: LGColor.accentBlue)
                    }
                    swatch("accentAmber") {
                        LiveDotView(color: LGColor.accentAmber)
                    }
                }
                .frame(maxWidth: .infinity)
            }
            componentCard(token: "PulsingMapMarker", note: "Map pin with rippling ring") {
                PulsingMapMarker(color: LGColor.accentGreen)
                    .frame(height: 56)
                    .frame(maxWidth: .infinity)
            }
        }
    }

    private var statsSection: some View {
        section(title: "Stats") {
            componentCard(token: "StatItemView", note: "Label + value stat block, optional accent color") {
                HStack {
                    StatItemView(label: "Steps", value: "8,432", valueColor: LGColor.accentGreen)
                    Spacer()
                    StatItemView(label: "Distance", value: "5.2 km")
                    Spacer()
                    StatItemView(label: "Calories", value: "432", valueColor: LGColor.healthRed)
                }
            }
            componentCard(token: "MetricCardView", note: "Icon + value + unit metric card") {
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
        }
    }

    private var headersSection: some View {
        section(title: "Headers") {
            componentCard(token: "WidgetHeaderView", note: "Label + status dot + timestamp; widget chrome") {
                VStack(spacing: 8) {
                    WidgetHeaderView(label: "HEALTH", dotColor: LGColor.accentPink, timestamp: "today")
                    WidgetHeaderView(label: "LOCATION", dotColor: LGColor.accentBlue, timestamp: "live")
                    WidgetHeaderView(label: "BOOKSHELF", dotColor: LGColor.accentAmber, timestamp: "library")
                }
            }
        }
    }

    private var effectsSection: some View {
        section(title: "Backgrounds") {
            componentCard(token: "ECGBackgroundView", note: "Animated electrocardiogram trace") {
                ECGBackgroundView(color: LGColor.accentPink)
                    .frame(height: 80)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
    }

    // MARK: - Section + Component primitives

    private func section<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                Text(title.uppercased())
                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                    .kerning(2.5)
                    .foregroundStyle(LGColor.textSubtle)
                Rectangle()
                    .fill(LGColor.cardGlassBorder)
                    .frame(height: 0.5)
            }
            VStack(spacing: 14) {
                content()
            }
        }
    }

    private func componentCard<Content: View>(token: String, note: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Text(token)
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundStyle(LGColor.accentPink)
                Text("—  \(note)")
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundStyle(LGColor.textSubtle)
                    .lineLimit(1)
                    .truncationMode(.tail)
            }
            content()
                .padding(.top, 6)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(LGColor.surfaceRaised.opacity(0.4))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(LGColor.cardGlassBorder, lineWidth: 0.5)
        )
    }

    private func swatch<Content: View>(_ label: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(spacing: 6) {
            content()
            Text(label)
                .font(.system(size: 9, design: .monospaced))
                .foregroundStyle(LGColor.textMuted)
        }
    }
}

#Preview("Components") {
    NavigationStack {
        ComponentsShowcase()
    }
    .preferredColorScheme(.dark)
}
