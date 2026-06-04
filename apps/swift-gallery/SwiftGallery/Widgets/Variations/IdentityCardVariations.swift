import LifegamesWidgets
import SwiftUI

/// State variations for `IdentityCardView`. Props-only view (no dual init). Wire shape uses a
/// `{profile: {...}}` envelope with `github`/`linkedin` keys; the adapter maps these to
/// `githubUrl`/`linkedinUrl` and fills in a default empty `tagline` when absent from the fixture.
enum IdentityCardVariations {
    enum Kind {
        case fixture(String)
    }

    struct State: Identifiable {
        let id: String
        let label: String
        let kind: Kind
    }

    static let states: [State] = [
        .init(id: "default", label: "Default", kind: .fixture("identity-card")),
        .init(id: "populated-min", label: "Populated (min)", kind: .fixture("identity-card.populated-min")),
        .init(id: "populated-max", label: "Populated (max)", kind: .fixture("identity-card.populated-max")),
        .init(id: "creator", label: "Creator", kind: .fixture("identity-card.creator")),
        .init(id: "engineer-lead", label: "Engineer Lead", kind: .fixture("identity-card.engineer-lead")),
        .init(id: "long-bio", label: "Long Bio", kind: .fixture("identity-card.long-bio")),
        .init(id: "minimal", label: "Minimal", kind: .fixture("identity-card.minimal")),
        .init(id: "skeleton", label: "Skeleton", kind: .fixture("identity-card.skeleton")),
        .init(id: "empty", label: "Empty", kind: .fixture("identity-card.empty")),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "identity-card",
            title: "Identity Card",
            category: .identity,
            states: states.map { state in
                VariationState(id: state.id, label: state.label) {
                    AnyView(render(state: state))
                }
            }
        )
    }

    @ViewBuilder
    private static func render(state: State) -> some View {
        switch state.kind {
        case let .fixture(name):
            if let data = FixtureLoader.data(category: "identity", name: name),
               let props = Adapters.identityCard(fromFixture: data)
            {
                IdentityCardView(props: props)
            } else {
                Text("Missing fixture: \(name)")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(.red)
            }
        }
    }
}

