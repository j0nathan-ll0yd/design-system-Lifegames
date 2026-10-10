import LifegamesComponents
import LifegamesCopy
import LifegamesTokens
import SwiftUI

private let movementCopy = CopyLoader.widgets.movement

public struct MovementRingsView: View {
    private let state: WidgetState<MovementRingsProps>

    public init(state: WidgetState<MovementRingsProps>) {
        self.state = state
    }

    public init(props: MovementRingsProps) {
        state = .populated(props)
    }

    public var body: some View {
        switch state {
        case .loading:
            MovementRingsSkeletonView()
        case .empty:
            MovementRingsEmptyView()
        case let .populated(props):
            if props.watchPaused {
                MovementRingsPausedView(charging: props.watchCharging)
            } else {
                MovementRingsPopulatedView(props: props)
            }
        case .unavailable:
            WidgetStateNoticeCard(notice: .unavailable, title: movementCopy.title, accent: LGColor.healthRed)
        case .suppressed:
            WidgetStateNoticeCard(notice: .suppressed, title: movementCopy.title, accent: LGColor.healthRed)
        }
    }
}

// MARK: - Populated

private struct MovementRingsPopulatedView: View {
    let props: MovementRingsProps

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // NOTE: Inner widget header intentionally dropped on iOS — outer section header
            // (in HealthFeatureView) labels this card. See round 5 / round 10 decision.
            // DO NOT restore WidgetHeaderView here even when matching web pixel-perfect.
            HStack {
                Spacer()
                HStack(spacing: 6) {
                    Circle()
                        .fill(LGColor.healthRed)
                        .frame(width: 6, height: 6)
                        .shadow(color: LGColor.healthRed.opacity(0.6), radius: 4)
                    Text(movementCopy.timestampToday)
                        .font(.system(size: 9, design: .monospaced))
                        .kerning(1.5)
                        .foregroundStyle(LGColor.textMuted)
                }
            }
            .padding(.top, 12)
            .padding(.horizontal, 18)

            // web: widget-body padding 14px 18px 16px
            VStack(alignment: .leading, spacing: 0) {
                // web: mv-layout grid-template-columns: 144px 1fr; gap: 18px
                HStack(alignment: .center, spacing: 18) {
                    ConcentricRingsView(
                        moveProgress: progress(props.moveKcal, props.goals.moveKcal),
                        exerciseProgress: progress(props.exerciseMin, props.goals.exerciseMin),
                        standProgress: progress(props.standHr, props.goals.standHr),
                        moveKcal: props.moveKcal,
                        goalMoveKcal: props.goals.moveKcal
                    )
                    .frame(width: 144, height: 144)

                    // web: mv-chips flex-direction:column; gap:8px (Spacing.s200)
                    // DISTANCE label carries "(km)" so the value side is just the number — prevents wrapping
                    VStack(alignment: .trailing, spacing: Spacing.s200) {
                        MovementChip(label: movementCopy.steps.uppercased(), value: formatThousands(props.steps))
                        MovementChip(label: "\(movementCopy.distance.uppercased()) (\(movementCopy.distanceUnit))", value: formatDistanceValue(props.distanceMeters))
                        MovementChip(label: movementCopy.flights.uppercased(), value: "\(props.flights)")
                    }
                    .frame(maxWidth: .infinity, alignment: .trailing)
                }

                // web: mv-legend — single horizontal row, space-between, border-top
                // margin-top 14px; padding-top 12px; border-top 1px rgba(255,255,255,0.04)
                VStack(spacing: 0) {
                    Rectangle()
                        .fill(Color.white.opacity(0.04))
                        .frame(height: 1)
                        .padding(.top, 14)

                    HStack(spacing: 0) {
                        MovementSwatch(
                            color: LGColor.healthRed,
                            label: movementCopy.caloriesShort,
                            value: Int(props.moveKcal.rounded()),
                            goal: Int(props.goals.moveKcal.rounded())
                        )
                        Spacer(minLength: 4)
                        MovementSwatch(
                            color: LGColor.accentGreen,
                            label: movementCopy.exercise,
                            value: Int(props.exerciseMin.rounded()),
                            goal: Int(props.goals.exerciseMin.rounded())
                        )
                        Spacer(minLength: 4)
                        MovementSwatch(
                            color: LGColor.accentBlue,
                            label: movementCopy.stand,
                            value: props.standHr.map { Int($0.rounded()) },
                            goal: Int(props.goals.standHr.rounded())
                        )
                    }
                    .padding(.top, 12)
                }

                // Sun-arc footer: the track shows only with solar facts (never invented times);
                // the daylight-minutes line always shows.
                SunArcFooterView(
                    solar: props.solar,
                    daylightMin: props.daylightMin,
                    goalDaylightMin: props.goals.daylightMin
                )
                .padding(.top, Spacing.s300)
            }
            .padding(.top, 14)
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: LGColor.healthRed)
    }

    private func progress(_ value: Double?, _ goal: Double) -> Double {
        guard let value, goal > 0 else { return 0 }
        return min(1.5, max(0, value / goal))
    }
}

// MARK: - Concentric Rings

private struct ConcentricRingsView: View {
    let moveProgress: Double
    let exerciseProgress: Double
    let standProgress: Double
    // needed for center pct label
    let moveKcal: Double
    let goalMoveKcal: Double

    @State private var animatedMove: Double = 0
    @State private var animatedExercise: Double = 0
    @State private var animatedStand: Double = 0

    // web SVG viewBox 144×144: r=60/44/28 → diameters 120/88/56; stroke-width=12
    private let lineWidth: CGFloat = 12
    private let outerDiameter: CGFloat = 120 // r=60
    private let middleDiameter: CGFloat = 88 // r=44
    private let innerDiameter: CGFloat = 56 // r=28

    // web: mv-rings-center-pct 0.92rem ≈ 15pt weight 700 letter-spacing -0.01em
    // web: mv-rings-center-cap 0.50rem ≈ 8pt letter-spacing 2.5px uppercase
    private var movePct: Int {
        guard goalMoveKcal > 0 else { return 0 }
        return Int(round(moveKcal / goalMoveKcal * 100))
    }

    var body: some View {
        ZStack {
            RingArc(progress: animatedMove, color: LGColor.healthRed, lineWidth: lineWidth)
                .frame(width: outerDiameter, height: outerDiameter)

            RingArc(progress: animatedExercise, color: LGColor.accentGreen, lineWidth: lineWidth)
                .frame(width: middleDiameter, height: middleDiameter)

            RingArc(progress: animatedStand, color: LGColor.accentBlue, lineWidth: lineWidth)
                .frame(width: innerDiameter, height: innerDiameter)

            // web: mv-rings-center — centered column, gap 2px
            VStack(spacing: 2) {
                Text("\(movePct)%")
                    .font(.system(size: 15, weight: .bold, design: .monospaced))
                    .tracking(-0.15)
                    .foregroundStyle(LGColor.textTitle)
                Text(movementCopy.caloriesShort.uppercased())
                    .font(.system(size: 8, weight: .medium, design: .monospaced))
                    .kerning(2.5)
                    .foregroundStyle(LGColor.textMuted)
            }
        }
        .task {
            withAnimation(.easeOut(duration: 1.2)) {
                animatedMove = moveProgress
                animatedExercise = exerciseProgress
                animatedStand = standProgress
            }
        }
    }
}

// web: track opacity 0.18; progress arc with drop-shadow(0 0 4px rgba(color, 0.6))
private struct RingArc: View {
    let progress: Double
    let color: Color
    let lineWidth: CGFloat

    var body: some View {
        ZStack {
            Circle()
                .stroke(color.opacity(0.18), lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: min(1.0, progress))
                .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .shadow(color: color.opacity(0.6), radius: 4, x: 0, y: 0)
        }
    }
}

// MARK: - Chips

// Unit removed from struct — DISTANCE label carries "(km)" inline to prevent value wrapping.
// label: 9pt medium mono kerning 1.2; value: 14pt bold mono — secondary to the rings focal point.
private struct MovementChip: View {
    let label: String
    let value: String

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 0) {
            Text(label)
                .font(.system(size: 9, weight: .medium, design: .monospaced))
                .kerning(1.2)
                .foregroundStyle(LGColor.textMuted)
                .lineLimit(1)
                .fixedSize(horizontal: true, vertical: false)
            Spacer(minLength: 8)
            Text(value)
                .font(.system(size: 14, weight: .bold, design: .monospaced))
                .foregroundStyle(LGColor.textTitle)
                .lineLimit(1)
                .fixedSize(horizontal: true, vertical: false)
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.white.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
        )
        .frame(maxWidth: .infinity, alignment: .trailing)
    }
}

// MARK: - Legend Swatch

// web: mv-legend-item — monospaced cap2, letter-spacing 0.08em, mixed-case label, bold value
// swatch 8×8 border-radius:2px with colored glow
struct MovementSwatch: View {
    let color: Color
    let label: String
    /// The measured value, nil when not measured (renders the no-reading mark).
    let value: Int?
    let goal: Int

    /// The value cell's text: the reading, or the no-reading mark.
    static func valueText(_ value: Int?) -> String {
        NoReading.text(value)
    }

    var body: some View {
        HStack(spacing: 6) {
            RoundedRectangle(cornerRadius: 2)
                .fill(color)
                .frame(width: 8, height: 8)
                .shadow(color: color.opacity(0.6), radius: 3)
            // web: mv-legend-item font is monospaced cap2 letter-spacing 0.08em, mixed case
            Text(label)
                .font(.system(size: 10, design: .monospaced))
                .kerning(0.8)
                .foregroundStyle(LGColor.textMuted)
            // web: mv-legend-val — color text-title, font-weight 600. The value and the goal
            // are separate Texts so VoiceOver reads the mark by its noReading copy, not "dash".
            let valueText = Self.valueText(value)
            HStack(spacing: 0) {
                Text(valueText)
                    .noReadingAccessibility(valueText)
                Text("/\(goal)")
            }
            .font(.system(size: 10, weight: .semibold, design: .monospaced))
            .foregroundStyle(LGColor.textTitle)
        }
    }
}

// MARK: - Sun Arc Footer

struct SunArcFooterView: View {
    /// Identifies the sun track (icons, times, arc) so tests can assert its presence.
    static let sunTrackIdentifier = "movementRings.sunTrack"

    /// Sunrise/sunset facts, nil when the caller has none (the sun track is hidden).
    let solar: MovementRingsProps.Solar?
    /// Minutes in daylight, nil when not measured (renders the no-reading mark).
    let daylightMin: Double?
    let goalDaylightMin: Double

    /// The daylight minutes as display text, or the no-reading mark.
    static func daylightText(_ daylightMin: Double?) -> String {
        NoReading.text(daylightMin.map { Int($0) })
    }

    /// True only for a measured value at or past the goal: a missing value never hits it.
    static func daylightHit(_ daylightMin: Double?, goal: Double) -> Bool {
        guard let daylightMin else { return false }
        return daylightMin >= goal
    }

    @State private var pulseOpacity: Double = 0.6

    var body: some View {
        VStack(spacing: 8) {
            // web: mv-sun-footer border-top 1px rgba(255,255,255,0.06)
            Rectangle()
                .fill(Color.white.opacity(0.06))
                .frame(height: 1)

            // The sun track renders only with supplied solar facts. Without them it is hidden
            // (owner decision, atlas 0160): never invented times, never a permanent pair of marks.
            // The daylight-minutes line below stays either way.
            if let solar {
                HStack(spacing: 8) {
                    Image(systemName: "sun.max.fill")
                        .foregroundStyle(LGColor.accentAmber)
                        .font(.system(size: 14))
                        .shadow(color: LGColor.accentAmber.opacity(0.7), radius: 3)

                    // web: mv-sun-time 0.56rem ≈ 9pt, color text-subtle
                    Text(solar.sunriseHHmm)
                        .font(.system(size: 9, design: .monospaced))
                        .foregroundStyle(LGColor.textMuted)

                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            // web: 5-stop gradient purple→amber→amber→amber→purple, height 4px
                            LinearGradient(
                                stops: [
                                    .init(color: Color.purple.opacity(0.4), location: 0.0),
                                    .init(color: LGColor.accentAmber.opacity(0.5), location: 0.2),
                                    .init(color: LGColor.accentAmber.opacity(0.7), location: 0.5),
                                    .init(color: LGColor.accentAmber.opacity(0.5), location: 0.8),
                                    .init(color: Color.purple.opacity(0.4), location: 1.0),
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                            .frame(height: 4)
                            .frame(maxHeight: .infinity, alignment: .center)
                            .clipShape(Capsule())

                            // web: sun-dot 8×8px, dual shadow 0 0 8px rgba(0.9) + 0 0 16px rgba(0.45)
                            Circle()
                                .fill(LGColor.accentAmber)
                                .frame(width: 8, height: 8)
                                .shadow(color: LGColor.accentAmber.opacity(0.9), radius: 4, x: 0, y: 0)
                                .shadow(color: LGColor.accentAmber.opacity(0.45), radius: 8, x: 0, y: 0)
                                .opacity(pulseOpacity)
                                .offset(x: Self.dotX(progressPct: solar.currentProgressPct, in: geo.size.width))
                                .frame(maxHeight: .infinity, alignment: .center)
                        }
                    }
                    .frame(height: 14)

                    Text(solar.sunsetHHmm)
                        .font(.system(size: 9, design: .monospaced))
                        .foregroundStyle(LGColor.textMuted)

                    Image(systemName: "moon.fill")
                        .foregroundStyle(LGColor.accentAmber.opacity(0.5))
                        .font(.system(size: 14))
                }
                .accessibilityIdentifier(Self.sunTrackIdentifier)
            }

            // web: mv-sun-caption text-align:center, cap2 monospaced, letter-spacing 0.09em
            // hit checkmark uses health-green with glow
            HStack(spacing: 4) {
                // web: the value is its own span, then the caption with `{minutes}` removed,
                // so the mark carries its VoiceOver label.
                let daylight = Self.daylightText(daylightMin)
                HStack(spacing: 0) {
                    Text(daylight)
                        .noReadingAccessibility(daylight)
                    Text(movementCopy.daylightCaption.replacingOccurrences(of: "{minutes}", with: ""))
                }
                .font(.system(size: 10, weight: .medium, design: .monospaced))
                .foregroundStyle(LGColor.textMuted)
                Text("·")
                    .foregroundStyle(LGColor.textMuted.opacity(0.5))
                Text(movementCopy.daylightGoal.replacingOccurrences(of: "{minutes}", with: "\(Int(goalDaylightMin))"))
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundStyle(LGColor.textMuted)
                if Self.daylightHit(daylightMin, goal: goalDaylightMin) {
                    Image(systemName: "checkmark")
                        .foregroundStyle(LGColor.healthGreen)
                        .neonGlow(LGColor.healthGreen, radius: 3)
                        .font(.system(size: 10, weight: .bold))
                }
            }
        }
        .task {
            withAnimation(.easeInOut(duration: 1.6).repeatForever(autoreverses: true)) {
                pulseOpacity = 1.0
            }
        }
    }

    private static func dotX(progressPct: Double, in width: CGFloat) -> CGFloat {
        let clamped = min(100, max(0, progressPct))
        let pct = CGFloat(clamped / 100)
        return (width * pct) - 4
    }
}

// MARK: - Skeleton & Empty

private struct MovementRingsSkeletonView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // NOTE: Inner widget header intentionally dropped on iOS — see round 10 decision.
            HStack {
                Spacer()
                HStack(spacing: 6) {
                    Circle()
                        .fill(LGColor.healthRed)
                        .frame(width: 6, height: 6)
                        .shadow(color: LGColor.healthRed.opacity(0.6), radius: 4)
                    Text(movementCopy.timestampToday)
                        .font(.system(size: 9, design: .monospaced))
                        .kerning(1.5)
                        .foregroundStyle(LGColor.textMuted)
                }
            }
            .padding(.top, 12)
            .padding(.horizontal, 18)

            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .center, spacing: 18) {
                    Circle()
                        .fill(LGColor.surfaceRaised)
                        .opacity(0.3)
                        .frame(width: 144, height: 144)

                    VStack(alignment: .trailing, spacing: 6) {
                        ForEach(0 ..< 3, id: \.self) { _ in
                            SkeletonBar(width: 120, height: 40, cornerRadius: 10)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .trailing)
                }

                // Legend skeleton — single row
                VStack(spacing: 0) {
                    Rectangle()
                        .fill(Color.white.opacity(0.04))
                        .frame(height: 1)
                        .padding(.top, 14)
                    HStack(spacing: 0) {
                        SkeletonBar(width: 64, height: 10)
                        Spacer(minLength: 4)
                        SkeletonBar(width: 64, height: 10)
                        Spacer(minLength: 4)
                        SkeletonBar(width: 64, height: 10)
                    }
                    .padding(.top, 12)
                }

                // Sun-arc skeleton
                VStack(spacing: 8) {
                    Rectangle()
                        .fill(Color.white.opacity(0.06))
                        .frame(height: 1)
                    SkeletonBar(width: 200, height: 8)
                    SkeletonBar(width: 160, height: 8)
                }
                .padding(.top, Spacing.s300)
            }
            .padding(.top, 14)
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: LGColor.healthRed)
    }
}

private struct MovementRingsEmptyView: View {
    var body: some View {
        MovementRingsPopulatedView(props: MovementRingsProps(
            moveKcal: 0,
            exerciseMin: 0,
            standHr: 0,
            steps: 0,
            distanceMeters: 0,
            flights: 0,
            daylightMin: 0
        ))
    }
}

// MARK: - Paused

/// Shown when `MovementRingsProps.watchPaused` is true. Replaces the populated content
/// entirely — no stale ring data is ever displayed. Mirrors `MovementRingsEmptyView`
/// structure so the card footprint is identical: header strip, full-height placeholder,
/// same neonCard chrome.
private struct MovementRingsPausedView: View {
    var charging = false

    private var label: String {
        charging ? movementCopy.paused.labelCharging : movementCopy.paused.label
    }

    private var pausedDescription: String {
        charging ? movementCopy.paused.descriptionCharging : movementCopy.paused.description
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Spacer()
                HStack(spacing: 6) {
                    Circle()
                        .fill(LGColor.healthRed)
                        .frame(width: 6, height: 6)
                        .shadow(color: LGColor.healthRed.opacity(0.6), radius: 4)
                    Text(movementCopy.timestampToday)
                        .font(.system(size: 9, design: .monospaced))
                        .kerning(1.5)
                        .foregroundStyle(LGColor.textMuted)
                }
            }
            .padding(.top, 12)
            .padding(.horizontal, 18)

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
            .frame(height: 144)
            .padding(.top, 14)
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: LGColor.healthRed)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(movementCopy.title). \(label). \(pausedDescription)")
    }
}

// MARK: - Formatters

private func formatThousands(_ value: Int) -> String {
    value.formatted(.number.grouping(.automatic))
}

/// Returns the numeric km string — no space; unit "km" is appended by the chip with spacing:0
private func formatDistanceValue(_ meters: Double) -> String {
    String(format: "%.1f", meters / 1000)
}

// MARK: - Previews

#Preview("Movement Rings — Populated") {
    MovementRingsView(props: MovementRingsProps(
        moveKcal: 380,
        exerciseMin: 32,
        standHr: 9,
        steps: 8421,
        distanceMeters: 6200,
        flights: 14,
        daylightMin: 48,
        goals: MovementRingsProps.Goals(),
        solar: MovementRingsProps.Solar(
            sunriseHHmm: "06:30",
            sunsetHHmm: "20:15",
            currentProgressPct: 60
        )
    ))
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

#Preview("Movement Rings — Goal Hit") {
    MovementRingsView(props: MovementRingsProps(
        moveKcal: 520,
        exerciseMin: 35,
        standHr: 12,
        steps: 12104,
        distanceMeters: 9400,
        flights: 22,
        daylightMin: 25,
        goals: MovementRingsProps.Goals(),
        solar: MovementRingsProps.Solar(
            sunriseHHmm: "06:30",
            sunsetHHmm: "20:15",
            currentProgressPct: 80
        )
    ))
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

#Preview("Movement Rings — Rest Day") {
    MovementRingsView(props: MovementRingsProps(
        moveKcal: 0,
        exerciseMin: 0,
        standHr: 0,
        steps: 0,
        distanceMeters: 0,
        flights: 0,
        daylightMin: 0,
        goals: MovementRingsProps.Goals()
    ))
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

#Preview("Movement Rings — No Solar") {
    MovementRingsView(props: MovementRingsProps(
        moveKcal: 380,
        exerciseMin: 32,
        standHr: 9,
        steps: 8421,
        distanceMeters: 6200,
        flights: 14,
        daylightMin: 48,
        goals: MovementRingsProps.Goals(),
        solar: nil
    ))
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

#Preview("Movement Rings — No Stand or Daylight Reading") {
    MovementRingsView(props: MovementRingsProps(
        moveKcal: 380,
        exerciseMin: 32,
        standHr: nil,
        steps: 8421,
        distanceMeters: 6200,
        flights: 14,
        daylightMin: nil,
        goals: MovementRingsProps.Goals(),
        solar: nil
    ))
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

#Preview("Movement Rings — Empty State") {
    MovementRingsView(state: .empty)
        .padding()
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
}

#Preview("Movement Rings — Loading") {
    MovementRingsView(state: .loading)
        .padding()
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
}

#Preview("Movement Rings — Paused") {
    MovementRingsView(props: MovementRingsProps(
        moveKcal: 380,
        exerciseMin: 32,
        standHr: 9,
        steps: 8421,
        distanceMeters: 6200,
        flights: 14,
        daylightMin: 48,
        goals: MovementRingsProps.Goals(),
        solar: MovementRingsProps.Solar(
            sunriseHHmm: "06:30",
            sunsetHHmm: "20:15",
            currentProgressPct: 60
        ),
        watchPaused: true
    ))
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

#Preview("Movement Rings — Paused (charging)") {
    MovementRingsView(props: MovementRingsProps(
        moveKcal: 380,
        exerciseMin: 32,
        standHr: 9,
        steps: 8421,
        distanceMeters: 6200,
        flights: 14,
        daylightMin: 48,
        goals: MovementRingsProps.Goals(),
        solar: nil,
        watchPaused: true,
        watchCharging: true
    ))
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

#Preview("Movement Rings — Unavailable") {
    MovementRingsView(state: .unavailable)
        .padding()
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
}

#Preview("Movement Rings — Suppressed") {
    MovementRingsView(state: .suppressed)
        .padding()
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
}
