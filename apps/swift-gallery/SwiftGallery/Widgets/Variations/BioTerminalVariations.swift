import LifegamesWidgets
import SwiftUI

/// State variations for `BioTerminalView`. Props-only view (no dual init), so all states —
/// including skeleton/empty — decode through the adapter and call `init(props:)`.
/// The skeleton/empty fixtures contain `{profile: {terminalLines: []}}`, which produces a
/// `BioTerminalProps` with an empty lines array and renders the empty terminal chrome correctly.
enum BioTerminalVariations {
    enum Kind {
        case fixture(String)
    }

    struct State: Identifiable {
        let id: String
        let label: String
        let kind: Kind
    }

    static let states: [State] = [
        .init(id: "default", label: "Default", kind: .fixture("bio-terminal")),
        .init(id: "populated-min", label: "Populated (min)", kind: .fixture("bio-terminal.populated-min")),
        .init(id: "populated-max", label: "Populated (max)", kind: .fixture("bio-terminal.populated-max")),
        .init(id: "dense", label: "Dense", kind: .fixture("bio-terminal.dense")),
        .init(id: "minimal", label: "Minimal", kind: .fixture("bio-terminal.minimal")),
        .init(id: "skills", label: "Skills", kind: .fixture("bio-terminal.skills")),
        .init(id: "uptime", label: "Uptime", kind: .fixture("bio-terminal.uptime")),
        .init(id: "skeleton", label: "Skeleton", kind: .fixture("bio-terminal.skeleton")),
        .init(id: "empty", label: "Empty", kind: .fixture("bio-terminal.empty")),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "bio-terminal",
            title: "Bio Terminal",
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
               let props = Adapters.bioTerminal(fromFixture: data)
            {
                BioTerminalView(props: props)
            } else {
                Text("Missing fixture: \(name)")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(.red)
            }
        }
    }
}

