import LifegamesWidgets
import SwiftUI

/// State variations for `OGImageView`. Uses a single `init(props:)` path.
/// Wire shape includes an `avatarUrl` field not present in `OGImageProps`; Codable ignores unknown
/// keys so the adapter simply delegates to `JSONDecoder`.
enum OGImageVariations {
    enum Kind {
        case fixture(String)
    }

    struct State: Identifiable {
        let id: String
        let label: String
        let kind: Kind
    }

    static let states: [State] = [
        .init(id: "default", label: "Default", kind: .fixture("og-image")),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "og-image",
            title: "OG Image",
            category: .other,
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
            if let data = FixtureLoader.data(category: "other", name: name),
               let props = Adapters.ogImage(fromFixture: data)
            {
                OGImageView(props: props)
            } else {
                Text("Missing fixture: \(name)")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(.red)
            }
        }
    }
}

