import LifegamesComponentsWatch
import LifegamesTokens
import SwiftUI

public struct SyncStatusView: View {
    public let props: SyncStatusProps
    public var onPrimaryTap: () -> Void

    // SAFETY: Static formatter to avoid per-body allocation (S59). RelativeDateTimeFormatter
    // is documented thread-safe for read-only usage after configuration.
    private nonisolated(unsafe) static let relativeFormatter: RelativeDateTimeFormatter = {
        let f = RelativeDateTimeFormatter()
        f.unitsStyle = .abbreviated
        return f
    }()

    public init(props: SyncStatusProps, onPrimaryTap: @escaping () -> Void) {
        self.props = props
        self.onPrimaryTap = onPrimaryTap
    }

    public var body: some View {
        ScrollView {
            VStack(spacing: Spacing.s100) {
                heroSymbol
                statusPill
                relativeTimeLabel
                if let msg = props.errorMessage { errorLine(msg) }
                primaryButton
            }
            .padding(.horizontal, Spacing.s200)
            .padding(.bottom, Spacing.s100)
        }
        .background(LGColor.surfaceBase)
    }

    private var primaryButton: some View {
        Button(action: onPrimaryTap) {
            Text(props.primaryActionLabel)
                .font(Font.Tokens.code())
                .minimumScaleFactor(0.8)
                .lineLimit(1)
                .frame(maxWidth: .infinity)
        }
        .buttonStyle(.bordered)
        .controlSize(.small)
        .tint(tintForStatus(props.status))
        .disabled(props.status == .needsSetup)
        .accessibilityLabel(buttonAccessibilityLabel(for: props.status))
        .accessibilityHint(buttonAccessibilityHint(for: props.status))
    }

    // MARK: subviews

    @ViewBuilder
    private var heroSymbol: some View {
        let glowColor = symbolColor(for: props.status)
        let symbol = Image(systemName: symbolName(for: props.status))
            .font(.system(size: 36, weight: .bold))
            .symbolRenderingMode(.hierarchical)
            .foregroundStyle(glowColor)
            .neonGlow(glowColor, radius: 8)
            .accessibilityLabel("Sync status: \(statusLabel(for: props.status))")
            .accessibilityValue(accessibilityValueForLastSync(props.lastSyncDate, reference: props.referenceDate))

        #if os(watchOS) || os(iOS)
            symbol
                .contentTransition(.symbolEffect(.replace))
                .modifier(BreathingModifier(enabled: props.status == .syncing))
        #else
            symbol
                .modifier(BreathingModifier(enabled: props.status == .syncing))
        #endif
    }

    private var statusPill: some View {
        HStack(spacing: Spacing.s100) {
            Circle()
                .fill(symbolColor(for: props.status))
                .frame(width: 8, height: 8)
            Text(statusLabel(for: props.status))
                .font(Font.Tokens.subhead())
                .foregroundStyle(LGColor.textPrimary)
                .minimumScaleFactor(0.8)
                .lineLimit(1)
        }
        .padding(.horizontal, Spacing.s200)
        .padding(.vertical, Spacing.s100)
        .background(RoundedRectangle(cornerRadius: 12).fill(LGColor.surfaceRaised))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Status: \(statusLabel(for: props.status))")
    }

    private var relativeTimeLabel: some View {
        Text(relativeString(for: props.lastSyncDate, reference: props.referenceDate))
            .font(Font.Tokens.caption())
            .foregroundStyle(LGColor.textMuted)
            .accessibilityLabel("Last synced")
            .accessibilityValue(relativeString(for: props.lastSyncDate, reference: props.referenceDate))
    }

    private func errorLine(_ msg: String) -> some View {
        Text(msg)
            .font(Font.Tokens.caption2())
            .foregroundStyle(LGColor.accentRed)
            .multilineTextAlignment(.center)
            .accessibilityLabel("Error: \(msg)")
    }

    // MARK: helpers

    private func symbolName(for s: SyncStatusProps.Status) -> String {
        switch s {
        case .idle: return "arrow.triangle.2.circlepath"
        case .syncing: return "arrow.2.circlepath"
        case .syncedRecent: return "checkmark.circle.fill"
        case .needsSetup: return "exclamationmark.triangle.fill"
        case .authRequired: return "exclamationmark.triangle.fill"
        case .error: return "xmark.circle.fill"
        }
    }

    private func symbolColor(for s: SyncStatusProps.Status) -> Color {
        switch s {
        case .idle: return LGColor.accentPink
        case .syncing: return LGColor.accentBlue
        case .syncedRecent: return LGColor.healthGreen
        case .needsSetup: return LGColor.accentDefault
        case .authRequired: return LGColor.accentDefault
        case .error: return LGColor.accentRed
        }
    }

    private func tintForStatus(_ s: SyncStatusProps.Status) -> Color {
        switch s {
        case .needsSetup: return LGColor.accentDefault
        default: return LGColor.accentBlue
        }
    }

    private func statusLabel(for s: SyncStatusProps.Status) -> String {
        switch s {
        case .idle: return "READY"
        case .syncing: return "SYNCING…"
        case .syncedRecent: return "SYNCED"
        case .needsSetup: return "NEEDS SETUP"
        case .authRequired: return "AUTH REQUIRED"
        case .error: return "SYNC ERROR"
        }
    }

    private func relativeString(for date: Date?, reference: Date) -> String {
        guard let date else { return "Never synced" }
        return Self.relativeFormatter.localizedString(for: date, relativeTo: reference)
    }

    private func accessibilityValueForLastSync(_ date: Date?, reference: Date) -> String {
        relativeString(for: date, reference: reference)
    }

    private func buttonAccessibilityLabel(for s: SyncStatusProps.Status) -> String {
        switch s {
        case .needsSetup: return "Open iPhone to configure (button disabled)"
        case .authRequired: return "Authorize HealthKit"
        case .syncing: return "Sync in progress"
        default: return "Sync now"
        }
    }

    private func buttonAccessibilityHint(for s: SyncStatusProps.Status) -> String {
        switch s {
        case .needsSetup: return "Setup must be completed on the iPhone first"
        case .authRequired: return "Grants the watch access to HealthKit data"
        case .syncing: return ""
        default: return "Sends today's health data to the server"
        }
    }
}

/// AOD- and reduce-motion-safe breathing animation.
private struct BreathingModifier: ViewModifier {
    let enabled: Bool
    @Environment(\.isLuminanceReduced) private var isLuminanceReduced
    @State private var phase: Double = 1.0

    private var animate: Bool {
        enabled && !isLuminanceReduced
    }

    func body(content: Content) -> some View {
        content
            .opacity(phase)
            .onAppear(perform: applyAnimation)
            .modifier(AnimateChangeModifier(animate: animate, action: applyAnimation))
    }

    private func applyAnimation() {
        if animate {
            withAnimation(.linear(duration: 0)) { phase = 1.0 }
            withAnimation(
                ReducedMotion.animation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true))
            ) {
                phase = 0.6
            }
        } else {
            withAnimation(.linear(duration: 0)) { phase = 1.0 }
        }
    }
}

private struct AnimateChangeModifier: ViewModifier {
    let animate: Bool
    let action: () -> Void

    func body(content: Content) -> some View {
        if #available(macOS 14.0, iOS 17.0, watchOS 10.0, tvOS 17.0, *) {
            content.onChange(of: animate) { _, _ in action() }
        } else {
            content
        }
    }
}

#Preview("idle") { SyncStatusView(props: .previewIdle, onPrimaryTap: {}).preferredColorScheme(.dark) }
#Preview("syncing") { SyncStatusView(props: .previewSyncing, onPrimaryTap: {}).preferredColorScheme(.dark) }
#Preview("error") { SyncStatusView(props: .previewError, onPrimaryTap: {}).preferredColorScheme(.dark) }
