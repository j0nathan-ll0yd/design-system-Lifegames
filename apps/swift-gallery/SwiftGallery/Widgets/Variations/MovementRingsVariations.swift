import LifegamesWidgets
import SwiftUI

/// State variations for `MovementRingsView`. Uses the `Kind` discriminator because the view ships
/// a dual init: `init(state: .loading/.empty)` for skeleton/empty chrome and `init(props:)` for
/// populated data. Fixtures are loaded via `Adapters.movementRings(fromFixture:)` which unwraps
/// the `{health: {movement: {...}}}` envelope.
enum MovementRingsVariations {
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
        .init(id: "default", label: "Default", kind: .fixture("movement-rings")),
        .init(id: "populated-min", label: "Populated (min)", kind: .fixture("movement-rings.populated-min")),
        .init(id: "populated-max", label: "Populated (max)", kind: .fixture("movement-rings.populated-max")),
        .init(id: "all-rings-closed", label: "All Rings Closed", kind: .fixture("movement-rings.all-rings-closed")),
        .init(id: "stand-only", label: "Stand Only", kind: .fixture("movement-rings.stand-only")),
        .init(id: "skeleton", label: "Skeleton", kind: .skeleton),
        .init(id: "empty", label: "Empty", kind: .empty),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "movement-rings",
            title: "Movement Rings",
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
            MovementRingsView(state: .loading)
        case .empty:
            MovementRingsView(state: .empty)
        case let .fixture(name):
            if let data = FixtureLoader.data(category: "health", name: name),
               let props = Adapters.movementRings(fromFixture: data)
            {
                MovementRingsView(props: props)
            } else {
                Text("Missing fixture: \(name)")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(.red)
            }
        }
    }
}
