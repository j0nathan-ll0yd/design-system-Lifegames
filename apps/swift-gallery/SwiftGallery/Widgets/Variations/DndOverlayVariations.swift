import LifegamesWidgets
import SwiftUI

/// State variations for `DndOverlayView`. Uses a single `init(props:)` path — the view has no
/// dual `init(state:)`. All fixtures are `{}` (state is runtime-injected); the adapter returns
/// a default Props so the gallery renders the view regardless.
enum DndOverlayVariations {
    enum Kind {
        case fixture(String)
    }

    struct State: Identifiable {
        let id: String
        let label: String
        let kind: Kind
    }

    static let states: [State] = [
        .init(id: "default", label: "Default", kind: .fixture("dnd-overlay")),
        .init(id: "populated-min", label: "Populated (min)", kind: .fixture("dnd-overlay.populated-min")),
        .init(id: "populated-max", label: "Populated (max)", kind: .fixture("dnd-overlay.populated-max")),
        .init(id: "dnd-default", label: "Default (named)", kind: .fixture("dnd-overlay.default")),
        .init(id: "skeleton", label: "Skeleton", kind: .fixture("dnd-overlay.skeleton")),
        .init(id: "empty", label: "Empty", kind: .fixture("dnd-overlay.empty")),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "dnd-overlay",
            title: "DnD Overlay",
            category: .other,
            states: states.map { state in
                VariationState(id: state.id, label: state.label) {
                    AnyView(render(state: state))
                }
            }
        )
    }

    @ViewBuilder
    fileprivate static func render(state: State) -> some View {
        switch state.kind {
        case let .fixture(name):
            if let data = FixtureLoader.data(category: "other", name: name),
               let props = Adapters.dndOverlay(fromFixture: data)
            {
                DndOverlayView(props: props)
            } else {
                Text("Missing fixture: \(name)")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(.red)
            }
        }
    }
}

