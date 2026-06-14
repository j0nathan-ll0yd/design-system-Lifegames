import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

// MARK: - Launch Animation Catalog

//
// Five self-contained, token-pure, looping neon backdrops for the Launch /
// Login screens. Each is a presentational `View` that fills its container and
// is designed to sit BEHIND the OFFLINE / "media downloader" branding without
// obscuring it. All motion is driven by `TimelineView` (no heavy timers) for
// smooth, low-cost playback. Every backdrop reads as a media-download motif so
// the set stays consistent with the app's premise (saving videos for offline).
//
// Catalog:
//   1. BufferRingAnimation     — play glyph inside a sweeping buffer/loader ring
//   2. DataStreamAnimation     — vertical "download" motes raining into a tray
//   3. ScrubTimelineAnimation  — playback scrubber sweeping a waveform timeline
//   4. WaveformPulseAnimation  — equalizer / waveform bars breathing in place
//   5. TileGridAnimation       — a shimmering grid of saved-video tiles

/// Identifies the five selectable launch backdrops. `Int` raw values keep the
/// segmented picker selection stable and let "animation 1" remain the default.
enum LaunchAnimationKind: Int, CaseIterable, Identifiable {
    case bufferRing = 0
    case downloadStream
    case scrubTimeline
    case waveform
    case tileGrid

    var id: Int {
        rawValue
    }

    /// Short label used by the comparison picker / chips.
    var label: String {
        switch self {
        case .bufferRing: return "Buffer"
        case .downloadStream: return "Download"
        case .scrubTimeline: return "Scrubber"
        case .waveform: return "Waveform"
        case .tileGrid: return "Library"
        }
    }

    /// One-line description for documentation / review surfaces.
    var summary: String {
        switch self {
        case .bufferRing: return "Play glyph inside a sweeping buffer ring"
        case .downloadStream: return "Download motes raining into a collection tray"
        case .scrubTimeline: return "Playback scrubber sweeping a waveform timeline"
        case .waveform: return "Equalizer / waveform bars breathing in place"
        case .tileGrid: return "A shimmering grid of saved-video tiles"
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
            case .bufferRing: BufferRingAnimation()
            case .downloadStream: DataStreamAnimation()
            case .scrubTimeline: ScrubTimelineAnimation()
            case .waveform: WaveformPulseAnimation()
            case .tileGrid: TileGridAnimation()
            }
        }
        .opacity(dimmed ? 0.45 : 1.0)
        .transition(.opacity)
    }
}

// MARK: - 1. Buffer Ring (play glyph + sweeping loader)

/// A central play triangle inside a circular track, with a bright arc sweeping
/// around it like a video buffering / loading indicator, plus a soft halo that
/// expands to fill the space. Reads as "preparing media".
struct BufferRingAnimation: View {
    var body: some View {
        TimelineView(.animation) { context in
            Canvas { ctx, size in
                Self.draw(in: &ctx, size: size, t: context.date.timeIntervalSinceReferenceDate)
            }
        }
        .blendMode(.screen)
        .allowsHitTesting(false)
    }

    private static func draw(in ctx: inout GraphicsContext, size: CGSize, t: Double) {
        let center = CGPoint(x: size.width / 2, y: size.height / 2)
        let radius = min(size.width, size.height) * 0.2

        // Faint full track ring.
        let trackRect = CGRect(
            x: center.x - radius, y: center.y - radius,
            width: radius * 2, height: radius * 2
        )
        ctx.stroke(Path(ellipseIn: trackRect), with: .color(LGColor.accentBlue.opacity(0.18)), lineWidth: 3)

        // Sweeping buffer arc — a ~100° segment rotating once every 1.6s.
        let sweep = (t / 1.6).truncatingRemainder(dividingBy: 1.0)
        let startAngle = Angle(radians: sweep * 2 * .pi - .pi / 2)
        let endAngle = Angle(radians: (sweep + 0.28) * 2 * .pi - .pi / 2)
        var arc = Path()
        arc.addArc(center: center, radius: radius, startAngle: startAngle, endAngle: endAngle, clockwise: false)
        ctx.stroke(arc, with: .color(LGColor.accentCyan.opacity(0.85)), style: StrokeStyle(lineWidth: 3, lineCap: .round))

        // Center play triangle, gently pulsing.
        let s = radius * 0.55
        let pulse = (sin(t * 2.0) + 1) / 2
        var tri = Path()
        tri.move(to: CGPoint(x: center.x - s * 0.4, y: center.y - s * 0.62))
        tri.addLine(to: CGPoint(x: center.x - s * 0.4, y: center.y + s * 0.62))
        tri.addLine(to: CGPoint(x: center.x + s * 0.72, y: center.y))
        tri.closeSubpath()
        ctx.fill(tri, with: .color(LGColor.accentBlue.opacity(0.55 + pulse * 0.35)))

        // Expanding halo ring.
        let haloPhase = (t / 2.6).truncatingRemainder(dividingBy: 1.0)
        let haloRadius = radius + CGFloat(haloPhase) * radius * 1.8
        let haloRect = CGRect(
            x: center.x - haloRadius, y: center.y - haloRadius,
            width: haloRadius * 2, height: haloRadius * 2
        )
        ctx.stroke(
            Path(ellipseIn: haloRect),
            with: .color(LGColor.accentBlue.opacity((1.0 - haloPhase) * 0.28)),
            lineWidth: 1.5
        )
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

// MARK: - 3. Scrub Timeline (playback scrubber)

/// A horizontal playback scrubber: a track with a filling progress portion, a
/// glowing playhead sweeping left→right, and a row of waveform ticks beneath
/// that light up as the playhead passes — the core "watching media" gesture.
struct ScrubTimelineAnimation: View {
    private let tickCount = 44

    var body: some View {
        TimelineView(.animation) { context in
            Canvas { ctx, size in
                Self.draw(in: &ctx, size: size, t: context.date.timeIntervalSinceReferenceDate, tickCount: tickCount)
            }
        }
        .blendMode(.screen)
        .allowsHitTesting(false)
    }

    private static func draw(in ctx: inout GraphicsContext, size: CGSize, t: Double, tickCount: Int) {
        let midY = size.height / 2
        let left = size.width * 0.1
        let right = size.width * 0.9
        let width = right - left
        let progress = (t / 5.0).truncatingRemainder(dividingBy: 1.0)
        let playX = left + width * CGFloat(progress)

        // Base track + filled (played) portion.
        let track = CGRect(x: left, y: midY - 1.5, width: width, height: 3)
        ctx.fill(Path(roundedRect: track, cornerRadius: 1.5), with: .color(LGColor.accentBlue.opacity(0.18)))
        let filled = CGRect(x: left, y: midY - 1.5, width: width * CGFloat(progress), height: 3)
        ctx.fill(Path(roundedRect: filled, cornerRadius: 1.5), with: .color(LGColor.accentCyan.opacity(0.75)))

        // Waveform ticks beneath the track; ticks the playhead has passed glow brighter.
        for i in 0 ..< tickCount {
            let frac = (Double(i) + 0.5) / Double(tickCount)
            let x = left + width * CGFloat(frac)
            let h = CGFloat((sin(Double(i) * 0.7) + sin(Double(i) * 1.9)) * 0.25 + 0.6) * 18 + 3
            let passed = frac <= progress
            let tint = passed ? LGColor.accentCyan : LGColor.accentBlue
            let bar = CGRect(x: x - 0.9, y: midY + 8, width: 1.8, height: h)
            ctx.fill(Path(roundedRect: bar, cornerRadius: 0.9), with: .color(tint.opacity(passed ? 0.5 : 0.2)))
        }

        // Glowing playhead with a soft halo.
        let head = CGRect(x: playX - 4.5, y: midY - 4.5, width: 9, height: 9)
        ctx.fill(Path(ellipseIn: head.insetBy(dx: -4, dy: -4)), with: .color(LGColor.accentCyan.opacity(0.25)))
        ctx.fill(Path(ellipseIn: head), with: .color(LGColor.accentCyan))
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

// MARK: - 5. Tile Grid (saved-video library)

/// A grid of rounded video tiles, each marked with a tiny play glyph, shimmering
/// in a diagonal wave — evokes a library of saved videos ready for offline play.
struct TileGridAnimation: View {
    private let columns = 4
    private let rows = 6

    var body: some View {
        TimelineView(.animation) { context in
            Canvas { ctx, size in
                Self.draw(
                    in: &ctx,
                    size: size,
                    t: context.date.timeIntervalSinceReferenceDate,
                    columns: columns,
                    rows: rows
                )
            }
        }
        .blendMode(.screen)
        .allowsHitTesting(false)
    }

    private static let palette: [Color] = [LGColor.accentBlue, LGColor.accentCyan, LGColor.accentPink]

    private static func draw(in ctx: inout GraphicsContext, size: CGSize, t: Double, columns: Int, rows: Int) {
        let pad: CGFloat = 12
        let cellW = (size.width - pad * CGFloat(columns + 1)) / CGFloat(columns)
        let cellH = cellW * 0.62
        let gridH = cellH * CGFloat(rows) + pad * CGFloat(rows - 1)
        let topY = (size.height - gridH) / 2

        for r in 0 ..< rows {
            for c in 0 ..< columns {
                let x = pad + CGFloat(c) * (cellW + pad)
                let y = topY + CGFloat(r) * (cellH + pad)
                // Diagonal shimmer wave across the grid.
                let glow = (sin(t * 1.4 - Double(r + c) * 0.55) + 1) / 2
                let tint = palette[(r + c) % palette.count]

                let rect = CGRect(x: x, y: y, width: cellW, height: cellH)
                let tile = Path(roundedRect: rect, cornerRadius: 5)
                ctx.fill(tile, with: .color(tint.opacity(0.05 + glow * 0.14)))
                ctx.stroke(tile, with: .color(tint.opacity(0.14 + glow * 0.34)), lineWidth: 1)

                // Tiny centered play glyph.
                let cx = x + cellW / 2
                let cy = y + cellH / 2
                let s = cellH * 0.22
                var play = Path()
                play.move(to: CGPoint(x: cx - s * 0.4, y: cy - s * 0.6))
                play.addLine(to: CGPoint(x: cx - s * 0.4, y: cy + s * 0.6))
                play.addLine(to: CGPoint(x: cx + s * 0.7, y: cy))
                play.closeSubpath()
                ctx.fill(play, with: .color(tint.opacity(0.35 + glow * 0.5)))
            }
        }
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
