import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct OnboardingPermissionPage: View {
    public let props: OnboardingPermissionProps
    public let pageIndex: Int
    public let totalPages: Int
    public let onRequestPermission: @Sendable (String) -> Void
    public let onOpenSettings: @Sendable () -> Void
    public let onSkipPermission: @Sendable (String) -> Void

    public init(
        props: OnboardingPermissionProps,
        pageIndex: Int,
        totalPages: Int,
        onRequestPermission: @Sendable @escaping (String) -> Void,
        onOpenSettings: @Sendable @escaping () -> Void,
        onSkipPermission: @Sendable @escaping (String) -> Void
    ) {
        self.props = props
        self.pageIndex = pageIndex
        self.totalPages = totalPages
        self.onRequestPermission = onRequestPermission
        self.onOpenSettings = onOpenSettings
        self.onSkipPermission = onSkipPermission
    }

    public var body: some View {
        VStack(spacing: Spacing.s800) {
            Spacer()

            VStack(spacing: Spacing.s500) {
                iconView
                textContent
                statusBadge
            }

            Spacer()

            VStack(spacing: Spacing.s500) {
                OnboardingProgressDots(total: totalPages, currentIndex: pageIndex)
                actionButtons
            }
        }
        .padding(Spacing.s800)
        .neonCard(accent: props.accentColor)
    }

    private var iconView: some View {
        ZStack {
            Circle()
                .fill(props.accentColor.opacity(0.12))
                .frame(width: 96, height: 96)
            Image(systemName: props.icon)
                .font(.system(size: 40, weight: .medium))
                .foregroundStyle(props.accentColor)
                .neonGlow(props.accentColor, radius: 8)
        }
    }

    private var textContent: some View {
        VStack(spacing: Spacing.s300) {
            Text(props.title)
                .font(.system(.title2, design: .monospaced, weight: .bold))
                .foregroundStyle(LGColor.textTitle)
                .tracking(1)

            Text(props.description)
                .font(.system(.body))
                .foregroundStyle(LGColor.textMuted)
                .multilineTextAlignment(.center)
        }
    }

    @ViewBuilder
    private var statusBadge: some View {
        switch props.status {
        case .pending, .requesting:
            HStack(spacing: Spacing.s200) {
                if props.status == .requesting {
                    ProgressView()
                        .tint(props.accentColor)
                        .scaleEffect(0.8)
                }
                Text(props.status == .requesting ? "REQUESTING..." : "PENDING")
                    .font(.system(.caption, design: .monospaced, weight: .medium))
                    .foregroundStyle(LGColor.textSubtle)
                    .tracking(1)
            }

        case .granted:
            HStack(spacing: Spacing.s200) {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(LGColor.accentGreen)
                Text("GRANTED")
                    .font(.system(.caption, design: .monospaced, weight: .bold))
                    .foregroundStyle(LGColor.accentGreen)
                    .tracking(1)
            }
            .neonGlow(LGColor.accentGreen, radius: 4)

        case .denied:
            HStack(spacing: Spacing.s200) {
                Image(systemName: "xmark.circle.fill")
                    .foregroundStyle(LGColor.accentRed)
                Text("DENIED")
                    .font(.system(.caption, design: .monospaced, weight: .bold))
                    .foregroundStyle(LGColor.accentRed)
                    .tracking(1)
            }

        case .skipped:
            HStack(spacing: Spacing.s200) {
                Image(systemName: "minus.circle.fill")
                    .foregroundStyle(LGColor.textSubtle)
                Text("SKIPPED")
                    .font(.system(.caption, design: .monospaced, weight: .bold))
                    .foregroundStyle(LGColor.textSubtle)
                    .tracking(1)
            }
        }
    }

    @ViewBuilder
    private var actionButtons: some View {
        switch props.status {
        case .pending:
            Button {
                onRequestPermission(props.id)
            } label: {
                Text("GRANT ACCESS")
                    .font(.system(.callout, design: .monospaced, weight: .bold))
                    .tracking(1.5)
                    .foregroundStyle(LGColor.surfaceBase)
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: 44)
                    .padding(.vertical, Spacing.s400)
                    .background(props.accentColor)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .neonGlow(props.accentColor, radius: 6)
            }
            .contentShape(.rect)

        case .requesting:
            RoundedRectangle(cornerRadius: 12)
                .fill(props.accentColor.opacity(0.4))
                .frame(maxWidth: .infinity)
                .frame(height: 52)
                .overlay(
                    ProgressView()
                        .tint(LGColor.surfaceBase)
                )

        case .granted:
            RoundedRectangle(cornerRadius: 12)
                .fill(LGColor.accentGreen.opacity(0.15))
                .frame(maxWidth: .infinity)
                .frame(height: 52)
                .overlay(
                    HStack(spacing: Spacing.s200) {
                        Image(systemName: "checkmark")
                            .font(.system(.callout, weight: .bold))
                        Text("ACCESS GRANTED")
                            .font(.system(.callout, design: .monospaced, weight: .bold))
                            .tracking(1)
                    }
                    .foregroundStyle(LGColor.accentGreen)
                )

        case .denied:
            VStack(spacing: Spacing.s300) {
                Button {
                    onOpenSettings()
                } label: {
                    Text("OPEN SETTINGS")
                        .font(.system(.callout, design: .monospaced, weight: .bold))
                        .tracking(1.5)
                        .foregroundStyle(LGColor.surfaceBase)
                        .frame(maxWidth: .infinity)
                        .frame(minHeight: 44)
                        .padding(.vertical, Spacing.s400)
                        .background(props.accentColor)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .neonGlow(props.accentColor, radius: 6)
                }
                .contentShape(.rect)

                Button {
                    onSkipPermission(props.id)
                } label: {
                    Text("skip for now")
                        .font(.system(.footnote))
                        .foregroundStyle(LGColor.textSubtle)
                        .frame(minWidth: 44, minHeight: 44)
                }
                .contentShape(.rect)
            }

        case .skipped:
            EmptyView()
        }
    }
}

#Preview("Permission Page - Pending") {
    OnboardingPermissionPage(
        props: OnboardingPermissionProps(
            id: "healthKit",
            icon: "heart.fill",
            title: "HEALTH DATA",
            description: "LifePortal reads your heart rate, activity, sleep, and more.",
            accentColor: LGColor.accentPink,
            status: .pending
        ),
        pageIndex: 1,
        totalPages: 5,
        onRequestPermission: { _ in },
        onOpenSettings: {},
        onSkipPermission: { _ in }
    )
    .padding(Spacing.s600)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

#Preview("Permission Page - Granted") {
    OnboardingPermissionPage(
        props: OnboardingPermissionProps(
            id: "locationAlways",
            icon: "location.fill",
            title: "LOCATION",
            description: "LifePortal tracks where you go to log your activities.",
            accentColor: LGColor.accentGreen,
            status: .granted
        ),
        pageIndex: 2,
        totalPages: 5,
        onRequestPermission: { _ in },
        onOpenSettings: {},
        onSkipPermission: { _ in }
    )
    .padding(Spacing.s600)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

#Preview("Permission Page - Denied") {
    OnboardingPermissionPage(
        props: OnboardingPermissionProps(
            id: "motion",
            icon: "figure.walk",
            title: "MOTION",
            description: "LifePortal detects your activity type using motion sensors.",
            accentColor: LGColor.accentAmber,
            status: .denied
        ),
        pageIndex: 3,
        totalPages: 5,
        onRequestPermission: { _ in },
        onOpenSettings: {},
        onSkipPermission: { _ in }
    )
    .padding(Spacing.s600)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}
