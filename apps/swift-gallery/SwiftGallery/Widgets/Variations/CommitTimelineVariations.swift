import LifegamesWidgets
import SwiftUI

/// State variations for `CommitTimelineView`. Direct decode — fixture wire shape matches
/// `CommitTimelineProps` exactly.
enum CommitTimelineVariations {
    struct State: Identifiable {
        let id: String
        let label: String
        let fixtureName: String
    }

    static let states: [State] = [
        .init(id: "default", label: "Default", fixtureName: "commit-timeline"),
        .init(id: "populated-min", label: "Populated (min)", fixtureName: "commit-timeline.populated-min"),
        .init(id: "populated-max", label: "Populated (max)", fixtureName: "commit-timeline.populated-max"),
        .init(id: "gap-and-recovery", label: "Gap and Recovery", fixtureName: "commit-timeline.gap-and-recovery"),
        .init(id: "multi-repo-scatter", label: "Multi-Repo Scatter", fixtureName: "commit-timeline.multi-repo-scatter"),
        .init(id: "ninety-day-streak", label: "90-Day Streak", fixtureName: "commit-timeline.ninety-day-streak"),
        .init(id: "skeleton", label: "Skeleton", fixtureName: "commit-timeline.skeleton"),
        .init(id: "empty", label: "Empty", fixtureName: "commit-timeline.empty"),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "commit-timeline",
            title: "Commit Timeline",
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
        if let props: CommitTimelineProps = FixtureLoader.load(category: "github", name: state.fixtureName) {
            CommitTimelineView(props: props)
        } else {
            Text("Missing fixture: \(state.fixtureName)")
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(.red)
        }
    }
}

