import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

/// Scrolling ECG trace that mirrors the web HeartRate widget.
///
/// Renders a physiologically shaped PQRST waveform (ECGSYN Gaussian-sum model,
/// matching `packages/web/src/runtime/heart-rate.ts → generateECGSamples`) as a
/// continuous strip that scrolls right-to-left at a fixed pixels-per-second rate.
/// Complex spacing is derived from `bpm` (faster heart rate = more closely spaced
/// complexes). Realism notes (per ECGSYN literature):
///   • The R wave dominates (≈5–10× P/T) so the trace reads as flat-baseline-with-
///     sharp-spikes rather than a continuous wobble.
///   • Each beat is sampled on a dense phase grid with the exact P/Q/R/S/T centers
///     injected as vertices, so the narrow R spike is always captured and never
///     aliases (the prior fixed-pixel sampling made the spike height "wobble" as it
///     scrolled past sub-pixel sample positions).
///   • The diastolic (TP) segment falls out naturally as the Gaussian tails decay
///     to zero — a true flat isoelectric baseline between complexes.
/// The stroke is drawn in two passes (a soft wide glow under a sharp core line).
public struct ECGBackgroundView: View {
    public let color: Color
    /// Legacy animation hint retained for source compatibility. The waveform now
    /// scrolls at a fixed rate (matching web) and derives its rhythm from `bpm`,
    /// so this value no longer affects rendering.
    public var speed: Double
    /// Heart rate in beats per minute. Drives complex spacing and QT shaping to
    /// match the web ECG. Default: 72 (normal resting).
    public var bpm: Double
    /// When false, renders the static (non-scrolling) waveform regardless of motion
    /// settings. Defaults to true. Reduce-motion also forces the static render.
    public var animated: Bool

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// Canvas-space scroll rate. Matches the web monitor's `pixelsPerSecond = 50`.
    private let pixelsPerSecond = 50.0

    public init(color: Color, speed: Double = 4.0, bpm: Double = 72, animated: Bool = true) {
        self.color = color
        self.speed = speed
        self.bpm = bpm
        self.animated = animated
    }

    /// Per-beat phase samples: a dense uniform grid merged with the exact PQRST wave
    /// centers. Injecting the centers guarantees the narrow Q/R/S peaks are rendered
    /// at full height on every frame regardless of scroll offset — this is what kills
    /// the "wobble." Phase is normalized to one cardiac cycle in [0, 1].
    private static let beatPhases: [Double] = {
        let centers = [0.16, 0.30, 0.335, 0.365, 0.60]
        let steps = 120
        var phases = (0 ... steps).map { Double($0) / Double(steps) }
        phases.append(contentsOf: centers)
        return phases.sorted()
    }()

    /// PQRST amplitude for a normalized beat phase `t` in [0, 1]. ECGSYN Gaussian-sum
    /// model: the R wave is normalized to 1.0 and dominates; P/T are small broad bumps;
    /// Q/S are sharp negative flanks bracketing R. The T-wave center shortens toward R
    /// at higher heart rate (Bazett QT shortening).
    private func ecgSample(_ t: Double) -> Double {
        let hrFact = (bpm / 60).squareRoot()
        let tCenter = max(0.44, 0.60 - (hrFact - 1) * 0.10)
        // (amplitude, center, width)
        let waves: [(Double, Double, Double)] = [
            (0.10, 0.16, 0.022), // P  — small, broad
            (-0.13, 0.30, 0.013), // Q  — sharp negative flank
            (1.00, 0.335, 0.013), // R  — dominant sharp spike
            (-0.30, 0.365, 0.016), // S — deeper sharp negative flank
            (0.22, tCenter, 0.060), // T — moderate, broad
        ]
        var value = 0.0
        for (amplitude, center, width) in waves {
            let exponent = (t - center) / width
            value += amplitude * exp(-0.5 * exponent * exponent)
        }
        return value
    }

    /// Build the visible waveform for a given horizontal scroll offset (in points).
    /// Each beat is laid down from its origin using the shared phase grid, so the
    /// trace is a sequence of discrete, identical complexes separated by flat baseline.
    private func waveformPath(size: CGSize, scroll: Double) -> Path {
        let baseline = size.height * 0.60
        let amplitude = size.height * 0.46
        let beatSpacing = max(26.0, pixelsPerSecond * 60.0 / bpm)

        var path = Path()
        path.move(to: CGPoint(x: 0, y: baseline))

        // Origin (phase 0) of the first complex at or just left of the visible area.
        var origin = -scroll.truncatingRemainder(dividingBy: beatSpacing)
        if origin > 0 { origin -= beatSpacing }

        while origin < size.width {
            for phase in Self.beatPhases {
                let x = origin + phase * beatSpacing
                if x < 0 || x > size.width { continue }
                let y = baseline - ecgSample(phase) * amplitude
                path.addLine(to: CGPoint(x: x, y: y))
            }
            origin += beatSpacing
        }
        path.addLine(to: CGPoint(x: size.width, y: baseline))
        return path
    }

    /// Two-pass stroke: soft wide glow under a sharp core line (mirrors the web
    /// glow pass at 0.25 alpha / 3.5px + sharp pass at 1.0 alpha / 1.5px).
    private func drawTrace(_ context: GraphicsContext, size: CGSize, scroll: Double) {
        let path = waveformPath(size: size, scroll: scroll)
        var glow = context
        glow.addFilter(.shadow(color: color.opacity(0.55), radius: 5))
        glow.stroke(path, with: .color(color.opacity(0.35)), lineWidth: 3.5)
        context.stroke(path, with: .color(color), lineWidth: 1.5)
    }

    public var body: some View {
        if reduceMotion || !animated {
            Canvas { context, size in
                drawTrace(context, size: size, scroll: 0)
            }
            .allowsHitTesting(false)
        } else {
            TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { timeline in
                Canvas { context, size in
                    let time = timeline.date.timeIntervalSinceReferenceDate
                    drawTrace(context, size: size, scroll: time * pixelsPerSecond)
                }
            }
            .allowsHitTesting(false)
        }
    }
}

public struct PulsingMapMarker: View {
    public let color: Color
    @State private var isPulsing = false

    public init(color: Color) {
        self.color = color
    }

    public var body: some View {
        ZStack {
            Circle()
                .stroke(color.opacity(0.3), lineWidth: 2)
                .frame(width: 24, height: 24)
                .scaleEffect(isPulsing ? 2 : 1)
                .opacity(isPulsing ? 0 : 0.6)
                .animation(.easeOut(duration: 2).repeatForever(autoreverses: false), value: isPulsing)

            Circle()
                .fill(color)
                .frame(width: 10, height: 10)
                .shadow(color: color.opacity(0.6), radius: 6)
        }
        .task { isPulsing = true }
    }
}

#Preview("Neon Effects") {
    VStack(spacing: 30) {
        HStack(spacing: 30) {
            LiveDotView(color: Color.colorAccentGreen)
            LiveDotView(color: Color.colorAccentPink)
            LiveDotView(color: Color.colorAccentBlue)
        }
        PulsingMapMarker(color: Color.colorAccentGreen)
            .frame(height: 40)
        VStack(spacing: 8) {
            Text("ECG: 42 BPM (bradycardia)").font(.caption).foregroundStyle(.secondary)
            ECGBackgroundView(color: Color.colorAccentBlue, bpm: 42).frame(height: 44)
            Text("ECG: 72 BPM (normal)").font(.caption).foregroundStyle(.secondary)
            ECGBackgroundView(color: Color.colorAccentPink, bpm: 72).frame(height: 44)
            Text("ECG: 165 BPM (peak)").font(.caption).foregroundStyle(.secondary)
            ECGBackgroundView(color: Color.colorAccentAmber, bpm: 165).frame(height: 44)
        }
    }
    .padding()
    .background(Color.colorSurfaceBase)
    .preferredColorScheme(.dark)
}
