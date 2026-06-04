import LifegamesWidgets
import SwiftUI

/// State variations for `TheatreReviewsView`. Uses the `Kind` discriminator because the view ships
/// a dual init: `init(state: .loading/.empty)` for skeleton/empty chrome and `init(props:)` for
/// data. Wire shape maps `rating` → `grade`, `imageUrl` → `posterUrl`, `totalReviews` → `totalCount`;
/// `Adapters.theatreReviews(fromFixture:)` handles these renames.
enum TheatreReviewsVariations {
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
        .init(id: "default", label: "Default", kind: .fixture("theatre-reviews")),
        .init(id: "populated-min", label: "Populated (min)", kind: .fixture("theatre-reviews.populated-min")),
        .init(id: "populated-max", label: "Populated (max)", kind: .fixture("theatre-reviews.populated-max")),
        .init(id: "mixed-ratings", label: "Mixed Ratings", kind: .fixture("theatre-reviews.mixed-ratings")),
        .init(id: "regional-tour", label: "Regional Tour", kind: .fixture("theatre-reviews.regional-tour")),
        .init(id: "single-show", label: "Single Show", kind: .fixture("theatre-reviews.single-show")),
        .init(id: "subscription-season", label: "Subscription Season", kind: .fixture("theatre-reviews.subscription-season")),
        .init(id: "west-end-season", label: "West End Season", kind: .fixture("theatre-reviews.west-end-season")),
        .init(id: "skeleton", label: "Skeleton", kind: .skeleton),
        .init(id: "empty", label: "Empty", kind: .empty),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "theatre-reviews",
            title: "Theatre Reviews",
            category: .reading,
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
            TheatreReviewsView(state: .loading)
        case .empty:
            TheatreReviewsView(state: .empty)
        case let .fixture(name):
            if let data = FixtureLoader.data(category: "reading", name: name),
               let props = Adapters.theatreReviews(fromFixture: data)
            {
                TheatreReviewsView(props: props)
            } else {
                Text("Missing fixture: \(name)")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(.red)
            }
        }
    }
}
