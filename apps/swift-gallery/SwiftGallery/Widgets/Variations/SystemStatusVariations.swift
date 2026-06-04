import LifegamesWidgets
import SwiftUI

/// State variations for `SystemStatusView`. Uses a single `init(props:)` path.
/// Wire shape: `{ "system": { "lines": [{ "key", "value", "dotClass" }] } }`
/// Adapter maps `dotClass` (e.g. "sys-dot-green") → `status` string for `SystemStatusProps.StatusLine`.
enum SystemStatusVariations {
    enum Kind {
        case fixture(String)
    }

    struct State: Identifiable {
        let id: String
        let label: String
        let kind: Kind
    }

    static let states: [State] = [
        .init(id: "default", label: "Default", kind: .fixture("system-status")),
        .init(id: "populated-min", label: "Populated (min)", kind: .fixture("system-status.populated-min")),
        .init(id: "populated-max", label: "Populated (max)", kind: .fixture("system-status.populated-max")),
        .init(id: "all-green", label: "All Green", kind: .fixture("system-status.all-green")),
        .init(id: "bootstrap", label: "Bootstrap", kind: .fixture("system-status.bootstrap")),
        .init(id: "degraded", label: "Degraded", kind: .fixture("system-status.degraded")),
        .init(id: "mixed", label: "Mixed", kind: .fixture("system-status.mixed")),
        .init(id: "one-stale", label: "One Stale", kind: .fixture("system-status.one-stale")),
        .init(id: "skeleton", label: "Skeleton", kind: .fixture("system-status.skeleton")),
        .init(id: "empty", label: "Empty", kind: .fixture("system-status.empty")),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "system-status",
            title: "System Status",
            category: .other,
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
            if let data = FixtureLoader.data(category: "other", name: name),
               let props = Adapters.systemStatus(fromFixture: data)
            {
                SystemStatusView(props: props)
            } else {
                Text("Missing fixture: \(name)")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(.red)
            }
        }
    }
}

