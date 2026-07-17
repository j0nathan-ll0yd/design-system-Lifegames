import LifegamesComponents
import LifegamesCopy
import LifegamesTokens
import SwiftUI

private let heartRateCopy = CopyLoader.widgets.heartRate

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
            if props.watchPaused {
                HeartRatePausedView(charging: props.watchCharging)
            } else {
                HeartRatePopulatedView(props: props, animateECG: animateECG)
            }
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
        if hrv >= 40 {
            return LGColor.accentGreen
        }
        if hrv >= 20 {
            return LGColor.accentAmber
        }
        return LGColor.accentRed
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: heartRateCopy.title.uppercased(), dotColor: zone.accentColor, timestamp: heartRateCopy.timestampLive)

            // widget-body padding: 14px top, 18px horizontal, 16px bottom
            VStack(alignment: .leading, spacing: 0) {
                ZStack {
                    ECGBackgroundView(color: zone.accentColor, bpm: Double(props.bpm), animated: animateECG)
                        // web canvas height is 120px; min-height of hr-layout is 108px
                        .frame(height: 108)
                        .opacity(zone.ecgOpacity)

                    HStack {
                        VStack(alignment: .leading, spacing: 6) {
                            HStack(alignment: .firstTextBaseline, spacing: 6) {
                                // web: clamp(2.1rem,1.7rem+1.5vw,2.8rem) ≈ 38pt at 380px
                                // letter-spacing: -0.02em → tracking(-0.76); dual glow shadows
                                Text("\(props.bpm)")
                                    .font(.system(size: 38, weight: .bold, design: .monospaced))
                                    .tracking(-0.76)
                                    .foregroundStyle(zone.accentColor)
                                    .shadow(color: zone.accentColor.opacity(0.6), radius: 8, x: 0, y: 0)
                                    .shadow(color: zone.accentColor.opacity(0.25), radius: 20, x: 0, y: 0)
                                // web: cap2 ≈ 10pt, letter-spacing 2px, weight 500, margin-left 6px
                                Text(heartRateCopy.bpm)
                                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                                    .kerning(2)
                                    .foregroundStyle(LGColor.textMuted)
                            }

                            // web: pulse-status-badge cap2 ≈ 10pt, weight 600, padding 3px 10px
                            Text(zone.name)
                                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                                .textCase(.uppercase)
                                .kerning(2)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 3)
                                .background(zone.accentColor.opacity(0.12))
                                .overlay(
                                    Capsule()
                                        .stroke(zone.accentColor.opacity(0.25), lineWidth: 1)
                                )
                                .foregroundStyle(zone.accentColor)
                                .clipShape(Capsule())
                        }

                        Spacer()

                        // web: hrv-label letter-spacing 0.18em → kerning(1.8); hrv-value dual glow;
                        //      hrv-unit letter-spacing 0.10em → kerning(1.0)
                        VStack(alignment: .trailing, spacing: 2) {
                            Text(heartRateCopy.hrv)
                                .font(.system(size: 10, weight: .medium, design: .monospaced))
                                .kerning(1.8)
                                .foregroundStyle(LGColor.textMuted)
                            Text("\(props.hrv)")
                                .font(.system(size: 17, weight: .bold, design: .monospaced))
                                .foregroundStyle(hrvColor(props.hrv))
                                .shadow(color: hrvColor(props.hrv).opacity(0.5), radius: 6, x: 0, y: 0)
                                .shadow(color: hrvColor(props.hrv).opacity(0.2), radius: 15, x: 0, y: 0)
                            Text(heartRateCopy.hrvUnit)
                                .font(.system(size: 10, design: .monospaced))
                                .kerning(1.0)
                                .foregroundStyle(LGColor.textMuted)
                        }
                    }
                    .padding(.horizontal, 2)
                }

                DailyVitalsFooterView(
                    restingHeartRate: props.restingHeartRate,
                    respiratoryRate: props.respiratoryRate,
                    wristTemperatureDelta: props.wristTemperatureDelta
                )
            }
            .padding(.top, 14)
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: zone.accentColor)
    }
}

// MARK: - HR Footer — compact 3-up vitals ribbon (visual weight matches Movement swatch row)

private struct DailyVitalsFooterView: View {
    let restingHeartRate: Double?
    let respiratoryRate: Double?
    let wristTemperatureDelta: Double?

    private var rhrValue: String {
        guard let rhr = restingHeartRate else { return "—" }
        return "\(Int(rhr.rounded()))"
    }

    private var rrValue: String {
        guard let rr = respiratoryRate else { return "—" }
        return "\(Int(rr.rounded()))"
    }

    private var tempValue: String {
        guard let delta = wristTemperatureDelta else { return "—" }
        let sign = delta >= 0 ? "+" : ""
        return "\(sign)\(String(format: "%.1f", delta))"
    }

    var body: some View {
        HStack(spacing: 0) {
            VitalRibbonCell(label: heartRateCopy.rhr, value: rhrValue, unit: heartRateCopy.rhrUnit)
            Spacer()
            VitalRibbonCell(label: heartRateCopy.rr, value: rrValue, unit: heartRateCopy.rrUnit)
            Spacer()
            VitalRibbonCell(label: heartRateCopy.temp.uppercased(), value: tempValue, unit: "°C")
        }
        .padding(.vertical, 3)
        .padding(.top, 8) // margin above the divider
        .overlay(alignment: .top) {
            Rectangle()
                .fill(Color.white.opacity(0.06))
                .frame(height: 1)
        }
    }
}

/// Compact inline label+value cell — matches Movement swatch ribbon visual weight.
/// label: 8pt medium mono kerning 1.2; value: 11pt semibold mono; unit: 8pt muted mono.
private struct VitalRibbonCell: View {
    let label: String
    let value: String
    let unit: String

    var body: some View {
        HStack(spacing: 4) {
            Text(label)
                .font(.system(size: 8, weight: .medium, design: .monospaced))
                .kerning(1.2)
                .foregroundStyle(LGColor.textMuted)
            HStack(alignment: .firstTextBaseline, spacing: 1) {
                Text(value)
                    .font(.system(size: 10, weight: .semibold, design: .monospaced))
                    .foregroundStyle(LGColor.textTitle)
                Text(unit)
                    .font(.system(size: 8, design: .monospaced))
                    .foregroundStyle(LGColor.textMuted.opacity(0.7))
            }
        }
    }
}

private struct HeartRateSkeletonView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: heartRateCopy.title.uppercased(), dotColor: LGColor.accentPink, timestamp: heartRateCopy.timestampLive)

            VStack(alignment: .leading, spacing: 0) {
                ZStack {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(LGColor.surfaceRaised)
                        .frame(height: 108)
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
                    .padding(.horizontal, 2)
                }
            }
            .padding(.top, 14)
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: LGColor.accentPink)
    }
}

private struct HeartRateEmptyView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: heartRateCopy.title.uppercased(), dotColor: LGColor.accentPink)

            VStack {
                Image(systemName: "heart.slash")
                    .font(.system(size: 28))
                    .foregroundStyle(LGColor.textMuted)
                Text(heartRateCopy.empty)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(LGColor.textMuted)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 108)
            .padding(.top, 14)
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: LGColor.accentPink)
    }
}

// MARK: - Paused

/// Shown when `HeartRateProps.watchPaused` is true. Replaces the populated content
/// entirely — no stale data is ever displayed. Mirrors `HeartRateEmptyView` structure
/// so the card footprint is identical: full-height placeholder, same neonCard chrome.
/// The `charging` variant swaps the copy only (label/description), matching the web
/// widget's `watch.source === 'charging'` path — same icon, same chrome.
private struct HeartRatePausedView: View {
    var charging = false

    private var label: String {
        charging ? heartRateCopy.paused.labelCharging : heartRateCopy.paused.label
    }

    private var pausedDescription: String {
        charging ? heartRateCopy.paused.descriptionCharging : heartRateCopy.paused.description
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: heartRateCopy.title.uppercased(), dotColor: LGColor.accentPink)

            VStack {
                Image(systemName: "applewatch.slash")
                    .font(.system(size: 28))
                    .foregroundStyle(LGColor.textMuted)
                Text(label)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(LGColor.textMuted)
                Text(pausedDescription)
                    .font(.system(size: 11))
                    .foregroundStyle(LGColor.textMuted.opacity(0.7))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 108)
            .padding(.top, 14)
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: LGColor.accentPink)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(heartRateCopy.title). \(label). \(pausedDescription)")
    }
}

#Preview("Heart Rate — Populated") {
    ScrollView {
        VStack(spacing: 16) {
            HeartRateView(props: HeartRateProps(
                bpm: 38, hrv: 55, zone: "Bradycardia",
                restingHeartRate: 54, respiratoryRate: 14, wristTemperatureDelta: 0.2
            ))
            HeartRateView(props: HeartRateProps(
                bpm: 52, hrv: 42, zone: "Resting Zone",
                restingHeartRate: 54, respiratoryRate: 14, wristTemperatureDelta: 0.2
            ))
            HeartRateView(props: HeartRateProps(
                bpm: 72, hrv: 35, zone: "Normal Zone",
                restingHeartRate: 54, respiratoryRate: 14, wristTemperatureDelta: 0.2
            ))
            HeartRateView(props: HeartRateProps(
                bpm: 115, hrv: 18, zone: "Fat Burn",
                restingHeartRate: 54, respiratoryRate: 14, wristTemperatureDelta: 0.2
            ))
            HeartRateView(props: HeartRateProps(
                bpm: 162, hrv: 8, zone: "Peak Zone",
                restingHeartRate: 54, respiratoryRate: 14, wristTemperatureDelta: 0.2
            ))
        }
        .padding()
    }
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

#Preview("Heart Rate — Footer Partial") {
    HeartRateView(props: HeartRateProps(
        bpm: 72, hrv: 35, zone: "Normal Zone",
        restingHeartRate: 54, respiratoryRate: nil, wristTemperatureDelta: nil
    ))
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

#Preview("Heart Rate — Footer Empty") {
    HeartRateView(props: HeartRateProps(
        bpm: 72, hrv: 35, zone: "Normal Zone",
        restingHeartRate: nil, respiratoryRate: nil, wristTemperatureDelta: nil
    ))
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

#Preview("Heart Rate — Temp Negative") {
    HeartRateView(props: HeartRateProps(
        bpm: 60, hrv: 48, zone: "Resting Zone",
        restingHeartRate: 56, respiratoryRate: 13, wristTemperatureDelta: -0.1
    ))
    .padding()
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

#Preview("Heart Rate — Paused") {
    HeartRateView(props: HeartRateProps(
        bpm: 72, hrv: 35, zone: "Normal Zone",
        restingHeartRate: 54, respiratoryRate: 14, wristTemperatureDelta: 0.2,
        watchPaused: true
    ))
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

#Preview("Heart Rate — Paused (charging)") {
    HeartRateView(props: HeartRateProps(
        bpm: 72, hrv: 35, zone: "Normal Zone",
        restingHeartRate: 54, respiratoryRate: 14, wristTemperatureDelta: 0.2,
        watchPaused: true, watchCharging: true
    ))
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}
