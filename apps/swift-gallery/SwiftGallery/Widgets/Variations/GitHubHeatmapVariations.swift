import LifegamesWidgets
import SwiftUI

/// State variations for `GitHubHeatmapView`. Uses a single `init(props:)` path.
/// Wire shape: `{ "github": { "contributions": [[Int]], "stats": { "repos", "stars", "contributions" } } }`
/// Adapter maps the wire envelope to flat `GitHubHeatmapProps`.
enum GitHubHeatmapVariations {
    enum Kind {
        case fixture(String)
    }

    struct State: Identifiable {
        let id: String
        let label: String
        let kind: Kind
    }

    static let states: [State] = [
        .init(id: "default", label: "Default", kind: .fixture("github-heatmap")),
        .init(id: "populated-min", label: "Populated (min)", kind: .fixture("github-heatmap.populated-min")),
        .init(id: "populated-max", label: "Populated (max)", kind: .fixture("github-heatmap.populated-max")),
        .init(id: "burst-driven", label: "Burst Driven", kind: .fixture("github-heatmap.burst-driven")),
        .init(id: "consistent-contributor", label: "Consistent Contributor", kind: .fixture("github-heatmap.consistent-contributor")),
        .init(id: "seasonal-surge", label: "Seasonal Surge", kind: .fixture("github-heatmap.seasonal-surge")),
        .init(id: "sparse-year", label: "Sparse Year", kind: .fixture("github-heatmap.sparse-year")),
        .init(id: "weekend-warrior", label: "Weekend Warrior", kind: .fixture("github-heatmap.weekend-warrior")),
        .init(id: "skeleton", label: "Skeleton", kind: .fixture("github-heatmap.skeleton")),
        .init(id: "empty", label: "Empty", kind: .fixture("github-heatmap.empty")),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "github-heatmap",
            title: "GitHub Heatmap",
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
               let props = Adapters.gitHubHeatmap(fromFixture: data)
            {
                GitHubHeatmapView(props: props)
            } else {
                Text("Missing fixture: \(name)")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(.red)
            }
        }
    }
}

