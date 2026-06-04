import LifegamesWidgets
import SwiftUI

/// State variations for `ActivityFeedView`. Direct decode — the fixture wire shape
/// `{events: [...]}` matches `ActivityFeedProps` exactly. No Kind discriminator needed;
/// skeleton/empty JSON decodes through the single `init(props:)` path.
enum ActivityFeedVariations {
    struct State: Identifiable {
        let id: String
        let label: String
        let fixtureName: String
    }

    static let states: [State] = [
        .init(id: "default", label: "Default", fixtureName: "activity-feed"),
        .init(id: "populated-min", label: "Populated (min)", fixtureName: "activity-feed.populated-min"),
        .init(id: "populated-max", label: "Populated (max)", fixtureName: "activity-feed.populated-max"),
        .init(id: "burst-week", label: "Burst Week", fixtureName: "activity-feed.burst-week"),
        .init(id: "new-contributor", label: "New Contributor", fixtureName: "activity-feed.new-contributor"),
        .init(id: "review-heavy", label: "Review Heavy", fixtureName: "activity-feed.review-heavy-month"),
        .init(id: "skeleton", label: "Skeleton", fixtureName: "activity-feed.skeleton"),
        .init(id: "empty", label: "Empty", fixtureName: "activity-feed.empty"),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "activity-feed",
            title: "Activity Feed",
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
        if let props: ActivityFeedProps = FixtureLoader.load(category: "github", name: state.fixtureName) {
            ActivityFeedView(props: props)
        } else {
            Text("Missing fixture: \(state.fixtureName)")
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(.red)
        }
    }
}

