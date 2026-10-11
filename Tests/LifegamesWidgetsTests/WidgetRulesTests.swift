import Foundation
import LifegamesComponents
import LifegamesCopy
import SwiftUI
import Testing
import ViewInspector
@testable import LifegamesWidgets

// covers: widget-contract#A Swift widget state rule returns the web rule's state for the same input
/// The Swift twin of the web `heartRateState` (atlas decision 0160) returns the web state for the
/// same input. Every expected state below is the web rule's own output, produced by running
/// `heartRateState` from `packages/web/src/runtime/widget-rules.ts` over these exact JSON props.
/// The four marked `web test` are also the web suite's own known answers.
@Suite("WidgetRules — the Swift twin of the web heartRateState")
struct WidgetRulesTests {
    struct KnownAnswer: CustomTestStringConvertible, Sendable {
        let name: String
        let json: String
        let expected: WidgetRenderState

        init(_ name: String, _ json: String, _ expected: WidgetRenderState) {
            self.name = name
            self.json = json
            self.expected = expected
        }

        var testDescription: String { name }

        var props: [String: Any] {
            (try? JSONSerialization.jsonObject(with: Data(json.utf8))) as? [String: Any] ?? [:]
        }
    }

    // web test: states.test.ts "a readable export with no quantity at all is empty" ("empty quantities"),
    // the M2c table ("hr 0 and hrv 0", "hrv only") and updaters-honest-states.test.ts ("empty quantities").
    static let knownAnswers: [KnownAnswer] = [
        KnownAnswer("no health", #"{}"#, .empty),
        KnownAnswer("empty quantities", #"{"health":{"quantities":{}}}"#, .empty),
        KnownAnswer("health without quantities", #"{"health":{}}"#, .empty),
        KnownAnswer("hr 0 and hrv 0", #"{"health":{"quantities":{"heartRate":{"value":0,"unit":"count/min"},"hrvSDNN":{"value":0,"unit":"ms"}}}}"#, .empty),
        KnownAnswer("hrv only", #"{"health":{"quantities":{"hrvSDNN":{"value":40,"unit":"ms"}}}}"#, .unavailable),
        KnownAnswer("steps only", #"{"health":{"quantities":{"stepCount":{"value":5000,"unit":"count"}}}}"#, .unavailable),
        KnownAnswer("hr 62 hrv 48", #"{"health":{"quantities":{"heartRate":{"value":62,"unit":"count/min"},"hrvSDNN":{"value":48,"unit":"ms"}}}}"#, .live),
        KnownAnswer("hr 62 only", #"{"health":{"quantities":{"heartRate":{"value":62,"unit":"count/min"}}}}"#, .live),
        KnownAnswer("hr 62 hrv 0", #"{"health":{"quantities":{"heartRate":{"value":62,"unit":"count/min"},"hrvSDNN":{"value":0,"unit":"ms"}}}}"#, .live),
        KnownAnswer("hr 0 hrv 40", #"{"health":{"quantities":{"heartRate":{"value":0,"unit":"count/min"},"hrvSDNN":{"value":40,"unit":"ms"}}}}"#, .live),
        KnownAnswer("hr 0 only", #"{"health":{"quantities":{"heartRate":{"value":0,"unit":"count/min"}}}}"#, .empty),
        KnownAnswer("hr 0 and steps", #"{"health":{"quantities":{"heartRate":{"value":0,"unit":"count/min"},"stepCount":{"value":10,"unit":"count"}}}}"#, .empty),
        KnownAnswer("hr 0.4 hrv 0", #"{"health":{"quantities":{"heartRate":{"value":0.4,"unit":"count/min"},"hrvSDNN":{"value":0,"unit":"ms"}}}}"#, .live),
        KnownAnswer("hr null", #"{"health":{"quantities":{"heartRate":null}}}"#, .unavailable),
        KnownAnswer("hr value null", #"{"health":{"quantities":{"heartRate":{"value":null}}}}"#, .unavailable),
        KnownAnswer("hr value string", #"{"health":{"quantities":{"heartRate":{"value":"62"}}}}"#, .unavailable),
        KnownAnswer("hr value boolean", #"{"health":{"quantities":{"heartRate":{"value":true}}}}"#, .unavailable),
        KnownAnswer("paused, hrv only", #"{"health":{"quantities":{"hrvSDNN":{"value":40,"unit":"ms"}},"watch":{"worn":false,"since":null,"source":"hrGap"}}}"#, .live),
        KnownAnswer("paused, no quantities", #"{"health":{"quantities":{},"watch":{"worn":false}}}"#, .live),
        KnownAnswer("paused, hr 0 hrv 0", #"{"health":{"quantities":{"heartRate":{"value":0},"hrvSDNN":{"value":0}},"watch":{"worn":false}}}"#, .live),
        KnownAnswer("worn true, hrv only", #"{"health":{"quantities":{"hrvSDNN":{"value":40}},"watch":{"worn":true}}}"#, .unavailable),
        KnownAnswer("worn 0, hrv only", #"{"health":{"quantities":{"hrvSDNN":{"value":40}},"watch":{"worn":0}}}"#, .unavailable),
        KnownAnswer("worn null, empty", #"{"health":{"quantities":{},"watch":{"worn":null}}}"#, .empty),
        KnownAnswer("live, hr 62", #"{"state":"live","health":{"quantities":{"heartRate":{"value":62}}}}"#, .live),
        KnownAnswer("stale, hr 62", #"{"state":"stale","health":{"quantities":{"heartRate":{"value":62}}}}"#, .stale),
        KnownAnswer("stale, hrv only", #"{"state":"stale","health":{"quantities":{"hrvSDNN":{"value":40}}}}"#, .unavailable),
        KnownAnswer("stale, no health", #"{"state":"stale"}"#, .empty),
        KnownAnswer("stale, paused, no quantities", #"{"state":"stale","health":{"quantities":{},"watch":{"worn":false}}}"#, .stale),
        KnownAnswer("live, no health", #"{"state":"live"}"#, .empty),
        KnownAnswer("empty, hr 62", #"{"state":"empty","health":{"quantities":{"heartRate":{"value":62}}}}"#, .empty),
        KnownAnswer("unavailable, hr 62", #"{"state":"unavailable","health":{"quantities":{"heartRate":{"value":62}}}}"#, .unavailable),
        KnownAnswer("suppressed, hr 62", #"{"state":"suppressed","health":{"quantities":{"heartRate":{"value":62}}}}"#, .suppressed),
        KnownAnswer("loading, no health", #"{"state":"loading"}"#, .loading),
        KnownAnswer("suppressed, no health", #"{"state":"suppressed"}"#, .suppressed),
    ]

    @Test(arguments: knownAnswers)
    func jsonPropsMatchTheWebRule(_ answer: KnownAnswer) {
        #expect(WidgetRules.heartRateState(props: answer.props) == answer.expected)
    }

    /// The typed entry point iOS uses reaches the same state as the JSON entry point.
    @Test(arguments: knownAnswers)
    func typedInputMatchesTheJSONRoute(_ answer: KnownAnswer) {
        let input = WidgetRules.heartRateInput(props: answer.props)
        #expect(WidgetRules.heartRateState(input) == answer.expected)
    }

    /// Every shared `heart-rate.*` fixture: the web rule's state for the same file.
    static let fixtureAnswers: [(String, WidgetRenderState)] = [
        ("heart-rate.bradycardia", .live),
        ("heart-rate.cardio", .live),
        ("heart-rate.empty", .empty),
        ("heart-rate.fat-burn", .live),
        ("heart-rate", .live),
        ("heart-rate.max", .live),
        ("heart-rate.normal", .live),
        ("heart-rate.paused-charging", .live),
        ("heart-rate.paused", .live),
        ("heart-rate.peak", .live),
        ("heart-rate.populated-max", .live),
        ("heart-rate.populated-min", .live),
        ("heart-rate.resting", .live),
        ("heart-rate.skeleton", .empty),
        ("heart-rate.suppressed", .suppressed),
        ("heart-rate.unavailable", .unavailable),
    ]

    @Test func everyHeartRateFixtureMatchesTheWebRule() throws {
        for (slug, expected) in Self.fixtureAnswers {
            let data = try #require(WidgetFixtures.data(category: "health", name: slug), "missing fixture \(slug)")
            let props = try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])
            #expect(WidgetRules.heartRateState(props: props) == expected, "\(slug)")
        }
    }

    /// A new `heart-rate.*` fixture must join the table, so no shared fixture goes unpinned.
    @Test func everyHeartRateFixtureIsListed() throws {
        let base = try #require(WidgetFixtures.url(category: "health", name: "heart-rate"))
        let names = try FileManager.default.contentsOfDirectory(atPath: base.deletingLastPathComponent().path)
        let onDisk = Set(names.filter { $0 == "heart-rate.json" || ($0.hasPrefix("heart-rate.") && $0.hasSuffix(".json")) }
            .map { String($0.dropLast(".json".count)) })
        #expect(onDisk == Set(Self.fixtureAnswers.map(\.0)))
    }

    // MARK: - The compatibility mapper (web resolveWidgetState)

    @Test func resolveMatchesTheWebCompatibilityMapper() {
        // An explicit non-data state always wins.
        for state in [WidgetRenderState.empty, .unavailable, .suppressed, .loading] {
            #expect(WidgetRenderState.resolve(state, hasData: true) == state)
            #expect(WidgetRenderState.resolve(state, hasData: false) == state)
        }
        // A data state without data degrades to empty; with data it stays.
        #expect(WidgetRenderState.resolve(.live, hasData: false) == .empty)
        #expect(WidgetRenderState.resolve(.stale, hasData: false) == .empty)
        #expect(WidgetRenderState.resolve(.stale, hasData: true) == .stale)
        // No explicit state: data present is live, otherwise empty.
        #expect(WidgetRenderState.resolve(nil, hasData: true) == .live)
        #expect(WidgetRenderState.resolve(nil, hasData: false) == .empty)
    }

    @Test func rawValuesAreTheWebStrings() {
        #expect(WidgetRenderState.allCases.map(\.rawValue) == ["live", "stale", "empty", "unavailable", "suppressed", "loading"])
        #expect(WidgetRenderState.allCases.filter(\.rendersData) == [.live, .stale])
    }

    @Test func onlyADataStateBuildsProps() {
        var built = 0
        let props = { () -> Int in
            built += 1
            return 7
        }
        for state in WidgetRenderState.allCases {
            switch state.widgetState(props) {
            case let .populated(value): #expect(state.rendersData && value == 7)
            case .empty: #expect(state == .empty)
            case .unavailable: #expect(state == .unavailable)
            case .suppressed: #expect(state == .suppressed)
            case .loading: #expect(state == .loading)
            }
        }
        #expect(built == 2)
    }
}

/// The view each rule state renders: behavioural assertions on the HeartRate card.
@Suite("HeartRateView renders the rule's state")
@MainActor
struct HeartRateRuleStateViewTests {
    private func state(_ input: HeartRateStateInput) -> WidgetState<HeartRateProps> {
        WidgetRules.heartRateState(input).widgetState { HeartRateProps(bpm: nil, hrv: 40, zone: "") }
    }

    @Test func missingHeartRateWithOtherReadingsRendersTheUnavailableNotice() throws {
        let view = HeartRateView(state: state(.init(health: .init(heartRate: nil, hrv: 40, quantityCount: 1))))
        let text = try renderedText(view)
        #expect(text.contains(CopyLoader.widgets.widgetState.unavailable))
        // No values and no marks: a non-data state renders chrome and a notice only.
        #expect(!text.contains("40"))
        #expect(!text.contains(NoReading.mark))
        #expect(!text.contains(CopyLoader.widgets.heartRate.empty))
    }

    @Test func nothingMeasuredRendersTheEmptyCopy() throws {
        let view = HeartRateView(state: state(.init(health: .init(heartRate: nil, hrv: nil, quantityCount: 0))))
        let text = try renderedText(view)
        #expect(text.contains(CopyLoader.widgets.heartRate.empty))
        #expect(!text.contains(NoReading.mark))
        #expect(!text.contains(CopyLoader.widgets.widgetState.unavailable))
    }

    @Test func aReadingRendersTheValue() throws {
        let input = HeartRateStateInput(health: .init(heartRate: 72, hrv: 35, quantityCount: 2))
        let view = HeartRateView(state: WidgetRules.heartRateState(input).widgetState { HeartRateProps(bpm: 72, hrv: 35, zone: "") })
        let text = try renderedText(view)
        #expect(text.contains("72"))
        #expect(text.contains("35"))
        #expect(!text.contains(CopyLoader.widgets.widgetState.unavailable))
    }

    @Test func aPausedWatchKeepsTheDataStateAndRendersThePausedCard() throws {
        let input = HeartRateStateInput(health: .init(heartRate: nil, hrv: nil, quantityCount: 0, watchPaused: true))
        #expect(WidgetRules.heartRateState(input) == .live)
        let props = HeartRateProps(bpm: nil, hrv: nil, zone: "", watchPaused: true)
        let view = HeartRateView(state: WidgetRules.heartRateState(input).widgetState { props })
        let label = try view.inspect().find(ViewType.VStack.self).accessibilityLabel().string()
        #expect(label.contains(CopyLoader.widgets.heartRate.paused.label))
    }
}
