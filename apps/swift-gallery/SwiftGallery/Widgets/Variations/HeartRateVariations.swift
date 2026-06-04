import LifegamesWidgets
import SwiftUI

/// State variations for `HeartRateView`. Uses the `Kind` discriminator because the view ships
/// a dual init: `init(state: .loading/.empty)` for skeleton/empty chrome and `init(props:)` for
/// data. Decoding the `.skeleton.json` / `.empty.json` fixtures through `init(props:)` would
/// render a populated view with skeleton-shaped data — these states must hit `init(state:)`.
enum HeartRateVariations {
    enum Kind {
        case fixture(String)
        case skeleton
        case empty
    }

    struct State: Identifiable {
        let id: String
        let label: String
        let kind: Kind
    }

    static let states: [State] = [
        .init(id: "default", label: "Default", kind: .fixture("heart-rate")),
        .init(id: "populated-min", label: "Populated (min)", kind: .fixture("heart-rate.populated-min")),
        .init(id: "populated-max", label: "Populated (max)", kind: .fixture("heart-rate.populated-max")),
        .init(id: "bradycardia", label: "Bradycardia", kind: .fixture("heart-rate.bradycardia")),
        .init(id: "resting", label: "Resting", kind: .fixture("heart-rate.resting")),
        .init(id: "normal", label: "Normal", kind: .fixture("heart-rate.normal")),
        .init(id: "fat-burn", label: "Fat Burn", kind: .fixture("heart-rate.fat-burn")),
        .init(id: "cardio", label: "Cardio", kind: .fixture("heart-rate.cardio")),
        .init(id: "peak", label: "Peak", kind: .fixture("heart-rate.peak")),
        .init(id: "max", label: "Max", kind: .fixture("heart-rate.max")),
        .init(id: "skeleton", label: "Skeleton", kind: .skeleton),
        .init(id: "empty", label: "Empty", kind: .empty),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "heart-rate",
            title: "Heart Rate",
            category: .health,
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
        case .skeleton:
            HeartRateView(state: .loading)
        case .empty:
            HeartRateView(state: .empty)
        case let .fixture(name):
            if let data = FixtureLoader.data(category: "health", name: name),
               let props = Adapters.heartRate(fromFixture: data)
            {
                HeartRateView(props: props)
            } else {
                Text("Missing fixture: \(name)")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(.red)
            }
        }
    }
}
