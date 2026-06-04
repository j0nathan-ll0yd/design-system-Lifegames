import LifegamesWidgets
import SwiftUI

/// State variations for `DevActivityTimelineView`. Direct decode — fixture wire shape matches
/// `DevActivityProps` exactly.
enum DevActivityTimelineVariations {
    struct State: Identifiable {
        let id: String
        let label: String
        let fixtureName: String
    }

    static let states: [State] = [
        .init(id: "default", label: "Default", fixtureName: "dev-activity-timeline"),
        .init(id: "populated-min", label: "Populated (min)", fixtureName: "dev-activity-timeline.populated-min"),
        .init(id: "populated-max", label: "Populated (max)", fixtureName: "dev-activity-timeline.populated-max"),
        .init(id: "variation-a", label: "Variation A", fixtureName: "dev-activity-timeline.variation-a"),
        .init(id: "variation-b", label: "Variation B", fixtureName: "dev-activity-timeline.variation-b"),
        .init(id: "variation-c", label: "Variation C", fixtureName: "dev-activity-timeline.variation-c"),
        .init(id: "skeleton", label: "Skeleton", fixtureName: "dev-activity-timeline.skeleton"),
        .init(id: "empty", label: "Empty", fixtureName: "dev-activity-timeline.empty"),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "dev-activity-timeline",
            title: "Dev Activity Timeline",
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
            DevActivityTimelineView(props: props)
        } else {
            Text("Missing fixture: \(state.fixtureName)")
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(.red)
        }
    }
}

