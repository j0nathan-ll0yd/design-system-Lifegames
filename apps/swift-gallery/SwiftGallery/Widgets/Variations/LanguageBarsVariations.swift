import LifegamesWidgets
import SwiftUI

/// State variations for `LanguageBarsView`. Direct decode — fixture wire shape matches
/// `LanguageBarsProps` exactly.
enum LanguageBarsVariations {
    struct State: Identifiable {
        let id: String
        let label: String
        let fixtureName: String
    }

    static let states: [State] = [
        .init(id: "default", label: "Default", fixtureName: "language-bars"),
        .init(id: "populated-min", label: "Populated (min)", fixtureName: "language-bars.populated-min"),
        .init(id: "populated-max", label: "Populated (max)", fixtureName: "language-bars.populated-max"),
        .init(id: "variation-a", label: "Variation A", fixtureName: "language-bars.variation-a"),
        .init(id: "variation-b", label: "Variation B", fixtureName: "language-bars.variation-b"),
        .init(id: "variation-c", label: "Variation C", fixtureName: "language-bars.variation-c"),
        .init(id: "skeleton", label: "Skeleton", fixtureName: "language-bars.skeleton"),
        .init(id: "empty", label: "Empty", fixtureName: "language-bars.empty"),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "language-bars",
            title: "Language Bars",
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
        if let props: LanguageBarsProps = FixtureLoader.load(category: "github", name: state.fixtureName) {
            LanguageBarsView(props: props)
        } else {
            Text("Missing fixture: \(state.fixtureName)")
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(.red)
        }
    }
}

