---
'@j0nathan-ll0yd/schemas': minor
---

Add the `CoffeeTracking` schema and validate the nine coffee fixtures.

- New `authored/coffee-tracking.schema.json`. It is the wire shape of `CoffeeTrackingProps` (`Sources/LifegamesComponentsCore/Coffee/CoffeeTrackingProps.swift`): 14 stored properties, 12 required, `errorMessage` and `batteryPercent` optional and nullable, closed enums for `connection` and `beverage`, `additionalProperties: false`.
- `fixture-map.json` maps the nine `coffee/coffee-tracking.*.json` fixtures to it. The validator now checks 315 fixtures, up from 306.
- New export: the `CoffeeTracking` type from `dist/types/index.ts`. Its enums are reachable as `CoffeeTracking['connection']` and `CoffeeTracking['beverage']`. `swift/WidgetModels.swift` gains internal Codable types for the same shape.

Minor because every change is additive: no existing type, schema or map entry changes. The generator now also fails on any widget fixture that no schema maps. The generator is not in the published files, so that part ships nothing.
