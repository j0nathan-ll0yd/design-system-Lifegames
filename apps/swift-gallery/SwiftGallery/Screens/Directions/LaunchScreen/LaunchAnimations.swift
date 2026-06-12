import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

// MARK: - Launch Animation Catalog

//
// Five self-contained, token-pure, looping neon backdrops for the Launch /
// Login screens. Each is a presentational `View` that fills its container and
// is designed to sit BEHIND the OFFLINE / "media downloader" branding without
// obscuring it. All motion is driven by `TimelineView` or `.repeatForever`
// animations (no heavy timers) for smooth, low-cost playback.
//
// Catalog:
//   1. PulseRingsAnimation     — concentric neon sonar rings expanding outward
//   2. DataStreamAnimation     — vertical "download" motes raining into a tray
//   3. ParticleConvergeAnimation — particle field drawn toward a glowing core
//   4. WaveformPulseAnimation  — equalizer / waveform bars breathing in place
//   5. PolygonOrbitAnimation   — rotating neon geometric polygon with a halo

/// Identifies the five selectable launch backdrops. `Int` raw values keep the
/// segmented picker selection stable and let "animation 1" remain the default.
enum LaunchAnimationKind: Int, CaseIterable, Identifiable {
    case pulseRings = 0
    case dataStream
    case particleConverge
    case waveformPulse
    case polygonOrbit

    var id: Int {
        rawValue
    }

    /// Short label used by the comparison picker / chips.
    var label: String {
        switch self {
        case .pulseRings: return "Rings"
        case .dataStream: return "Stream"
        case .particleConverge: return "Converge"
        case .waveformPulse: return "Waveform"
        case .polygonOrbit: return "Polygon"
        }
    }

    /// One-line description for documentation / review surfaces.
    var summary: String {
        switch self {
        case .pulseRings: return "Concentric neon sonar rings expanding outward"
        case .dataStream: return "Vertical download motes raining into a tray"
        case .particleConverge: return "Particle field converging toward a glowing core"
        case .waveformPulse: return "Equalizer / waveform bars breathing in place"
        case .polygonOrbit: return "Rotating neon geometric polygon with a halo"
        }
    }
}

/// Renders the selected backdrop. `dimmed` softens the whole effect for use
/// behind readable content (e.g. the Login screen).
struct LaunchAnimationView: View {
    let kind: LaunchAnimationKind
    var dimmed: Bool = false

    var body: some View {
        Group {
            switch kind {
            case .pulseRings: PulseRingsAnimation()
            case .dataStream: DataStreamAnimation()
            case .particleConverge: ParticleConvergeAnimation()
            case .waveformPulse: WaveformPulseAnimation()
            case .polygonOrbit: PolygonOrbitAnimation()
            }
        }
        .opacity(dimmed ? 0.45 : 1.0)
        .transition(.opacity)
    }
}

// MARK: - 1. Pulse Rings (concentric neon sonar)

/// Concentric rings that bloom from the center and fade as they expand —
/// reads like a radar / sonar sweep. Driven by a single phase value so the
/// rings stay evenly staggered.
struct PulseRingsAnimation: View {
    private let ringCount = 4
    private let period: Double = 3.4

    var body: some View {
        TimelineView(.animation) { context in
            let t = context.date.timeIntervalSinceReferenceDate
            Canvas { ctx, size in
                let center = CGPoint(x: size.width / 2, y: size.height / 2)
                let maxRadius = min(size.width, size.height) * 0.62

                for index in 0 ..< ringCount {
                    // Stagger each ring evenly across the period.
                    let offset = Double(index) / Double(ringCount)
                    let phase = ((t / period) + offset).truncatingRemainder(dividingBy: 1.0)
                    let radius = maxRadius * phase
                    let fade = 1.0 - phase
                    guard radius > 1 else { continue }

                    let rect = CGRect(
                        x: center.x - radius,
                        y: center.y - radius,
                        width: radius * 2,
                        height: radius * 2
                    )
                    let stroke = index.isMultiple(of: 2) ? LGColor.accentBlue : LGColor.accentCyan
                    ctx.stroke(
                        Path(ellipseIn: rect),
                        with: .color(stroke.opacity(fade * 0.55)),
                        lineWidth: 1.5
                    )
                }

                // Steady core glow at the origin.
                let coreRadius: CGFloat = 6
                let coreRect = CGRect(
                    x: center.x - coreRadius,
                    y: center.y - coreRadius,
                    width: coreRadius * 2,
                    height: coreRadius * 2
                )
                ctx.fill(Path(ellipseIn: coreRect), with: .color(LGColor.accentBlue.opacity(0.5)))
            }
        }
        .blendMode(.screen)
        .allowsHitTesting(false)
    }
}

// MARK: - 2. Data Stream (download motes)

/// Vertical lanes of glowing dashes falling toward the bottom — a literal
/// "downloading" metaphor. Each lane has its own speed and phase so the field
/// never looks gridded.
struct DataStreamAnimation: View {
    private struct Lane {
        let x: CGFloat
        let speed: Double
        let phase: Double
        let tint: Color
    }

    private let lanes: [Lane]
    private let dashCount = 6

    init() {
        // Deterministic pseudo-random lanes — stable across redraws, no RNG.
        var generated: [Lane] = []
        let columns = 7
        for i in 0 ..< columns {
            let frac = (Double(i) + 0.5) / Double(columns)
            let speed = 0.45 + Double((i * 37) % 5) * 0.12
            let phase = Double((i * 53) % 10) / 10.0
            let tint = i.isMultiple(of: 3) ? LGColor.accentCyan : LGColor.accentBlue
            generated.append(Lane(x: CGFloat(frac), speed: speed, phase: phase, tint: tint))
        }
        lanes = generated
    }

    var body: some View {
        TimelineView(.animation) { context in
            let t = context.date.timeIntervalSinceReferenceDate
            Canvas { ctx, size in
                let dashHeight = size.height * 0.05
                let gap = size.height / CGFloat(dashCount)

                for lane in lanes {
                    let x = lane.x * size.width
                    let travel = ((t * lane.speed) + lane.phase).truncatingRemainder(dividingBy: 1.0)

                    for d in 0 ..< dashCount {
                        let baseY = (CGFloat(d) * gap) + (CGFloat(travel) * gap)
                        let y = baseY.truncatingRemainder(dividingBy: size.height)
                        // Fade as the mote nears the bottom "tray".
                        let fade = 1.0 - (y / size.height)
                        let rect = CGRect(
                            x: x - 1.0,
                            y: y,
                            width: 2.0,
                            height: dashHeight
                        )
                        ctx.fill(
                            Path(roundedRect: rect, cornerRadius: 1),
                            with: .color(lane.tint.opacity(Double(fade) * 0.5))
                        )
                    }
                }

                // Glowing collection tray at the bottom.
                let trayRect = CGRect(x: 0, y: size.height - 2, width: size.width, height: 2)
                ctx.fill(Path(trayRect), with: .color(LGColor.accentCyan.opacity(0.4)))
            }
        }
        .blendMode(.screen)
        .allowsHitTesting(false)
    }
}

// MARK: - 3. Particle Converge

/// A ring of motes that drifts inward toward a pulsing core, then resets —
/// suggesting data being gathered into one place. Particles are placed on a
/// circle by index so the loop is perfectly seamless.
struct ParticleConvergeAnimation: View {
    private let particleCount = 22
    private let period: Double = 4.0

    var body: some View {
        TimelineView(.animation) { context in
            let t = context.date.timeIntervalSinceReferenceDate
            Canvas { ctx, size in
                let center = CGPoint(x: size.width / 2, y: size.height / 2)
                let outerRadius = min(size.width, size.height) * 0.55

                for i in 0 ..< particleCount {
                    let angle = (Double(i) / Double(particleCount)) * 2 * .pi
                    // Each particle has a staggered convergence phase.
                    let stagger = Double(i % 5) / 5.0
                    let phase = ((t / period) + stagger).truncatingRemainder(dividingBy: 1.0)
                    let radius = outerRadius * (1.0 - phase)
                    let fade = sin(phase * .pi) // bright mid-flight, dim at ends

                    let px = center.x + CGFloat(cos(angle)) * radius
                    let py = center.y + CGFloat(sin(angle)) * radius
                    let dot: CGFloat = 2.4
                    let rect = CGRect(x: px - dot, y: py - dot, width: dot * 2, height: dot * 2)
                    let tint = i.isMultiple(of: 4) ? LGColor.accentPink : LGColor.accentCyan
                    ctx.fill(Path(ellipseIn: rect), with: .color(tint.opacity(fade * 0.7)))
                }

                // Pulsing core the particles converge on.
                let pulse = (sin(t * 1.8) + 1) / 2
                let coreRadius = 4 + pulse * 5
                let coreRect = CGRect(
                    x: center.x - coreRadius,
                    y: center.y - coreRadius,
                    width: coreRadius * 2,
                    height: coreRadius * 2
                )
                ctx.fill(
                    Path(ellipseIn: coreRect),
                    with: .color(LGColor.accentBlue.opacity(0.35 + pulse * 0.35))
                )
            }
        }
        .blendMode(.screen)
        .allowsHitTesting(false)
    }
}

// MARK: - 4. Waveform Pulse (equalizer bars)

/// A horizontal row of vertical bars whose heights breathe like an audio
/// equalizer. Heights are derived from layered sine waves so the motion is
/// organic but fully deterministic and seamless.
struct WaveformPulseAnimation: View {
    private let barCount = 28

    var body: some View {
        TimelineView(.animation) { context in
            let t = context.date.timeIntervalSinceReferenceDate
            Canvas { ctx, size in
                let centerY = size.height / 2
                let spacing = size.width / CGFloat(barCount)
                let barWidth = spacing * 0.42
                let maxHalf = size.height * 0.28

                for i in 0 ..< barCount {
                    let x = (CGFloat(i) + 0.5) * spacing
                    // Two layered sines for an organic, non-repetitive feel.
                    let wave = sin(t * 1.6 + Double(i) * 0.5)
                        + 0.5 * sin(t * 2.7 + Double(i) * 0.9)
                    let norm = (wave + 1.5) / 3.0 // -> 0...1
                    let half = maxHalf * (0.18 + CGFloat(norm) * 0.82)

                    let rect = CGRect(
                        x: x - barWidth / 2,
                        y: centerY - half,
                        width: barWidth,
                        height: half * 2
                    )
                    let tint = i.isMultiple(of: 3) ? LGColor.accentPink : LGColor.accentBlue
                    let intensity = 0.25 + norm * 0.4
                    ctx.fill(
                        Path(roundedRect: rect, cornerRadius: barWidth / 2),
                        with: .color(tint.opacity(intensity))
                    )
                }

                // Center baseline.
                let line = CGRect(x: 0, y: centerY - 0.5, width: size.width, height: 1)
                ctx.fill(Path(line), with: .color(LGColor.accentCyan.opacity(0.18)))
            }
        }
        .blendMode(.screen)
        .allowsHitTesting(false)
    }
}

// MARK: - 5. Polygon Orbit (rotating neon geometry)

/// A slowly rotating neon polygon with a soft halo and orbiting vertex motes —
/// the most overtly "geometric" of the set. Rotation and breathing scale are
/// driven by continuous time for a seamless loop.
struct PolygonOrbitAnimation: View {
    private let sides = 6

    var body: some View {
        TimelineView(.animation) { context in
            let t = context.date.timeIntervalSinceReferenceDate
            Canvas { ctx, size in
                let center = CGPoint(x: size.width / 2, y: size.height / 2)
                let breathe = (sin(t * 0.9) + 1) / 2
                let radius = min(size.width, size.height) * (0.30 + 0.04 * breathe)
                let rotation = t * 0.35

                // Build the polygon path.
                var path = Path()
                var vertices: [CGPoint] = []
                for i in 0 ..< sides {
                    let angle = rotation + (Double(i) / Double(sides)) * 2 * .pi
                    let p = CGPoint(
                        x: center.x + CGFloat(cos(angle)) * radius,
                        y: center.y + CGFloat(sin(angle)) * radius
                    )
                    vertices.append(p)
                    if i == 0 { path.move(to: p) } else { path.addLine(to: p) }
                }
                path.closeSubpath()

                // Outer halo (faint, larger).
                ctx.stroke(path, with: .color(LGColor.accentBlue.opacity(0.18)), lineWidth: 6)
                // Crisp neon edge.
                ctx.stroke(path, with: .color(LGColor.accentCyan.opacity(0.6)), lineWidth: 1.5)

                // Vertex motes.
                for p in vertices {
                    let dot: CGFloat = 3
                    let rect = CGRect(x: p.x - dot, y: p.y - dot, width: dot * 2, height: dot * 2)
                    ctx.fill(Path(ellipseIn: rect), with: .color(LGColor.accentPink.opacity(0.7)))
                }

                // Inner counter-rotating polygon for depth.
                var inner = Path()
                let innerRadius = radius * 0.5
                for i in 0 ..< sides {
                    let angle = -rotation + (Double(i) / Double(sides)) * 2 * .pi
                    let p = CGPoint(
                        x: center.x + CGFloat(cos(angle)) * innerRadius,
                        y: center.y + CGFloat(sin(angle)) * innerRadius
                    )
                    if i == 0 { inner.move(to: p) } else { inner.addLine(to: p) }
                }
                inner.closeSubpath()
                ctx.stroke(inner, with: .color(LGColor.accentBlue.opacity(0.35)), lineWidth: 1)
            }
        }
        .blendMode(.screen)
        .allowsHitTesting(false)
    }
}

// MARK: - Previews

#Preview("Launch Animations — Catalog") {
    ZStack {
        LGColor.surfaceBase.ignoresSafeArea()
        VStack(spacing: Spacing.s400) {
            ForEach(LaunchAnimationKind.allCases) { kind in
                ZStack {
                    LGColor.surfaceDeep
                    LaunchAnimationView(kind: kind)
                    Text(kind.label.uppercased())
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundStyle(LGColor.textTitle)
                        .tracking(4)
                }
                .frame(height: 90)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .padding(Spacing.s400)
    }
    .preferredColorScheme(.dark)
}
