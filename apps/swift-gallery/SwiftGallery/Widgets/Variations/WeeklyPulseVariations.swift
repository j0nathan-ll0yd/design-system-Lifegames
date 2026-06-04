import LifegamesWidgets
import SwiftUI

/// State variations for `WeeklyPulseView`. Direct decode — fixture wire shape matches
/// `WeeklyPulseProps` exactly.
enum WeeklyPulseVariations {
    struct State: Identifiable {
        let id: String
        let label: String
        let fixtureName: String
    }

    static let states: [State] = [
        .init(id: "default", label: "Default", fixtureName: "weekly-pulse"),
        .init(id: "populated-min", label: "Populated (min)", fixtureName: "weekly-pulse.populated-min"),
        .init(id: "populated-max", label: "Populated (max)", fixtureName: "weekly-pulse.populated-max"),
        .init(id: "variation-a", label: "Variation A", fixtureName: "weekly-pulse.variation-a"),
        .init(id: "variation-b", label: "Variation B", fixtureName: "weekly-pulse.variation-b"),
        .init(id: "variation-c", label: "Variation C", fixtureName: "weekly-pulse.variation-c"),
        .init(id: "skeleton", label: "Skeleton", fixtureName: "weekly-pulse.skeleton"),
        .init(id: "empty", label: "Empty", fixtureName: "weekly-pulse.empty"),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "weekly-pulse",
            title: "Weekly Pulse",
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
        if let props: WeeklyPulseProps = FixtureLoader.load(category: "github", name: state.fixtureName) {
            WeeklyPulseView(props: props)
        } else {
            Text("Missing fixture: \(state.fixtureName)")
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(.red)
        }
    }
}

