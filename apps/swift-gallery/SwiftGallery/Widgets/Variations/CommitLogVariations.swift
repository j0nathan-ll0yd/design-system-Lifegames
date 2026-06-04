import LifegamesWidgets
import SwiftUI

/// State variations for `CommitLogView`. Direct decode — fixture wire shape matches
/// `CommitLogProps` exactly.
enum CommitLogVariations {
    struct State: Identifiable {
        let id: String
        let label: String
        let fixtureName: String
    }

    static let states: [State] = [
        .init(id: "default", label: "Default", fixtureName: "commit-log"),
        .init(id: "populated-min", label: "Populated (min)", fixtureName: "commit-log.populated-min"),
        .init(id: "populated-max", label: "Populated (max)", fixtureName: "commit-log.populated-max"),
        .init(id: "conventional-discipline", label: "Conventional Discipline", fixtureName: "commit-log.conventional-discipline"),
        .init(id: "messy-history", label: "Messy History", fixtureName: "commit-log.messy-history"),
        .init(id: "refactor-sprint", label: "Refactor Sprint", fixtureName: "commit-log.refactor-sprint"),
        .init(id: "skeleton", label: "Skeleton", fixtureName: "commit-log.skeleton"),
        .init(id: "empty", label: "Empty", fixtureName: "commit-log.empty"),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "commit-log",
            title: "Commit Log",
            category: .github,
            states: states.map { state in
                VariationState(id: state.id, label: state.label) {
                    AnyView(render(state: state))
                }
            }
        )
    }

    @ViewBuilder
    fileprivate static func render(state: State) -> some View {
        if let props: CommitLogProps = FixtureLoader.load(category: "github", name: state.fixtureName) {
            CommitLogView(props: props)
        } else {
            Text("Missing fixture: \(state.fixtureName)")
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(.red)
        }
    }
}

