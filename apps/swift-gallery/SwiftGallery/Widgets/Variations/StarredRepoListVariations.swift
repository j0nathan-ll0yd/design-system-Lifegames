import LifegamesWidgets
import SwiftUI

/// State variations for `StarredRepoListView`. Direct decode — fixture wire shape matches
/// `StarredRepoListProps` exactly.
enum StarredRepoListVariations {
    struct State: Identifiable {
        let id: String
        let label: String
        let fixtureName: String
    }

    static let states: [State] = [
        .init(id: "default", label: "Default", fixtureName: "starred-repo-list"),
        .init(id: "populated-min", label: "Populated (min)", fixtureName: "starred-repo-list.populated-min"),
        .init(id: "populated-max", label: "Populated (max)", fixtureName: "starred-repo-list.populated-max"),
        .init(id: "archived-mix", label: "Archived Mix", fixtureName: "starred-repo-list.archived-mix"),
        .init(id: "freshly-starred", label: "Freshly Starred", fixtureName: "starred-repo-list.freshly-starred"),
        .init(id: "one-language", label: "One Language", fixtureName: "starred-repo-list.one-language"),
        .init(id: "org-starred", label: "Org Starred", fixtureName: "starred-repo-list.org-starred"),
        .init(id: "polyglot", label: "Polyglot", fixtureName: "starred-repo-list.polyglot"),
        .init(id: "skeleton", label: "Skeleton", fixtureName: "starred-repo-list.skeleton"),
        .init(id: "empty", label: "Empty", fixtureName: "starred-repo-list.empty"),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "starred-repo-list",
            title: "Starred Repo List",
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
        if let props: StarredRepoListProps = FixtureLoader.load(category: "github", name: state.fixtureName) {
            StarredRepoListView(props: props)
        } else {
            Text("Missing fixture: \(state.fixtureName)")
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(.red)
        }
    }
}

