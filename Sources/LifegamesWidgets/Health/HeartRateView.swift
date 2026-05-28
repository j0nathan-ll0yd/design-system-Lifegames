import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct HeartRateView: View {
    private let state: WidgetState<HeartRateProps>
    private let animateECG: Bool

    public init(state: WidgetState<HeartRateProps>) {
        self.state = state
        animateECG = true
    }

    public init(props: HeartRateProps) {
        state = .populated(props)
        animateECG = true
    }

    /// Test seam: renders the ECG as a static (non-scrolling) trace so populated
    /// snapshots are deterministic. Production always animates.
    init(props: HeartRateProps, animateECG: Bool) {
        state = .populated(props)
        self.animateECG = animateECG
    }

    public var body: some View {
        switch state {
        case .loading:
            HeartRateSkeletonView()
        case .empty:
            HeartRateEmptyView()
        case let .populated(props):
            HeartRatePopulatedView(props: props, animateECG: animateECG)
        }
    }
}

private struct HeartRatePopulatedView: View {
    let props: HeartRateProps
    var animateECG = true

    private var zone: HeartRateZone {
        props.heartRateZone
    }

    private func hrvColor(_ hrv: Int) -> Color {
        if hrv >= 40 { return LGColor.accentGreen }
        if hrv >= 20 { return LGColor.accentAmber }
        return LGColor.accentRed
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "HEART RATE", dotColor: zone.accentColor, timestamp: "live")

            ZStack {
                ECGBackgroundView(color: zone.accentColor, bpm: Double(props.bpm), animated: animateECG)
                    .frame(height: 80)
                    .opacity(zone.ecgOpacity)

                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(alignment: .firstTextBaseline, spacing: 4) {
                            Text("\(props.bpm)")
                                .font(.system(size: 36, weight: .bold, design: .monospaced))
                                .foregroundStyle(zone.accentColor)
                                .neonGlow(zone.accentColor, radius: zone.bpmShadowIntensity * 20)
                            Text("BPM")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(LGColor.textMuted)
                        }

                        Text(zone.name)
                            .font(.system(size: 10, weight: .semibold))
                            .textCase(.uppercase)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(zone.accentColor.opacity(0.15))
                            .foregroundStyle(zone.accentColor)
                            .clipShape(Capsule())
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 2) {
                        Text("HRV")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundStyle(LGColor.textMuted)
                        Text("\(props.hrv)")
                            .font(.system(size: 22, weight: .bold, design: .monospaced))
                            .foregroundStyle(hrvColor(props.hrv))
                        Text("ms")
                            .font(.system(size: 10))
                            .foregroundStyle(LGColor.textMuted)
                    }
                }
                .padding(.horizontal, 18)
            }
            .padding(.bottom, 12)
        }
        .neonCard(accent: zone.accentColor)
    }
}

private struct HeartRateSkeletonView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "HEART RATE", dotColor: LGColor.accentPink, timestamp: "live")

            ZStack {
                RoundedRectangle(cornerRadius: 4)
                    .fill(LGColor.surfaceRaised)
                    .frame(height: 80)
                    .opacity(0.3)

                HStack {
                    VStack(alignment: .leading, spacing: 8) {
                        SkeletonBar(width: 80, height: 36)
                        SkeletonBar(width: 60, height: 20, cornerRadius: 10)
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 6) {
                        SkeletonBar(width: 24, height: 10)
                        SkeletonBar(width: 44, height: 22)
                        SkeletonBar(width: 16, height: 10)
                    }
                }
                .padding(.horizontal, 18)
            }
            .padding(.bottom, 12)
        }
        .neonCard(accent: LGColor.accentPink)
    }
}

private struct HeartRateEmptyView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "HEART RATE", dotColor: LGColor.accentPink)

            VStack {
                Image(systemName: "heart.slash")
                    .font(.system(size: 28))
                    .foregroundStyle(LGColor.textMuted)
                Text("No heart rate data")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(LGColor.textMuted)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 80)
            .padding(.bottom, 12)
        }
        .neonCard(accent: LGColor.accentPink)
    }
}

#Preview("Heart Rate — Populated") {
    ScrollView {
        VStack(spacing: 16) {
            HeartRateView(props: HeartRateProps(bpm: 38, hrv: 55, zone: "Bradycardia"))
            HeartRateView(props: HeartRateProps(bpm: 52, hrv: 42, zone: "Resting Zone"))
            HeartRateView(props: HeartRateProps(bpm: 72, hrv: 35, zone: "Normal Zone"))
            HeartRateView(props: HeartRateProps(bpm: 115, hrv: 18, zone: "Fat Burn"))
            HeartRateView(props: HeartRateProps(bpm: 162, hrv: 8, zone: "Peak Zone"))
        }
        .padding()
    }
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

#Preview("Heart Rate — Loading") {
    HeartRateView(state: .loading)
        .padding()
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
}

#Preview("Heart Rate — Empty") {
    HeartRateView(state: .empty)
        .padding()
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
}
