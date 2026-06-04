import LifegamesWidgets
import SwiftUI

/// State variations for `PinnedReposView`. Direct decode — fixture wire shape matches
/// `PinnedReposProps` exactly.
enum PinnedReposVariations {
    struct State: Identifiable {
        let id: String
        let label: String
        let fixtureName: String
    }

    static let states: [State] = [
        .init(id: "default", label: "Default", fixtureName: "pinned-repos"),
        .init(id: "populated-min", label: "Populated (min)", fixtureName: "pinned-repos.populated-min"),
        .init(id: "populated-max", label: "Populated (max)", fixtureName: "pinned-repos.populated-max"),
        .init(id: "variation-a", label: "Variation A", fixtureName: "pinned-repos.variation-a"),
        .init(id: "variation-b", label: "Variation B", fixtureName: "pinned-repos.variation-b"),
        .init(id: "variation-c", label: "Variation C", fixtureName: "pinned-repos.variation-c"),
        .init(id: "skeleton", label: "Skeleton", fixtureName: "pinned-repos.skeleton"),
        .init(id: "empty", label: "Empty", fixtureName: "pinned-repos.empty"),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "pinned-repos",
            title: "Pinned Repos",
            category: .github,
            states: states.map { state in
                VariationState(id: state.id, label: state.label) {
                    AnyView(render(state: state))
                }
            }
        )
    }

    @ViewBuilder
    private static func render(state: State) -> some View {
        if let props: PinnedReposProps = FixtureLoader.load(category: "github", name: state.fixtureName) {
            PinnedReposView(props: props)
        } else {
            Text("Missing fixture: \(state.fixtureName)")
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(.red)
        }
    }
}

