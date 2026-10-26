import Foundation
import Testing
@testable import LifegamesComponentsCore

@Suite("CoffeeTrackingProps")
@MainActor
struct CoffeeTrackingPropsTests {

    // MARK: - ÷0 guard

    @Test func fillPercentIsZeroWhenStartWeightIsZero() {
        let props = CoffeeTrackingProps(startWeightGrams: 0, lastStableWeightGrams: 0)
        #expect(props.fillPercent == 0)
    }

    @Test func fillPercentIsZeroWhenStartWeightIsZeroAndLastStableIsPositive() {
        // lastStable > startWeight with startWeight == 0 → still 0, not NaN
        let props = CoffeeTrackingProps(startWeightGrams: 0, lastStableWeightGrams: 50)
        #expect(props.fillPercent == 0)
    }

    // MARK: - Fill rises as lastStableWeightGrams falls

    @Test func fillPercentRisesAsLastStableWeightFalls() {
        let start = 300.0
        var props = CoffeeTrackingProps(
            isSessionActive: true, isCupOnScale: true,
            startWeightGrams: start, lastStableWeightGrams: start
        )
        // No sips yet — meter at 0
        #expect(props.fillPercent == 0)

        // Sip 1: 75 g consumed → 25%  (75/300 = 0.25, exactly representable)
        props.lastStableWeightGrams = 225
        #expect(props.fillPercent == 0.25)

        // Sip 2: 150 g total → 50%  (150/300 = 0.5, exactly representable)
        props.lastStableWeightGrams = 150
        #expect(props.fillPercent == 0.5)

        // Sip 3: 225 g total → 75%  (225/300 = 0.75, exactly representable)
        props.lastStableWeightGrams = 75
        #expect(props.fillPercent == 0.75)
    }

    // MARK: - Clamp to [0, 1]

    @Test func fillPercentClampsToOneWhenFullyConsumed() {
        // lastStable == 0, start == 300 → consumed == 300 → fillPercent == 1.0
        let props = CoffeeTrackingProps(startWeightGrams: 300, lastStableWeightGrams: 0)
        #expect(props.fillPercent == 1.0)
    }

    @Test func fillPercentClampsToOneWhenOverconsumed() {
        // lastStable goes below 0 (degenerate upstream) → clamped to 1.0
        let props = CoffeeTrackingProps(startWeightGrams: 300, lastStableWeightGrams: -50)
        #expect(props.fillPercent == 1.0)
    }

    @Test func fillPercentIsZeroWhenLastStableExceedsStart() {
        // lastStable > start → consumedGrams is negative (clamped to 0) → fillPercent == 0
        let props = CoffeeTrackingProps(startWeightGrams: 200, lastStableWeightGrams: 250)
        #expect(props.consumedGrams == 0)
        #expect(props.fillPercent == 0)
    }

    // MARK: - Caffeine math per beverage

    @Test func caffeineDrip() {
        // 100 g × 0.40 mg/g = 40 mg
        let props = CoffeeTrackingProps(
            startWeightGrams: 300, lastStableWeightGrams: 200, beverage: .drip
        )
        #expect(props.consumedGrams == 100)
        #expect(props.caffeineMgThisCup == 40)
    }

    @Test func caffeineEspresso() {
        // 50 g × 2.1 mg/g = 105 mg
        let props = CoffeeTrackingProps(
            startWeightGrams: 300, lastStableWeightGrams: 250, beverage: .espresso
        )
        #expect(props.consumedGrams == 50)
        #expect(props.caffeineMgThisCup == 105)
    }

    @Test func caffeineColdBrew() {
        // 120 g × 2.0 mg/g = 240 mg
        let props = CoffeeTrackingProps(
            startWeightGrams: 300, lastStableWeightGrams: 180, beverage: .coldBrew
        )
        #expect(props.consumedGrams == 120)
        #expect(props.caffeineMgThisCup == 240)
    }

    // MARK: - Link-lost mid-session derivations

    @Test func linkLostMidSessionIsSippingFalse() {
        let props = CoffeeTrackingProps(
            connection: .error, isSessionActive: true, isCupOnScale: false
        )
        #expect(props.isLinkLostMidSession == true)
        #expect(props.isSipping == false)
    }

    @Test func connectedLiftedMidSessionIsSippingTrue() {
        let props = CoffeeTrackingProps(
            connection: .connected, isSessionActive: true, isCupOnScale: false
        )
        #expect(props.isLinkLostMidSession == false)
        #expect(props.isSipping == true)
    }

    @Test func errorWithNoActiveSessionIsNeitherLinkLostNorSipping() {
        let props = CoffeeTrackingProps(
            connection: .error, isSessionActive: false
        )
        #expect(props.isLinkLostMidSession == false)
        #expect(props.isSipping == false)
    }

    // MARK: - Presence is unknown whenever a tracked cup has no live link

    @Test func searchingMidSessionIsPresenceUnknownNotSipping() {
        // The consumer forces isCupOnScale = false on every disconnect. A mug resting on the
        // scale must not read "Sipping…" while the link comes back.
        let props = CoffeeTrackingProps(
            connection: .searching, isSessionActive: true, isCupOnScale: false
        )
        #expect(props.isPresenceUnknown == true)
        #expect(props.isLinkLostMidSession == false) // unchanged: .error only
        #expect(props.isSipping == false)
    }

    // MARK: - Full matrix: connection × isSessionActive × isCupOnScale

    nonisolated private static let connections: [CoffeeTrackingProps.ScaleConnection] = [
        .unpaired, .searching, .connected, .error,
    ]

    /// Independent restatement of the rule, written as a table rather than derived from the
    /// implementation's shape.
    private static func expectedAction(
        _ connection: CoffeeTrackingProps.ScaleConnection, session: Bool
    ) -> CoffeeTrackingProps.PrimaryAction {
        guard !session else { return .finishCup }
        switch connection {
        case .unpaired: return .connect
        case .searching: return .searching
        case .connected: return .newCup
        case .error: return .reconnect
        }
    }

    @Test(arguments: connections, [false, true])
    func primaryActionAndPresenceForEveryState(
        connection: CoffeeTrackingProps.ScaleConnection, session: Bool
    ) {
        for onScale in [false, true] {
            let props = CoffeeTrackingProps(
                connection: connection, isSessionActive: session, isCupOnScale: onScale
            )
            #expect(props.primaryAction == Self.expectedAction(connection, session: session))
            // A tracked cup can always be finished; finishing never needs the scale.
            if session {
                #expect(props.primaryAction == .finishCup)
                #expect(props.primaryAction.isEnabled)
            }
            // Only the idle searching state disables the button.
            #expect(props.primaryAction.isEnabled == !(connection == .searching && !session))

            #expect(props.isPresenceUnknown == (session && connection != .connected))
            #expect(props.isLinkLostMidSession == (session && connection == .error))
            // Only a live link can report a lift.
            #expect(props.isSipping == (session && connection == .connected && !onScale))
        }
    }

    @Test func primaryActionIsNotEncoded() throws {
        // Derived members are computed, so the wire shape is unchanged.
        let props = CoffeeTrackingProps(connection: .searching, isSessionActive: true)
        let json = try JSONSerialization.jsonObject(with: JSONEncoder().encode(props)) as? [String: Any]
        let keys = try #require(json).keys
        #expect(!keys.contains("primaryAction"))
        #expect(!keys.contains("isPresenceUnknown"))
        #expect(!keys.contains("isSipping"))
    }

    @Test func primaryActionRawValuesAreStable() {
        // The consumer may log or persist the raw value; pin it.
        #expect(CoffeeTrackingProps.PrimaryAction.connect.rawValue == "connect")
        #expect(CoffeeTrackingProps.PrimaryAction.reconnect.rawValue == "reconnect")
        #expect(CoffeeTrackingProps.PrimaryAction.searching.rawValue == "searching")
        #expect(CoffeeTrackingProps.PrimaryAction.newCup.rawValue == "newCup")
        #expect(CoffeeTrackingProps.PrimaryAction.finishCup.rawValue == "finishCup")
    }
}
