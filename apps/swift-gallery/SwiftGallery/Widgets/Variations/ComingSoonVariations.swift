import LifegamesWidgets
import SwiftUI

/// State variations for `ComingSoonView`. Props-only view (no dual init). All current fixtures
/// are empty `{}` placeholders; the adapter returns a placeholder Props so the view renders its
/// chrome rather than silently failing. Future fixtures may carry real data.
enum ComingSoonVariations {
    enum Kind {
        case fixture(String)
    }

    struct State: Identifiable {
        let id: String
        let label: String
        let kind: Kind
    }

    static let states: [State] = [
        .init(id: "default", label: "Default", kind: .fixture("coming-soon")),
        .init(id: "populated-min", label: "Populated (min)", kind: .fixture("coming-soon.populated-min")),
        .init(id: "populated-max", label: "Populated (max)", kind: .fixture("coming-soon.populated-max")),
        .init(id: "variation-a", label: "Variation A", kind: .fixture("coming-soon.variation-a")),
        .init(id: "variation-b", label: "Variation B", kind: .fixture("coming-soon.variation-b")),
        .init(id: "variation-c", label: "Variation C", kind: .fixture("coming-soon.variation-c")),
        .init(id: "skeleton", label: "Skeleton", kind: .fixture("coming-soon.skeleton")),
        .init(id: "empty", label: "Empty", kind: .fixture("coming-soon.empty")),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "coming-soon",
            title: "Coming Soon",
            category: .identity,
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
        case let .fixture(name):
            if let data = FixtureLoader.data(category: "identity", name: name),
               let props = Adapters.comingSoon(fromFixture: data)
            {
                ComingSoonView(props: props)
            } else {
                Text("Missing fixture: \(name)")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(.red)
            }
        }
    }
}

