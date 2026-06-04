import LifegamesWidgets
import SwiftUI

/// State variations for `HydrationView`. Uses the `Kind` discriminator because the view ships
/// a dual init: `init(state: .loading/.empty)` for skeleton/empty chrome and `init(props:)` for
/// data. Decoding the `.skeleton.json` / `.empty.json` fixtures through `init(props:)` would
/// render a populated view with skeleton-shaped data — these states must hit `init(state:)`.
enum HydrationVariations {
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
        .init(id: "default", label: "Default", kind: .fixture("hydration")),
        .init(id: "populated-min", label: "Populated (min)", kind: .fixture("hydration.populated-min")),
        .init(id: "populated-max", label: "Populated (max)", kind: .fixture("hydration.populated-max")),
        .init(id: "caffeine-crash", label: "Caffeine Crash", kind: .fixture("hydration.caffeine-crash")),
        .init(id: "dehydrated", label: "Dehydrated", kind: .fixture("hydration.dehydrated")),
        .init(id: "hydrated", label: "Hydrated", kind: .fixture("hydration.hydrated")),
        .init(id: "low", label: "Low", kind: .fixture("hydration.low")),
        .init(id: "morning-coffee", label: "Morning Coffee", kind: .fixture("hydration.morning-coffee")),
        .init(id: "normal", label: "Normal", kind: .fixture("hydration.normal")),
        .init(id: "overhydrated", label: "Overhydrated", kind: .fixture("hydration.overhydrated")),
        .init(id: "skeleton", label: "Skeleton", kind: .skeleton),
        .init(id: "empty", label: "Empty", kind: .empty),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "hydration",
            title: "Hydration",
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
            HydrationView(state: .loading)
        case .empty:
            HydrationView(state: .empty)
        case let .fixture(name):
            if let data = FixtureLoader.data(category: "health", name: name),
               let props = Adapters.hydration(fromFixture: data)
            {
                HydrationView(props: props)
            } else {
                Text("Missing fixture: \(name)")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(.red)
            }
        }
    }
}
