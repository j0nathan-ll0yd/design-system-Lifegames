import LifegamesWidgets
import SwiftUI

/// State variations for `NightSummaryView`. Uses the `Kind` discriminator because the view ships
/// a dual init: `init(state: .loading/.empty)` for skeleton/empty chrome and `init(props:)` for
/// data. Decoding the `.skeleton.json` / `.empty.json` fixtures through `init(props:)` would
/// render a populated view with skeleton-shaped data — these states must hit `init(state:)`.
enum NightSummaryVariations {
    enum Kind {
        case fixture(String)
        case skeleton
        case empty
    }

    struct State: Identifiable {
        let id: String
        let label: String
        let kind: Kind
    }

    static let states: [State] = [
        .init(id: "default", label: "Default", kind: .fixture("night-summary")),
        .init(id: "populated-min", label: "Populated (min)", kind: .fixture("night-summary.populated-min")),
        .init(id: "populated-max", label: "Populated (max)", kind: .fixture("night-summary.populated-max")),
        .init(id: "excellent", label: "Excellent", kind: .fixture("night-summary.excellent")),
        .init(id: "fair", label: "Fair", kind: .fixture("night-summary.fair")),
        .init(id: "good", label: "Good", kind: .fixture("night-summary.good")),
        .init(id: "nap", label: "Nap", kind: .fixture("night-summary.nap")),
        .init(id: "oversleep", label: "Oversleep", kind: .fixture("night-summary.oversleep")),
        .init(id: "poor", label: "Poor", kind: .fixture("night-summary.poor")),
        .init(id: "restless", label: "Restless", kind: .fixture("night-summary.restless")),
        .init(id: "skeleton", label: "Skeleton", kind: .skeleton),
        .init(id: "empty", label: "Empty", kind: .empty),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "night-summary",
            title: "Night Summary",
            category: .health,
            states: states.map { state in
                VariationState(id: state.id, label: state.label) {
                    AnyView(render(state: state))
                }
            }
        )
    }

    @ViewBuilder
    private static func render(state: State) -> some View {
        switch state.kind {
        case .skeleton:
            NightSummaryView(state: .loading)
        case .empty:
            NightSummaryView(state: .empty)
        case let .fixture(name):
            if let data = FixtureLoader.data(category: "health", name: name),
               let props = Adapters.nightSummary(fromFixture: data)
            {
                NightSummaryView(props: props)
            } else {
                Text("Missing fixture: \(name)")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(.red)
            }
        }
    }
}
