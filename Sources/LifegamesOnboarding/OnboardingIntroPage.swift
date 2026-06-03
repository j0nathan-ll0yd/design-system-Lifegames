import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct OnboardingIntroPage: View {
    public let totalPages: Int
    public let onContinue: @Sendable () -> Void

    public init(totalPages: Int, onContinue: @Sendable @escaping () -> Void) {
        self.totalPages = totalPages
        self.onContinue = onContinue
    }

    public var body: some View {
        VStack(spacing: Spacing.s800) {
            Spacer()

            VStack(spacing: Spacing.s500) {
                ZStack {
                    Circle()
                        .fill(LGColor.accentPink.opacity(0.12))
                        .frame(width: 96, height: 96)
                    Image(systemName: "sparkles")
                        .font(.system(size: 40, weight: .medium))
                        .foregroundStyle(LGColor.accentPink)
                        .neonGlow(LGColor.accentPink, radius: 8)
                }

                VStack(spacing: Spacing.s300) {
                    Text("LIFE PORTAL")
                        .font(.system(.title, design: .monospaced, weight: .bold))
                        .foregroundStyle(LGColor.textTitle)
                        .tracking(2)

                    Text("needs a few permissions\nto work properly.")
                        .font(.system(.body, design: .default, weight: .regular))
                        .foregroundStyle(LGColor.textMuted)
                        .multilineTextAlignment(.center)
                }
            }

            Spacer()

            VStack(spacing: Spacing.s500) {
                OnboardingProgressDots(total: totalPages, currentIndex: 0)

                Button(action: onContinue) {
                    Text("CONTINUE")
                        .font(.system(.callout, design: .monospaced, weight: .bold))
                        .tracking(1.5)
                        .foregroundStyle(LGColor.surfaceBase)
                        .frame(maxWidth: .infinity)
                        .frame(minHeight: 44)
                        .padding(.vertical, Spacing.s400)
                        .background(LGColor.accentPink)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .neonGlow(LGColor.accentPink, radius: 6)
                }
                .contentShape(.rect)
            }
        }
        .padding(Spacing.s800)
        .neonCard(accent: LGColor.accentPink)
    }
}

#Preview("Intro Page") {
    OnboardingIntroPage(totalPages: 5, onContinue: {})
        .padding(Spacing.s600)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
}
