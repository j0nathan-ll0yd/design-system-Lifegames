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
            MovementRingsPopulatedView(props: props)
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
                            value: Int(props.standHr.rounded()),
                            goal: Int(props.goals.standHr.rounded())
                        )
                    }
                    .padding(.top, 12)
                }

                // Sun-arc footer always shown; resolvedSolar() provides defaults when nil
                SunArcFooterView(
                    solar: resolvedSolar(from: props.solar),
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

    private func progress(_ value: Double, _ goal: Double) -> Double {
        guard goal > 0 else { return 0 }
        return min(1.5, max(0, value / goal))
    }

    private func resolvedSolar(from solar: MovementRingsProps.Solar?) -> MovementRingsProps.Solar {
        if let s = solar { return s }
        let now = Date()
        let calendar = Calendar.current
        let comps = calendar.dateComponents([.hour, .minute], from: now)
        let minutesNow = (comps.hour ?? 0) * 60 + (comps.minute ?? 0)
        let sunriseMin = 6 * 60 + 30 // 06:30
        let sunsetMin = 20 * 60 + 15 // 20:15
        let pct: Double
        if minutesNow < sunriseMin {
            pct = 0
        } else if minutesNow > sunsetMin {
            pct = 100
        } else {
            pct = Double(minutesNow - sunriseMin) / Double(sunsetMin - sunriseMin) * 100
        }
        return .init(sunriseHHmm: "06:30", sunsetHHmm: "20:15", currentProgressPct: pct)
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
private struct MovementSwatch: View {
    let color: Color
    let label: String
    let value: Int
    let goal: Int

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
            // web: mv-legend-val — color text-title, font-weight 600
            Text("\(value)/\(goal)")
                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                .foregroundStyle(LGColor.textTitle)
        }
    }
}

// MARK: - Sun Arc Footer

private struct SunArcFooterView: View {
    let solar: MovementRingsProps.Solar
    let daylightMin: Double
    let goalDaylightMin: Double

    @State private var pulseOpacity: Double = 0.6

    var body: some View {
        VStack(spacing: 8) {
            // web: mv-sun-footer border-top 1px rgba(255,255,255,0.06)
            Rectangle()
                .fill(Color.white.opacity(0.06))
                .frame(height: 1)

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
                            .offset(x: dotX(in: geo.size.width))
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

            // web: mv-sun-caption text-align:center, cap2 monospaced, letter-spacing 0.09em
            // hit checkmark uses health-green with glow
            HStack(spacing: 4) {
                Text(movementCopy.daylightCaption.replacingOccurrences(of: "{minutes}", with: "\(Int(daylightMin))"))
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundStyle(LGColor.textMuted)
                Text("·")
                    .foregroundStyle(LGColor.textMuted.opacity(0.5))
                Text(movementCopy.daylightGoal.replacingOccurrences(of: "{minutes}", with: "\(Int(goalDaylightMin))"))
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundStyle(LGColor.textMuted)
                if daylightMin >= goalDaylightMin {
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

    private func dotX(in width: CGFloat) -> CGFloat {
        let clamped = min(100, max(0, solar.currentProgressPct))
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
