import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct OnboardingSummaryPage: View {
    public let permissions: [OnboardingPermissionProps]
    public let onComplete: @Sendable () -> Void

    public init(
        permissions: [OnboardingPermissionProps],
        onComplete: @Sendable @escaping () -> Void
    ) {
        self.permissions = permissions
        self.onComplete = onComplete
    }

    public var body: some View {
        VStack(spacing: Spacing.s800) {
            Spacer()

            VStack(spacing: Spacing.s500) {
                ZStack {
                    Circle()
                        .fill(LGColor.accentGreen.opacity(0.12))
                        .frame(width: 96, height: 96)
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 40, weight: .medium))
                        .foregroundStyle(LGColor.accentGreen)
                        .neonGlow(LGColor.accentGreen, radius: 8)
                }

                VStack(spacing: Spacing.s300) {
                    Text("ALL SET")
                        .font(.system(.title, design: .monospaced, weight: .bold))
                        .foregroundStyle(LGColor.textTitle)
                        .tracking(2)

                    Text("You're ready to go.")
                        .font(.system(.body))
                        .foregroundStyle(LGColor.textMuted)
                }
            }

            statusRows

            Spacer()

            Button(action: onComplete) {
                Text("GET STARTED")
                    .font(.system(.callout, design: .monospaced, weight: .bold))
                    .tracking(1.5)
                    .foregroundStyle(LGColor.surfaceBase)
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: 44)
                    .padding(.vertical, Spacing.s400)
                    .background(LGColor.accentGreen)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .neonGlow(LGColor.accentGreen, radius: 6)
            }
            .contentShape(.rect)
        }
        .padding(Spacing.s800)
        .neonCard(accent: LGColor.accentGreen)
    }

    private var statusRows: some View {
        VStack(spacing: Spacing.s300) {
            ForEach(permissions, id: \.id) { permission in
                HStack {
                    Image(systemName: permission.icon)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(permission.accentColor)
                        .frame(width: 20)

                    Text(permission.title)
                        .font(.system(.callout, design: .monospaced))
                        .foregroundStyle(LGColor.textPrimary)

                    Spacer()

                    statusLabel(for: permission.status, accentColor: permission.accentColor)
                }
                .padding(.horizontal, Spacing.s500)
                .padding(.vertical, Spacing.s300)
                .background(LGColor.surfaceInset)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
    }

    @ViewBuilder
    private func statusLabel(
        for status: OnboardingPermissionProps.PermissionDisplayStatus,
        accentColor _: Color
    ) -> some View {
        switch status {
        case .granted:
            Text("GRANTED")
                .font(.system(.caption2, design: .monospaced, weight: .bold))
                .foregroundStyle(LGColor.accentGreen)
                .tracking(0.8)
        case .denied:
            Text("DENIED")
                .font(.system(.caption2, design: .monospaced, weight: .bold))
                .foregroundStyle(LGColor.accentRed)
                .tracking(0.8)
        case .skipped:
            Text("SKIPPED")
                .font(.system(.caption2, design: .monospaced, weight: .bold))
                .foregroundStyle(LGColor.textSubtle)
                .tracking(0.8)
        case .pending, .requesting:
            Text("PENDING")
                .font(.system(.caption2, design: .monospaced, weight: .bold))
                .foregroundStyle(LGColor.textDisabled)
                .tracking(0.8)
        }
    }
}

#Preview("Summary Page") {
    OnboardingSummaryPage(
        permissions: [
            OnboardingPermissionProps(
                id: "healthKit",
                icon: "heart.fill",
                title: "HEALTH",
                description: "",
                accentColor: LGColor.accentPink,
                status: .granted
            ),
            OnboardingPermissionProps(
                id: "locationAlways",
                icon: "location.fill",
                title: "LOCATION",
                description: "",
                accentColor: LGColor.accentGreen,
                status: .granted
            ),
            OnboardingPermissionProps(
                id: "motion",
                icon: "figure.walk",
                title: "MOTION",
                description: "",
                accentColor: LGColor.accentAmber,
                status: .skipped
            ),
        ],
        onComplete: {}
    )
    .padding(Spacing.s600)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}
