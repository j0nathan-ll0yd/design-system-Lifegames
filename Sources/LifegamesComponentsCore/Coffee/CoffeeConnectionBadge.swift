import LifegamesCopy
import LifegamesTokens
import SwiftUI

/// Renders a `ScaleConnection` state in one of three visual modes.
///
/// - `pill`: colored capsule with animated dot + text label (hero screen header)
/// - `headerDot`: minimal dot only, complementing `WidgetHeaderView`
/// - `ringState`: circular stroke border sized to caller's frame; dashed while searching
///
/// Reuses `LiveDotView(color:)` for the animated pulse. Purely presentational — no BLE types (GOVERNANCE P3).
public struct CoffeeConnectionBadge: View {
    public enum Mode {
        /// Full pill: animated dot + uppercased text label with background capsule.
        case pill
        /// Minimal live dot only; drop into a `WidgetHeaderView` HStack.
        case headerDot
        /// Circular ring border scaled to the caller's frame; dashed while `.searching`.
        case ringState
    }

    public let connection: CoffeeTrackingProps.ScaleConnection
    public let mode: Mode
    /// Shown in the pill and ring labels when `connection == .error`.
    public var errorMessage: String?

    public init(
        connection: CoffeeTrackingProps.ScaleConnection,
        mode: Mode = .pill,
        errorMessage: String? = nil
    ) {
        self.connection = connection
        self.mode = mode
        self.errorMessage = errorMessage
    }

    // MARK: - Derived helpers

    var connectionColor: Color {
        switch connection {
        case .unpaired: LGColor.textMuted
        case .searching: LGColor.accentAmber
        case .connected: LGColor.accentGreen
        case .error: LGColor.accentRed
        }
    }

    var statusLabel: String {
        switch connection {
        case .unpaired: CopyLoader.widgets.coffee.badgeConnect
        case .searching: CopyLoader.widgets.coffee.searching
        case .connected: CopyLoader.widgets.coffee.badgeConnected
        case .error: errorMessage ?? CopyLoader.widgets.coffee.badgeError
        }
    }

    // MARK: - Body

    public var body: some View {
        switch mode {
        case .pill: pillView
        case .headerDot: headerDotView
        case .ringState: ringStateView
        }
    }

    // MARK: - Pill

    private var pillView: some View {
        HStack(spacing: Spacing.s150) {
            LiveDotView(color: connectionColor)
            Text(statusLabel)
                .font(Font.Tokens.caption2())
                .fontWeight(.medium)
                .textCase(.uppercase)
                .kerning(1.5)
                .foregroundStyle(connectionColor)
        }
        .padding(.horizontal, Spacing.s300)
        .padding(.vertical, Spacing.s100)
        .background(connectionColor.opacity(0.12))
        .clipShape(Capsule())
        .overlay(Capsule().stroke(connectionColor.opacity(0.3), lineWidth: 1))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Scale connection: \(statusLabel)")
    }

    // MARK: - Header dot

    private var headerDotView: some View {
        LiveDotView(color: connectionColor)
            .accessibilityLabel("Scale connection: \(connection.rawValue)")
    }

    // MARK: - Ring state

    private var ringStateView: some View {
        Circle()
            .strokeBorder(
                connectionColor,
                style: connection == .searching
                    ? StrokeStyle(lineWidth: 4, dash: [8, 4])
                    : StrokeStyle(lineWidth: 4)
            )
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Scale connection: \(statusLabel)")
            .accessibilityAddTraits(.isStaticText)
    }
}

// MARK: - Previews

#if os(iOS)
    #Preview("Connection Badge — Pill") {
        VStack(spacing: Spacing.s400) {
            CoffeeConnectionBadge(connection: .connected, mode: .pill)
            CoffeeConnectionBadge(connection: .searching, mode: .pill)
            CoffeeConnectionBadge(connection: .unpaired, mode: .pill)
            CoffeeConnectionBadge(connection: .error, mode: .pill, errorMessage: "Lost connection to Pearl")
        }
        .padding(Spacing.s600)
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
    }

    #Preview("Connection Badge — Header Dot") {
        VStack(spacing: Spacing.s400) {
            HStack {
                WidgetHeaderView(label: "COFFEE", dotColor: LGColor.accentAmber)
                CoffeeConnectionBadge(connection: .connected, mode: .headerDot)
            }
            .padding(.horizontal, Spacing.s400)

            HStack {
                WidgetHeaderView(label: "COFFEE", dotColor: LGColor.accentAmber)
                CoffeeConnectionBadge(connection: .searching, mode: .headerDot)
            }
            .padding(.horizontal, Spacing.s400)
        }
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
    }

    #Preview("Connection Badge — Ring State") {
        HStack(spacing: Spacing.s600) {
            ForEach([
                CoffeeTrackingProps.ScaleConnection.connected,
                .searching,
                .unpaired,
                .error,
            ], id: \.rawValue) { state in
                CoffeeConnectionBadge(
                    connection: state,
                    mode: .ringState,
                    errorMessage: state == .error ? "Lost connection to Pearl" : nil
                )
                .frame(width: 64, height: 64)
            }
        }
        .padding(Spacing.s600)
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
    }
#endif
