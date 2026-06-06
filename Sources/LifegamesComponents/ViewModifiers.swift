import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

public struct GradientBackgroundModifier: ViewModifier {
    public func body(content: Content) -> some View {
        content
            .background {
                ZStack {
                    Color.colorSurfaceBase
                    RadialGradient(
                        colors: [Color.colorAccentDefault.opacity(0.08), .clear],
                        center: UnitPoint(x: 0.2, y: 0.5),
                        startRadius: 0, endRadius: 400
                    )
                    RadialGradient(
                        colors: [Color.colorAccentPurple.opacity(0.06), .clear],
                        center: UnitPoint(x: 0.8, y: 0.2),
                        startRadius: 0, endRadius: 400
                    )
                    RadialGradient(
                        colors: [Color.colorAccentBlue.opacity(0.05), .clear],
                        center: UnitPoint(x: 0.5, y: 0.8),
                        startRadius: 0, endRadius: 400
                    )
                }
                .ignoresSafeArea()
            }
    }
}

#if os(iOS)
    public struct DismissKeyboardOnTapModifier: ViewModifier {
        public func body(content: Content) -> some View {
            content
                .contentShape(Rectangle())
                .onTapGesture {
                    UIApplication.shared.sendAction(
                        #selector(UIResponder.resignFirstResponder),
                        to: nil, from: nil, for: nil
                    )
                }
        }
    }
#endif

public extension View {
    func dismissKeyboardOnTap() -> some View {
        #if os(iOS)
            modifier(DismissKeyboardOnTapModifier())
        #else
            self
        #endif
    }

    func gradientBackground() -> some View {
        modifier(GradientBackgroundModifier())
    }
}
