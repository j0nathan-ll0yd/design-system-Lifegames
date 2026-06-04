import LifegamesWidgets
import SwiftUI

/// State variations for `ExplorationOdometerView`. Uses a simple `.fixture` path for every state
/// (no dual `init(state:)`) — skeleton/empty fixtures are zeroed data rendered through the single
/// `init(totalVisits:totalPlaces:citiesVisited:totalStates:currentCity:)`.
enum ExplorationOdometerVariations {
    enum Kind {
        case fixture(String)
    }

    struct State: Identifiable {
        let id: String
        let label: String
        let kind: Kind
    }

    static let states: [State] = [
        .init(id: "default", label: "Default", kind: .fixture("exploration-odometer-v3")),
        .init(id: "populated-min", label: "Populated (min)", kind: .fixture("exploration-odometer-v3.populated-min")),
        .init(id: "populated-max", label: "Populated (max)", kind: .fixture("exploration-odometer-v3.populated-max")),
        .init(id: "homebody", label: "Homebody", kind: .fixture("exploration-odometer-v3.homebody")),
        .init(id: "new-city-week", label: "New City Week", kind: .fixture("exploration-odometer-v3.new-city-week")),
        .init(id: "passport-week", label: "Passport Week", kind: .fixture("exploration-odometer-v3.passport-week")),
        .init(id: "roadtripper", label: "Roadtripper", kind: .fixture("exploration-odometer-v3.roadtripper")),
        .init(id: "weekend-warrior", label: "Weekend Warrior", kind: .fixture("exploration-odometer-v3.weekend-warrior")),
        .init(id: "skeleton", label: "Skeleton", kind: .fixture("exploration-odometer-v3.skeleton")),
        .init(id: "empty", label: "Empty", kind: .fixture("exploration-odometer-v3.empty")),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "exploration-odometer",
            title: "Exploration Odometer",
            category: .location,
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
            if let data = FixtureLoader.data(category: "location", name: name),
               let props = Adapters.explorationOdometer(fromFixture: data)
            {
                ExplorationOdometerView(
                    totalVisits: props.totalVisits,
                    totalPlaces: props.totalPlaces,
                    citiesVisited: props.citiesVisited,
                    totalStates: props.totalStates,
                    currentCity: props.currentCity
                )
            } else {
                Text("Missing fixture: \(name)")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(.red)
            }
        }
    }
}

