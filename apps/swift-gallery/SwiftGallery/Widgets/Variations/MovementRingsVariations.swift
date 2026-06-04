import LifegamesWidgets
import SwiftUI

/// State variations for `MovementRingsView`.
///
/// Per plan open-question resolution (option b): MovementRingsProps is not Codable and the
/// fixture wire format requires a complex adapter that does not yet exist. This entry uses a
/// single hand-coded default state inline.
///
/// TODO(follow-up): Replace inline Props with fixture loading once a `movementRings(fromFixture:)`
/// adapter is implemented; the fixture glob `health/movement-rings*.json` is ready on disk but the
/// wire shape decomposition (rings, goals, solar) hasn't been authored yet.
enum MovementRingsVariations {
    static var entry: WidgetEntry {
        WidgetEntry(
            id: "movement-rings",
            title: "Movement Rings",
            category: .health,
            states: [
                VariationState(id: "default", label: "Default") {
                    AnyView(MovementRingsView(props: MovementRingsProps(
                        moveKcal: 380,
                        exerciseMin: 32,
                        standHr: 9,
                        steps: 8421,
                        distanceMeters: 6200,
                        flights: 14,
                        daylightMin: 48,
                        goals: MovementRingsProps.Goals(),
                        solar: MovementRingsProps.Solar(
                            sunriseHHmm: "06:30",
                            sunsetHHmm: "20:15",
                            currentProgressPct: 60
                        )
                    )))
                },
            ]
        )
    }
}
