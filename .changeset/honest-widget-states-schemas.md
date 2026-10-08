---
'@j0nathan-ll0yd/schemas': minor
---

Widget schemas accept the honest widget states (atlas decision 0160).

The live widget schemas gain optional `state` and `generatedAt` properties, and their data property is
no longer required, so an `unavailable` or `suppressed` fixture carries no data envelope.
`health.quantities.heartRate` and `hrvSDNN` are optional in `heart-rate`; nullable measurements are
nullable in `hydration`, `night-summary` and `workouts`. `focus-overlay` and `dnd-overlay` now
generate from their TS Props (`currentFocus`, `now`). These changes loosen validation.

**One correction tightens validation.** The generator now compiles widget types under the web
package's tsconfig. Under this package's NodeNext config, extensionless relative imports in widget
types never resolved, so `health.watch` in `heart-rate` (and every other imported type) was typed
`{}` and accepted any value. It is now the real watch shape: an object with required `worn` and
`source`, `source` one of `charging` or `hrGap`. A fixture with a malformed `watch` that passed
before now fails. Evidence that no consumer breaks: every fixture this repo validates (306, via
`fixture-map.json`) passes, and the `consumer` bucket that site and iOS validation reads
(`LIFEGAMES_VALIDATE_CWD`) maps only export schemas, no widget schema. This stays a minor because
it corrects the schema to the type it always claimed to describe; flag it if a consumer validates
widget fixtures outside `fixture-map.json`.

`fixture-map.json` wires the 20 new state fixtures.
