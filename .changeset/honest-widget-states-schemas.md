---
'@j0nathan-ll0yd/schemas': minor
---

Widget schemas accept the honest widget states (atlas decision 0160).

The live widget schemas gain optional `state` and `generatedAt` properties, and their data property is
no longer required, so an `unavailable` or `suppressed` fixture carries no data envelope.
`health.quantities.heartRate` and `hrvSDNN` are optional in `heart-rate`; nullable measurements are
nullable in `hydration`, `night-summary` and `workouts`. `focus-overlay` and `dnd-overlay` now
generate from their TS Props (`currentFocus`, `now`). Every change loosens validation; every
previously valid fixture stays valid.

The generator now compiles widget types under the web package's tsconfig. Under this package's
NodeNext config, extensionless relative imports in widget types never resolved: `health.watch`
was typed `{}`. It is now the real watch shape. `fixture-map.json` wires the 20 new state fixtures.
