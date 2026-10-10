import Foundation
import LifegamesComponents
import LifegamesCopy
import SwiftUI
import Testing
@testable import LifegamesWidgets

// Atlas decision 0160 Phase 1: every live widget renders `unavailable` and `suppressed`.
// Fixtures carry only `{"state": ...}`; no data envelope, so no value can render.
@Suite("Honest widget states — unavailable and suppressed")
struct HonestWidgetStateTests {
    private struct Case {
        let category: String
        let slug: String
        /// Maps the fixture to a state and builds the view, returning the mapped case name.
        let mapped: (Data) -> String?
        /// Builds the view for the given state name; returns false if the view cannot be built.
        let render: (String) -> Bool
    }

    private static func name<T>(_ state: WidgetState<T>?) -> String? {
        switch state {
        case .none: nil
        case .some(.loading): "loading"
        case .some(.empty): "empty"
        case .some(.populated): "populated"
        case .some(.unavailable): "unavailable"
        case .some(.suppressed): "suppressed"
        }
    }

    @MainActor
    private static func renders(_ view: some View) -> Bool {
        ImageRenderer(content: view.frame(width: 360).padding()).cgImage != nil
    }

    @MainActor
    private static func cases() -> [Case] {
        func make<T>(
            _ category: String, _ slug: String, _: T.Type,
            view: @escaping @MainActor (WidgetState<T>) -> some View
        ) -> Case {
            Case(
                category: category,
                slug: slug,
                mapped: { name(Adapters.honestState(fromFixture: $0) as WidgetState<T>?) },
                render: { stateName in
                    MainActor.assumeIsolated {
                        let state: WidgetState<T> = stateName == "unavailable" ? .unavailable : .suppressed
                        return renders(view(state))
                    }
                }
            )
        }
        return [
            make("health", "heart-rate", HeartRateProps.self) { HeartRateView(state: $0) },
            make("health", "movement-rings", MovementRingsProps.self) { MovementRingsView(state: $0) },
            make("health", "hydration", HydrationProps.self) { HydrationView(state: $0) },
            make("health", "night-summary", NightSummaryProps.self) { NightSummaryView(state: $0) },
            make("health", "workouts", WorkoutsProps.self) { WorkoutsView(state: $0) },
            make("github", "dev-activity-log", DevActivityProps.self) { DevActivityLogView(state: $0) },
            make("github", "starred-repo-list", StarredRepoListProps.self) { StarredRepoListView(state: $0) },
            make("reading", "reading-feed", ReadingFeedProps.self) { ReadingFeedView(state: $0) },
            make("reading", "bookshelf", BookshelfProps.self) { BookshelfView(state: $0) },
            make("reading", "theatre-reviews", TheatreReviewsProps.self) { TheatreReviewsView(state: $0) },
        ]
    }

    @MainActor
    @Test func tenWidgetsCovered() {
        #expect(Self.cases().count == 10)
    }

    @MainActor
    @Test func everyFixtureLoadsAndMapsToItsState() throws {
        for item in Self.cases() {
            for stateName in ["unavailable", "suppressed"] {
                let fixture = "\(item.slug).\(stateName)"
                let data = try #require(
                    WidgetFixtures.data(category: item.category, name: fixture),
                    "Missing fixture \(item.category)/\(fixture).json"
                )
                #expect(item.mapped(data) == stateName, "\(fixture) maps to the wrong WidgetState")
            }
        }
    }

    @MainActor
    @Test func fixturesCarryNoDataEnvelope() throws {
        for item in Self.cases() {
            for stateName in ["unavailable", "suppressed"] {
                let data = try #require(WidgetFixtures.data(category: item.category, name: "\(item.slug).\(stateName)"))
                let json = try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])
                #expect(Array(json.keys) == ["state"], "\(item.slug).\(stateName) must hold only `state`")
            }
        }
    }

    @MainActor
    @Test func everyViewBuildsInBothStates() {
        for item in Self.cases() {
            for stateName in ["unavailable", "suppressed"] {
                #expect(item.render(stateName), "\(item.slug) failed to render \(stateName)")
            }
        }
    }

    @Test func dataFixturesAreNotHonestStates() throws {
        let data = try #require(WidgetFixtures.data(category: "health", name: "heart-rate"))
        let state: WidgetState<HeartRateProps>? = Adapters.honestState(fromFixture: data)
        #expect(state == nil)
        #expect(Adapters.honestState(fromFixture: Data("not json".utf8)) as WidgetState<HeartRateProps>? == nil)
    }

    /// P2 parity: the notices read the same `widgets.widgetState` copy keys the web reads
    /// (packages/copy/src/widgets.en-US.json); no platform holds its own string.
    @Test func noticeCopyComesFromTheSharedCopyKeys() {
        let copy = CopyLoader.widgets.widgetState
        #expect(WidgetStateNotice.unavailable.text == copy.unavailable)
        #expect(WidgetStateNotice.suppressed.text == copy.suppressed)
        #expect(!copy.unavailable.isEmpty && !copy.suppressed.isEmpty && !copy.noReading.isEmpty)
    }
}

/// Hydration's empty state renders the no-reading mark, never "0 oz" (atlas decision 0160,
/// P2 parity with the web Hydration empty state).
@Suite struct HydrationEmptyValueTests {
    @Test func measuredValuesKeepTheirUnit() {
        #expect(HydrationPopulatedView.valueText(54, unit: "oz", measured: true) == "54 oz")
        #expect(HydrationPopulatedView.valueText(0, unit: "mg", measured: true) == "0 mg")
    }

    @Test func unmeasuredValuesRenderTheNoReadingMark() {
        #expect(HydrationPopulatedView.valueText(0, unit: "oz", measured: false) == "\u{2014}")
        #expect(HydrationPopulatedView.valueText(0, unit: "mg", measured: false) == NoReading.mark)
    }
}

/// The no-reading mark is labelled for VoiceOver with the shared copy key
/// (`widgets.widgetState.noReading`), never read as "dash" (atlas decision 0160).
@Suite struct NoReadingAccessibilityTests {
    @Test func theMarkReadsAsNoReading() {
        #expect(NoReading.accessibilityLabel(for: NoReading.mark) == CopyLoader.widgets.widgetState.noReading)
        #expect(!CopyLoader.widgets.widgetState.noReading.isEmpty)
    }

    @Test func aRealValueKeepsItsOwnReading() {
        #expect(NoReading.accessibilityLabel(for: "62") == nil)
        #expect(NoReading.accessibilityLabel(for: "54 oz") == nil)
    }

    @Test func missingVitalsRenderTheLabelledMark() {
        #expect(DailyVitalsFooterView.vitalText(nil) == NoReading.mark)
        #expect(DailyVitalsFooterView.tempText(nil) == NoReading.mark)
        #expect(DailyVitalsFooterView.vitalText(58.4) == "58")
        #expect(DailyVitalsFooterView.tempText(-0.4) == "-0.4")
        #expect(HydrationPopulatedView.valueText(0, unit: "oz", measured: false) == NoReading.mark)
    }

    /// Every no-reading mark in the widget views goes through NoReading.mark, so it
    /// carries the accessibility label: no view may render a bare em-dash literal.
    @Test func noWidgetViewRendersABareDash() throws {
        let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("Sources/LifegamesWidgets")
        let views = try FileManager.default.subpathsOfDirectory(atPath: root.path)
            .filter { $0.hasSuffix("View.swift") }
        #expect(!views.isEmpty)
        var offenders: [String] = []
        for rel in views {
            let source = try String(contentsOf: root.appendingPathComponent(rel), encoding: .utf8)
            for (i, line) in source.components(separatedBy: "\n").enumerated() {
                let code = line.components(separatedBy: "//").first ?? ""
                if code.contains("\"—\"") || code.contains("\"\\u{2014}\"") {
                    offenders.append("\(rel):\(i + 1)")
                }
            }
        }
        #expect(offenders.isEmpty, "bare no-reading marks: \(offenders)")
    }

    /// The label modifier is applied at every value cell that can show the mark.
    @Test func everyValueCellAppliesTheLabel() throws {
        let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("Sources/LifegamesWidgets")
        for rel in ["Health/HeartRateView.swift", "Health/HydrationView.swift", "Reading/BookModalView.swift"] {
            let source = try String(contentsOf: root.appendingPathComponent(rel), encoding: .utf8)
            #expect(source.contains(".noReadingAccessibility(value)"), "\(rel) shows NoReading.mark without its label")
        }
    }
}
