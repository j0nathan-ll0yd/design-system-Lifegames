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
