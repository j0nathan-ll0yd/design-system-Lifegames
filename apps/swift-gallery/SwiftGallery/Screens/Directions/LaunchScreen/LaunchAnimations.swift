import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

// MARK: - Launch Animation Catalog

//
// Five self-contained, token-pure, looping neon backdrops for the Launch /
// Login screens. Each is a presentational `View` that fills its container and
// is designed to sit BEHIND the OFFLINE / "media downloader" branding. Every
// backdrop reads as a media-download motif and draws from the full DS accent
// palette (OMDNeon) so the set stays vivid and colorful. All drawing is
// factored into explicitly-typed `static func draw(...)` helpers so each Canvas
// body stays trivial for the Swift type-checker (a fat Canvas closure timed out
// on CI's toolchain).

/// Shared neon palette — every backdrop cycles these so the set is colorful.
enum OMDNeon {
    static let palette: [Color] = [
        LGColor.accentCyan,
        LGColor.accentBlue,
        LGColor.accentPink,
        LGColor.accentGreen,
        LGColor.accentAmber,
        LGColor.accentPurple,
    ]

    static func color(_ index: Int) -> Color {
        let count = palette.count
        return palette[((index % count) + count) % count]
    }
}

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
        case .bufferRing: return "Play glyph inside a sweeping, gradient buffer ring"
        case .downloadStream: return "Multi-color download motes raining into a tray"
        case .scrubTimeline: return "Playback scrubber over a rainbow waveform timeline"
        case .waveform: return "Rainbow neon equalizer bars breathing in place"
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
        .opacity(dimmed ? 0.5 : 1.0)
        .transition(.opacity)
    }
}

// MARK: - 1. Buffer Ring (play glyph + sweeping loader)

/// A central play triangle inside a circular track, with a cyan→pink gradient
/// arc sweeping around it like a video buffering indicator, orbiting colored
/// motes, and a soft halo that expands to fill the space.
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
        let trackRect = CGRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2)
        ctx.stroke(Path(ellipseIn: trackRect), with: .color(LGColor.accentBlue.opacity(0.16)), lineWidth: 3)

        // Sweeping buffer arc with a cyan→pink gradient.
        let sweep = (t / 1.6).truncatingRemainder(dividingBy: 1.0)
        let start = Angle(radians: sweep * 2 * Double.pi - Double.pi / 2)
        let end = Angle(radians: (sweep + 0.3) * 2 * Double.pi - Double.pi / 2)
        var arc = Path()
        arc.addArc(center: center, radius: radius, startAngle: start, endAngle: end, clockwise: false)
        ctx.stroke(
            arc,
            with: .linearGradient(
                Gradient(colors: [LGColor.accentCyan, LGColor.accentPink]),
                startPoint: CGPoint(x: center.x - radius, y: center.y),
                endPoint: CGPoint(x: center.x + radius, y: center.y)
            ),
            style: StrokeStyle(lineWidth: 3.5, lineCap: .round)
        )

        // Orbiting colored motes around the ring.
        for i in 0 ..< 6 {
            let a = sweep * 2 * Double.pi + Double(i) / 6 * 2 * Double.pi
            let p = CGPoint(x: center.x + CGFloat(cos(a)) * radius, y: center.y + CGFloat(sin(a)) * radius)
            let dotRect = CGRect(x: p.x - 2.5, y: p.y - 2.5, width: 5, height: 5)
            ctx.fill(Path(ellipseIn: dotRect), with: .color(OMDNeon.color(i).opacity(0.85)))
        }

        // Center play triangle with a cyan→blue gradient.
        let s = radius * 0.55
        var tri = Path()
        tri.move(to: CGPoint(x: center.x - s * 0.4, y: center.y - s * 0.62))
        tri.addLine(to: CGPoint(x: center.x - s * 0.4, y: center.y + s * 0.62))
        tri.addLine(to: CGPoint(x: center.x + s * 0.72, y: center.y))
        tri.closeSubpath()
        ctx.fill(
            tri,
            with: .linearGradient(
                Gradient(colors: [LGColor.accentCyan, LGColor.accentBlue]),
                startPoint: CGPoint(x: center.x - s, y: center.y),
                endPoint: CGPoint(x: center.x + s, y: center.y)
            )
        )

        // Expanding halo ring, pink-tinted.
        let halo = (t / 2.6).truncatingRemainder(dividingBy: 1.0)
        let hr = radius + CGFloat(halo) * radius * 1.8
        let haloRect = CGRect(x: center.x - hr, y: center.y - hr, width: hr * 2, height: hr * 2)
        ctx.stroke(Path(ellipseIn: haloRect), with: .color(LGColor.accentPink.opacity((1.0 - halo) * 0.26)), lineWidth: 1.5)
    }
}

// MARK: - 2. Data Stream (download motes)

/// Vertical lanes of glowing dashes falling toward a collection tray — a literal
/// "downloading" metaphor. Each lane carries its own neon color so the field
/// reads as a colorful rain of media.
struct DataStreamAnimation: View {
    private let laneCount = 7
    private let dashCount = 6

    var body: some View {
        TimelineView(.animation) { context in
            Canvas { ctx, size in
                Self.draw(
                    in: &ctx,
                    size: size,
                    t: context.date.timeIntervalSinceReferenceDate,
                    laneCount: laneCount,
                    dashCount: dashCount
                )
            }
        }
        .blendMode(.screen)
        .allowsHitTesting(false)
    }

    private static func draw(in ctx: inout GraphicsContext, size: CGSize, t: Double, laneCount: Int, dashCount: Int) {
        let dashHeight = size.height * 0.05
        let gap = size.height / CGFloat(dashCount)

        for lane in 0 ..< laneCount {
            let frac = (CGFloat(lane) + 0.5) / CGFloat(laneCount)
            let x = frac * size.width
            let speed = 0.45 + Double((lane * 37) % 5) * 0.12
            let phase = Double((lane * 53) % 10) / 10.0
            let tint = OMDNeon.color(lane)
            let travel = ((t * speed) + phase).truncatingRemainder(dividingBy: 1.0)

            for d in 0 ..< dashCount {
                let baseY = (CGFloat(d) * gap) + (CGFloat(travel) * gap)
                let y = baseY.truncatingRemainder(dividingBy: size.height)
                let fade = 1.0 - (y / size.height)
                let rect = CGRect(x: x - 1.25, y: y, width: 2.5, height: dashHeight)
                ctx.fill(Path(roundedRect: rect, cornerRadius: 1.25), with: .color(tint.opacity(Double(fade) * 0.7)))
            }
        }

        // Glowing collection tray at the bottom (cyan→pink gradient).
        let trayRect = CGRect(x: 0, y: size.height - 2.5, width: size.width, height: 2.5)
        ctx.fill(
            Path(trayRect),
            with: .linearGradient(
                Gradient(colors: [LGColor.accentCyan, LGColor.accentPink]),
                startPoint: CGPoint(x: 0, y: 0),
                endPoint: CGPoint(x: size.width, y: 0)
            )
        )
    }
}

// MARK: - 3. Scrub Timeline (playback scrubber)

/// A horizontal playback scrubber: a track with a filling progress portion, a
/// glowing playhead sweeping left→right, and a row of waveform ticks beneath
/// colored as a rainbow across the timeline that brighten as the playhead passes.
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

        // Base track.
        let track = CGRect(x: left, y: midY - 1.5, width: width, height: 3)
        ctx.fill(Path(roundedRect: track, cornerRadius: 1.5), with: .color(LGColor.accentBlue.opacity(0.16)))
        // Filled (played) portion — rainbow gradient.
        let filled = CGRect(x: left, y: midY - 1.5, width: width * CGFloat(progress), height: 3)
        ctx.fill(
            Path(roundedRect: filled, cornerRadius: 1.5),
            with: .linearGradient(
                Gradient(colors: [LGColor.accentCyan, LGColor.accentBlue, LGColor.accentPink]),
                startPoint: CGPoint(x: left, y: 0),
                endPoint: CGPoint(x: right, y: 0)
            )
        )

        // Waveform ticks beneath, colored by position; passed ticks glow brighter.
        for i in 0 ..< tickCount {
            let frac = (Double(i) + 0.5) / Double(tickCount)
            let x = left + width * CGFloat(frac)
            let h = CGFloat((sin(Double(i) * 0.7) + sin(Double(i) * 1.9)) * 0.25 + 0.6) * 18 + 3
            let passed = frac <= progress
            let tint = OMDNeon.color(Int(frac * 6))
            let bar = CGRect(x: x - 0.9, y: midY + 8, width: 1.8, height: h)
            ctx.fill(Path(roundedRect: bar, cornerRadius: 0.9), with: .color(tint.opacity(passed ? 0.75 : 0.25)))
        }

        // Glowing playhead with a soft halo.
        let head = CGRect(x: playX - 4.5, y: midY - 4.5, width: 9, height: 9)
        ctx.fill(Path(ellipseIn: head.insetBy(dx: -4, dy: -4)), with: .color(LGColor.accentCyan.opacity(0.3)))
        ctx.fill(Path(ellipseIn: head), with: .color(LGColor.accentCyan))
    }
}

// MARK: - 4. Waveform (rainbow equalizer)

/// A horizontal row of vertical bars whose heights breathe like an audio
/// equalizer. Each bar is tinted from the neon palette so the row reads as a
/// vivid rainbow. Heights come from layered sines — organic but deterministic.
struct WaveformPulseAnimation: View {
    private let barCount = 28

    var body: some View {
        TimelineView(.animation) { context in
            Canvas { ctx, size in
                Self.draw(in: &ctx, size: size, t: context.date.timeIntervalSinceReferenceDate, barCount: barCount)
            }
        }
        .blendMode(.screen)
        .allowsHitTesting(false)
    }

    private static func draw(in ctx: inout GraphicsContext, size: CGSize, t: Double, barCount: Int) {
        let centerY = size.height / 2
        let spacing = size.width / CGFloat(barCount)
        let barWidth = spacing * 0.46
        let maxHalf = size.height * 0.3

        for i in 0 ..< barCount {
            let x = (CGFloat(i) + 0.5) * spacing
            let wave = sin(t * 1.6 + Double(i) * 0.5) + 0.5 * sin(t * 2.7 + Double(i) * 0.9)
            let norm = (wave + 1.5) / 3.0
            let half = maxHalf * (0.18 + CGFloat(norm) * 0.82)
            let rect = CGRect(x: x - barWidth / 2, y: centerY - half, width: barWidth, height: half * 2)
            let tint = OMDNeon.color(i)
            ctx.fill(Path(roundedRect: rect, cornerRadius: barWidth / 2), with: .color(tint.opacity(0.35 + norm * 0.45)))
        }

        // Center baseline.
        let line = CGRect(x: 0, y: centerY - 0.5, width: size.width, height: 1)
        ctx.fill(Path(line), with: .color(LGColor.accentCyan.opacity(0.2)))
    }
}

// MARK: - 5. Tile Grid (saved-video library)

/// A grid of rounded video tiles, each marked with a tiny play glyph, shimmering
/// in a diagonal wave through the full palette — evokes a colorful library of
/// saved videos ready for offline play.
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
                let glow = (sin(t * 1.4 - Double(r + c) * 0.55) + 1) / 2
                let tint = OMDNeon.color(r * columns + c)

                let rect = CGRect(x: x, y: y, width: cellW, height: cellH)
                let tile = Path(roundedRect: rect, cornerRadius: 5)
                ctx.fill(tile, with: .color(tint.opacity(0.07 + glow * 0.18)))
                ctx.stroke(tile, with: .color(tint.opacity(0.2 + glow * 0.4)), lineWidth: 1)

                let cx = x + cellW / 2
                let cy = y + cellH / 2
                let s = cellH * 0.22
                var play = Path()
                play.move(to: CGPoint(x: cx - s * 0.4, y: cy - s * 0.6))
                play.addLine(to: CGPoint(x: cx - s * 0.4, y: cy + s * 0.6))
                play.addLine(to: CGPoint(x: cx + s * 0.7, y: cy))
                play.closeSubpath()
                ctx.fill(play, with: .color(tint.opacity(0.45 + glow * 0.5)))
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
