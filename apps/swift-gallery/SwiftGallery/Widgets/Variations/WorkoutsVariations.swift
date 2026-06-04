import LifegamesWidgets
import SwiftUI

/// State variations for `WorkoutsView`. Uses the `Kind` discriminator because the view ships
/// a dual init: `init(state: .loading/.empty)` for skeleton/empty chrome and `init(props:)` for
/// data. Decoding the `.skeleton.json` / `.empty.json` fixtures through `init(props:)` would
/// render a populated view with skeleton-shaped data — these states must hit `init(state:)`.
enum WorkoutsVariations {
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
        .init(id: "default", label: "Default", kind: .fixture("workouts")),
        .init(id: "populated-min", label: "Populated (min)", kind: .fixture("workouts.populated-min")),
        .init(id: "populated-max", label: "Populated (max)", kind: .fixture("workouts.populated-max")),
        .init(id: "barrys-only", label: "Barry's Only", kind: .fixture("workouts.barrys-only")),
        .init(id: "endurance", label: "Endurance", kind: .fixture("workouts.endurance")),
        .init(id: "heavy-day", label: "Heavy Day", kind: .fixture("workouts.heavy-day")),
        .init(id: "multi-link", label: "Multi Link", kind: .fixture("workouts.multi-link")),
        .init(id: "skeleton", label: "Skeleton", kind: .skeleton),
        .init(id: "empty", label: "Empty", kind: .empty),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "workouts",
            title: "Workouts",
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
            WorkoutsView(state: .loading)
        case .empty:
            WorkoutsView(state: .empty)
        case let .fixture(name):
            if let data = FixtureLoader.data(category: "health", name: name),
               let props = Adapters.workouts(fromFixture: data)
            {
                WorkoutsView(props: props)
            } else {
                Text("Missing fixture: \(name)")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(.red)
            }
        }
    }
}
