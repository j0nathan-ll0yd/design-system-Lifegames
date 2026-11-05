import Foundation
import LifegamesComponentsCore
@testable import LifegamesWidgets

extension WidgetFixtureCatalogTests {
    static var coffeeRows: [FixtureCatalogRow] {
        [
            // Data-only fixture pool for coffee-tracking previews (S98). Direct Codable decode
            // into CoffeeTrackingProps; packages/schemas/authored/coffee-tracking.schema.json
            // mirrors its wire shape, so a drift on either side fails here or in validate.ts.
            .row(CoffeeTrackingProps.self, category: "coffee", name: "coffee-tracking.connected-drinking"),
            .row(CoffeeTrackingProps.self, category: "coffee", name: "coffee-tracking.connected-finished"),
            .row(CoffeeTrackingProps.self, category: "coffee", name: "coffee-tracking.connected-fresh"),
            .row(CoffeeTrackingProps.self, category: "coffee", name: "coffee-tracking.connected-idle"),
            .row(CoffeeTrackingProps.self, category: "coffee", name: "coffee-tracking.connected-sipping"),
            .row(CoffeeTrackingProps.self, category: "coffee", name: "coffee-tracking.error"),
            .row(CoffeeTrackingProps.self, category: "coffee", name: "coffee-tracking.full-overflow"),
            .row(CoffeeTrackingProps.self, category: "coffee", name: "coffee-tracking.searching"),
            .row(CoffeeTrackingProps.self, category: "coffee", name: "coffee-tracking.unpaired"),
        ]
    }
}
