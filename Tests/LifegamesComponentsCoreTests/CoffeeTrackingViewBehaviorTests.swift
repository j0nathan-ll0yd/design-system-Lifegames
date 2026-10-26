import LifegamesCopy
import SwiftUI
import Testing
import ViewInspector
@testable import LifegamesComponentsCore

/// Behavioral (non-screenshot) assertions for `CoffeeTrackingView`'s primary action, the
/// secondary reconnect affordance, the "Sipping…" caption and the steam cue, over every
/// connection × isSessionActive × isCupOnScale state, with and without `onReconnect`.
@Suite("CoffeeTrackingView — behavioral")
@MainActor
struct CoffeeTrackingViewBehaviorTests {
    nonisolated private static let connections: [CoffeeTrackingProps.ScaleConnection] = [
        .unpaired, .searching, .connected, .error,
    ]

    private static func props(
        _ connection: CoffeeTrackingProps.ScaleConnection, session: Bool, onScale: Bool
    ) -> CoffeeTrackingProps {
        CoffeeTrackingProps(
            connection: connection,
            isSessionActive: session,
            isCupOnScale: onScale,
            // Active: 50% consumed, steam-eligible. Idle: no cup weighed yet.
            startWeightGrams: session ? 300 : 0,
            lastStableWeightGrams: session ? 150 : 0
        )
    }

    /// Independent restatement of the expected primary title per state.
    private static func expectedTitle(
        _ connection: CoffeeTrackingProps.ScaleConnection, session: Bool
    ) -> String {
        let copy = CopyLoader.widgets.coffee
        if session { return copy.actionFinishCup }
        switch connection {
        case .unpaired: return copy.actionConnect
        case .searching: return copy.searching
        case .connected: return copy.actionNewCup
        case .error: return copy.actionReconnect
        }
    }

    private static func expectedA11y(
        _ connection: CoffeeTrackingProps.ScaleConnection, session: Bool
    ) -> String {
        let copy = CopyLoader.a11y.coffee
        if session { return copy.actionFinishCup }
        switch connection {
        case .unpaired: return copy.actionConnect
        case .searching: return copy.actionSearching
        case .connected: return copy.actionNewCup
        case .error: return copy.actionReconnect
        }
    }

    // MARK: - Primary button and reconnect affordance, full matrix

    @Test(arguments: connections, [false, true])
    func primaryButtonAndReconnectAffordance(
        connection: CoffeeTrackingProps.ScaleConnection, session: Bool
    ) throws {
        for onScale in [false, true] {
            for withReconnect in [false, true] {
                let view = CoffeeTrackingView(
                    props: Self.props(connection, session: session, onScale: onScale),
                    animated: false,
                    onReconnect: withReconnect ? {} : nil
                )
                let buttons = try view.inspect().findAll(ViewType.Button.self)
                let expectsReconnect = withReconnect && session
                    && (connection == .error || connection == .unpaired)
                #expect(view.showsReconnectAffordance == expectsReconnect)
                #expect(buttons.count == (expectsReconnect ? 2 : 1))

                // The primary button is always first and never yields to the retry.
                let primary = try #require(buttons.first)
                #expect(try primary.labelView().find(ViewType.Text.self).string()
                    == Self.expectedTitle(connection, session: session))
                #expect(try primary.accessibilityLabel().string()
                    == Self.expectedA11y(connection, session: session))
                #expect(try primary.isDisabled() == (connection == .searching && !session))
                // Only Finish Cup carries a symbol; "+ New Cup" already has its "+" in copy.
                let symbols = try primary.labelView().findAll(ViewType.Image.self)
                    .map { try $0.actualImage().name() }
                #expect(symbols == (session ? ["checkmark"] : []))

                if expectsReconnect {
                    let retry = buttons[1]
                    #expect(try retry.labelView().find(ViewType.Text.self).string()
                        == CopyLoader.widgets.coffee.actionReconnect)
                    #expect(try retry.accessibilityLabel().string()
                        == CopyLoader.a11y.coffee.actionReconnect)
                    #expect(try retry.isDisabled() == false)
                }
            }
        }
    }

    // MARK: - Taps route to the right callback

    @Test(arguments: connections)
    func finishCupTapFiresPrimaryInEveryConnectionState(
        connection: CoffeeTrackingProps.ScaleConnection
    ) throws {
        var primaryTaps = 0
        var reconnectTaps = 0
        let view = CoffeeTrackingView(
            props: Self.props(connection, session: true, onScale: false),
            animated: false,
            onPrimaryAction: { primaryTaps += 1 },
            onReconnect: { reconnectTaps += 1 }
        )
        let buttons = try view.inspect().findAll(ViewType.Button.self)
        let expectsRetry = connection == .error || connection == .unpaired
        #expect(buttons.count == (expectsRetry ? 2 : 1))
        try #require(buttons.first).tap()
        #expect(primaryTaps == 1)
        #expect(reconnectTaps == 0)
        if expectsRetry {
            try buttons[1].tap()
            #expect(primaryTaps == 1)
            #expect(reconnectTaps == 1)
        }
    }

    @Test func unlabeledTrailingClosureBindsToPrimaryAction() throws {
        // The consumer writes `CoffeeTrackingView(props:) { … }`. Adding the optional
        // `onReconnect` last must not capture that closure (Swift 6 forward scan).
        var tapped = false
        let view = CoffeeTrackingView(props: Self.props(.error, session: true, onScale: false)) {
            tapped = true
        }
        #expect(view.onReconnect == nil)
        try #require(view.inspect().findAll(ViewType.Button.self).first).tap()
        #expect(tapped)
    }

    // MARK: - "Sipping…" caption and steam follow honest presence

    @Test(arguments: connections, [false, true])
    func sippingCaptionAndSteamFollowPresence(
        connection: CoffeeTrackingProps.ScaleConnection, session: Bool
    ) throws {
        for onScale in [false, true] {
            let props = Self.props(connection, session: session, onScale: onScale)
            let view = CoffeeTrackingView(props: props, animated: false)
            let sipping = CopyLoader.widgets.coffee.sipping
            let hasCaption = (try? view.inspect().find(text: sipping)) != nil
            let lifted = session && connection == .connected && !onScale
            #expect(hasCaption == lifted)
            // Steam only while a live link vouches for a resting, partly drunk cup (OQ-V4).
            let steam = session && connection == .connected && onScale
            #expect(view.isSteamActive == steam)
            // The risers actually receive that value, not a stale inline expression.
            #expect(try view.inspect().find(HeroSteamRisers.self).actualView().active == steam)
        }
    }
}
