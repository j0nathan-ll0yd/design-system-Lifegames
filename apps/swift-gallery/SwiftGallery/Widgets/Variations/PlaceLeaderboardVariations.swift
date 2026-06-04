import LifegamesWidgets
import SwiftUI

/// State variations for `PlaceLeaderboardView`. Uses a simple `.fixture` path for every state
/// (no dual `init(state:)`) — skeleton/empty fixtures are empty arrays rendered through the single
/// `init(places:)`.
enum PlaceLeaderboardVariations {
    enum Kind {
        case fixture(String)
    }

    struct State: Identifiable {
        let id: String
        let label: String
        let kind: Kind
    }

    static let states: [State] = [
        .init(id: "default", label: "Default", kind: .fixture("place-leaderboard-v3")),
        .init(id: "populated-min", label: "Populated (min)", kind: .fixture("place-leaderboard-v3.populated-min")),
        .init(id: "populated-max", label: "Populated (max)", kind: .fixture("place-leaderboard-v3.populated-max")),
        .init(id: "cafe-loyal", label: "Cafe Loyal", kind: .fixture("place-leaderboard-v3.cafe-loyal")),
        .init(id: "even-spread", label: "Even Spread", kind: .fixture("place-leaderboard-v3.even-spread")),
        .init(id: "gym-loyal", label: "Gym Loyal", kind: .fixture("place-leaderboard-v3.gym-loyal")),
        .init(id: "gym-vs-cafe", label: "Gym vs Cafe", kind: .fixture("place-leaderboard-v3.gym-vs-cafe")),
        .init(id: "tourist-week", label: "Tourist Week", kind: .fixture("place-leaderboard-v3.tourist-week")),
        .init(id: "skeleton", label: "Skeleton", kind: .fixture("place-leaderboard-v3.skeleton")),
        .init(id: "empty", label: "Empty", kind: .fixture("place-leaderboard-v3.empty")),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "place-leaderboard",
            title: "Place Leaderboard",
            category: .location,
            states: states.map { state in
                VariationState(id: state.id, label: state.label) {
                    AnyView(render(state: state))
                }
            }
        )
    }

    @ViewBuilder
    fileprivate static func render(state: State) -> some View {
        switch state.kind {
        case let .fixture(name):
            if let data = FixtureLoader.data(category: "location", name: name),
               let places = Adapters.placeLeaderboard(fromFixture: data)
            {
                PlaceLeaderboardView(places: places)
            } else {
                Text("Missing fixture: \(name)")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(.red)
            }
        }
    }
}

