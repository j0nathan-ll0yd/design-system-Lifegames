import LifegamesTokens
import SwiftUI

public struct LiveDotView: View {
    public let color: Color
    @State private var isPulsing = false

    public init(color: Color) {
        self.color = color
    }

    public var body: some View {
        Circle()
            .fill(color)
            .frame(width: 6, height: 6)
            .scaleEffect(isPulsing ? 1.3 : 1.0)
            .opacity(isPulsing ? 0.6 : 1.0)
            .animation(.easeInOut(duration: 2).repeatForever(autoreverses: true), value: isPulsing)
            .task { isPulsing = true }
    }
}

public struct ECGBackgroundView: View {
    public let color: Color

    public init(color: Color) {
        self.color = color
    }

    public var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { timeline in
            Canvas { context, size in
                let time = timeline.date.timeIntervalSinceReferenceDate
                let offset = time.truncatingRemainder(dividingBy: 2.0) / 2.0

                var path = Path()
                let midY = size.height / 2
                let amplitude = size.height * 0.25

                for x in stride(from: 0, through: size.width, by: 2) {
                    let normalizedX = (x / size.width + offset) * .pi * 4
                    let y = midY + sin(normalizedX) * amplitude
                        * (1.0 + 0.5 * sin(normalizedX * 0.3))

                    if x == 0 {
                        path.move(to: CGPoint(x: x, y: y))
                    } else {
                        path.addLine(to: CGPoint(x: x, y: y))
                    }
                }

                context.addFilter(.shadow(color: color.opacity(0.4), radius: 4))
                context.stroke(path, with: .color(color.opacity(0.3)), lineWidth: 1.5)
            }
        }
        .allowsHitTesting(false)
    }
}

public struct NeonGlowModifier: ViewModifier {
    public let color: Color
    public let radius: CGFloat

    public init(color: Color, radius: CGFloat = 6) {
        self.color = color
        self.radius = radius
    }

    public func body(content: Content) -> some View {
        content
            .shadow(color: color.opacity(0.5), radius: radius, x: 0, y: 0)
            .shadow(color: color.opacity(0.2), radius: radius * 2, x: 0, y: 0)
    }
}

public extension View {
    func neonGlow(_ color: Color, radius: CGFloat = 6) -> some View {
        modifier(NeonGlowModifier(color: color, radius: radius))
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
        ECGBackgroundView(color: Color.colorAccentPink)
            .frame(height: 60)
    }
    .padding()
    .background(Color.colorSurfaceBase)
    .preferredColorScheme(.dark)
}
