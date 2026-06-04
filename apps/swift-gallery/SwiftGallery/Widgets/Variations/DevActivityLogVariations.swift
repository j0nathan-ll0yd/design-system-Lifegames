import LifegamesWidgets
import SwiftUI

/// State variations for `DevActivityLogView`. Direct decode — fixture wire shape matches
/// `DevActivityProps` exactly.
enum DevActivityLogVariations {
    struct State: Identifiable {
        let id: String
        let label: String
        let fixtureName: String
    }

    static let states: [State] = [
        .init(id: "default", label: "Default", fixtureName: "dev-activity-log"),
        .init(id: "populated-min", label: "Populated (min)", fixtureName: "dev-activity-log.populated-min"),
        .init(id: "populated-max", label: "Populated (max)", fixtureName: "dev-activity-log.populated-max"),
        .init(id: "bot-noise", label: "Bot Noise", fixtureName: "dev-activity-log.bot-noise"),
        .init(id: "merge-marathon", label: "Merge Marathon", fixtureName: "dev-activity-log.merge-marathon"),
        .init(id: "mixed-repos", label: "Mixed Repos", fixtureName: "dev-activity-log.mixed-repos"),
        .init(id: "pr-burst", label: "PR Burst", fixtureName: "dev-activity-log.pr-burst"),
        .init(id: "quiet-day", label: "Quiet Day", fixtureName: "dev-activity-log.quiet-day"),
        .init(id: "skeleton", label: "Skeleton", fixtureName: "dev-activity-log.skeleton"),
        .init(id: "empty", label: "Empty", fixtureName: "dev-activity-log.empty"),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "dev-activity-log",
            title: "Dev Activity Log",
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
        if let props: DevActivityProps = FixtureLoader.load(category: "github", name: state.fixtureName) {
            DevActivityLogView(props: props)
        } else {
            Text("Missing fixture: \(state.fixtureName)")
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(.red)
        }
    }
}

