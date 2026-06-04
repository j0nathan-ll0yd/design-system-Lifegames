import LifegamesWidgets
import SwiftUI

/// State variations for `LanguageStackView`. Direct decode — `LanguageStackView` takes
/// `LanguageBarsProps`; the language-stack fixtures share the same wire shape.
enum LanguageStackVariations {
    struct State: Identifiable {
        let id: String
        let label: String
        let fixtureName: String
    }

    static let states: [State] = [
        .init(id: "default", label: "Default", fixtureName: "language-stack"),
        .init(id: "populated-min", label: "Populated (min)", fixtureName: "language-stack.populated-min"),
        .init(id: "populated-max", label: "Populated (max)", fixtureName: "language-stack.populated-max"),
        .init(id: "variation-a", label: "Variation A", fixtureName: "language-stack.variation-a"),
        .init(id: "variation-b", label: "Variation B", fixtureName: "language-stack.variation-b"),
        .init(id: "variation-c", label: "Variation C", fixtureName: "language-stack.variation-c"),
        .init(id: "skeleton", label: "Skeleton", fixtureName: "language-stack.skeleton"),
        .init(id: "empty", label: "Empty", fixtureName: "language-stack.empty"),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "language-stack",
            title: "Language Stack",
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
        if let props: LanguageBarsProps = FixtureLoader.load(category: "github", name: state.fixtureName) {
            LanguageStackView(props: props)
        } else {
            Text("Missing fixture: \(state.fixtureName)")
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(.red)
        }
    }
}

