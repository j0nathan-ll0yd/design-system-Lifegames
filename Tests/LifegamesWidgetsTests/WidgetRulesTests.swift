import Foundation
import LifegamesComponents
import LifegamesCopy
import SwiftUI
import Testing
import ViewInspector
@testable import LifegamesWidgets

// covers: widget-contract#A Swift widget state rule returns the web rule's state for the same input
/// The Swift twin of the web `heartRateState` (atlas decision 0160) returns the web state for the
/// same input. The known answers live in `contracts/widget-rules/heart-rate-state.known-answers.json`,
/// which `contracts/widget-rules/heart-rate-state.test.ts` also runs through the web rule itself, so a
/// change on either side that the file does not reflect fails one of the two suites.
@Suite("WidgetRules — the Swift twin of the web heartRateState")
struct WidgetRulesTests {
    struct KnownAnswer: CustomTestStringConvertible, Sendable {
        let name: String
        /// The web props as JSON text, re-serialized from the file's `props`.
        let json: Data
        let expected: WidgetRenderState?
        let expectedRaw: String

        var testDescription: String { name }

        var props: [String: Any] {
            (try? JSONSerialization.jsonObject(with: json)) as? [String: Any] ?? [:]
        }
    }

    static let knownAnswersURL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .appendingPathComponent("contracts/widget-rules/heart-rate-state.known-answers.json")

    static func document() -> [String: Any] {
        guard
            let data = try? Data(contentsOf: knownAnswersURL),
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return [:] }
        return json
    }

    static let knownAnswers: [KnownAnswer] = (document()["cases"] as? [[String: Any]] ?? []).map {
        let raw = $0["expected"] as? String ?? ""
        return KnownAnswer(
            name: $0["name"] as? String ?? "",
            json: (try? JSONSerialization.data(withJSONObject: $0["props"] ?? [String: Any]())) ?? Data(),
            expected: WidgetRenderState(rawValue: raw),
            expectedRaw: raw
        )
    }

    static let fixtureAnswers: [String: String] = document()["fixtures"] as? [String: String] ?? [:]

    /// The file loads and every expected state is a state the Swift enum names.
    @Test func theKnownAnswersLoad() {
        #expect(Self.knownAnswers.count >= 30, "missing or unreadable \(Self.knownAnswersURL.path)")
        #expect(Self.fixtureAnswers.count >= 16)
        for answer in Self.knownAnswers {
            #expect(answer.expected != nil, "\(answer.name): unknown state \(answer.expectedRaw)")
        }
    }

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

    @Test func everyHeartRateFixtureMatchesTheWebRule() throws {
        for (slug, expected) in Self.fixtureAnswers {
            let data = try #require(WidgetFixtures.data(category: "health", name: slug), "missing fixture \(slug)")
            let props = try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])
            #expect(WidgetRules.heartRateState(props: props).rawValue == expected, "\(slug)")
        }
    }

    /// A new `heart-rate.*` fixture must join the known answers, so no shared fixture goes unpinned.
    @Test func everyHeartRateFixtureIsListed() throws {
        let base = try #require(WidgetFixtures.url(category: "health", name: "heart-rate"))
        let names = try FileManager.default.contentsOfDirectory(atPath: base.deletingLastPathComponent().path)
        let onDisk = Set(names.filter { $0 == "heart-rate.json" || ($0.hasPrefix("heart-rate.") && $0.hasSuffix(".json")) }
            .map { String($0.dropLast(".json".count)) })
        #expect(onDisk == Set(Self.fixtureAnswers.keys))
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
