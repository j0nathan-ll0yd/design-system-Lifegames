import LifegamesWidgets
import SwiftUI

/// State variations for `FocusOverlayView`. Uses a single `init(props:)` path — the view has no
/// dual `init(state:)`. All fixtures are `{}` (state is runtime-injected); the adapter returns
/// a default Props so the gallery renders the view regardless.
enum FocusOverlayVariations {
    enum Kind {
        case fixture(String)
    }

    struct State: Identifiable {
        let id: String
        let label: String
        let kind: Kind
    }

    static let states: [State] = [
        .init(id: "default", label: "Default", kind: .fixture("focus-overlay")),
        .init(id: "populated-min", label: "Populated (min)", kind: .fixture("focus-overlay.populated-min")),
        .init(id: "populated-max", label: "Populated (max)", kind: .fixture("focus-overlay.populated-max")),
        .init(id: "focus-default", label: "Default (named)", kind: .fixture("focus-overlay.default")),
        .init(id: "skeleton", label: "Skeleton", kind: .fixture("focus-overlay.skeleton")),
        .init(id: "empty", label: "Empty", kind: .fixture("focus-overlay.empty")),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "focus-overlay",
            title: "Focus Overlay",
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
               let props = Adapters.focusOverlay(fromFixture: data)
            {
                FocusOverlayView(props: props)
            } else {
                Text("Missing fixture: \(name)")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(.red)
            }
        }
    }
}

