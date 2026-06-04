import LifegamesWidgets
import SwiftUI

/// State variations for `DevActivityCardsView`. Direct decode — fixture wire shape matches
/// `DevActivityProps` exactly.
enum DevActivityCardsVariations {
    struct State: Identifiable {
        let id: String
        let label: String
        let fixtureName: String
    }

    static let states: [State] = [
        .init(id: "default", label: "Default", fixtureName: "dev-activity-cards"),
        .init(id: "populated-min", label: "Populated (min)", fixtureName: "dev-activity-cards.populated-min"),
        .init(id: "populated-max", label: "Populated (max)", fixtureName: "dev-activity-cards.populated-max"),
        .init(id: "variation-a", label: "Variation A", fixtureName: "dev-activity-cards.variation-a"),
        .init(id: "variation-b", label: "Variation B", fixtureName: "dev-activity-cards.variation-b"),
        .init(id: "variation-c", label: "Variation C", fixtureName: "dev-activity-cards.variation-c"),
        .init(id: "skeleton", label: "Skeleton", fixtureName: "dev-activity-cards.skeleton"),
        .init(id: "empty", label: "Empty", fixtureName: "dev-activity-cards.empty"),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "dev-activity-cards",
            title: "Dev Activity Cards",
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
        if let props: DevActivityProps = FixtureLoader.load(category: "github", name: state.fixtureName) {
            DevActivityCardsView(props: props)
        } else {
            Text("Missing fixture: \(state.fixtureName)")
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(.red)
        }
    }
}

