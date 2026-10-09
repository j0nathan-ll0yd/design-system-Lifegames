---
'@j0nathan-ll0yd/schemas': minor
---

Widget schemas accept the honest widget states (atlas decision 0160).

The live widget schemas gain optional `state` and `generatedAt` properties, and their data property is
no longer required, so an `unavailable` or `suppressed` fixture carries no data envelope.
`health.quantities.heartRate` and `hrvSDNN` are optional in `heart-rate`; nullable measurements are
nullable in `hydration`, `night-summary` and `workouts`. `focus-overlay` and `dnd-overlay` now
generate from their TS Props (`currentFocus`, `now`). These changes loosen validation.

**Scoped correction: some widget-schema input that validated before now fails.** GOVERNANCE.md §6.2
classes a breaking schema type change as major. The owner chose minor on 2026-10-08, because the narrowing corrects each schema to the TypeScript Props type it always claimed
to describe, and no consumer outside this repository validates a widget schema. What now fails, each
measured with Ajv against the schemas at `17d203b` (the merge base) and at this change:

- **`heart-rate`, `health.watch`.** The generator now compiles widget types under the web package's
  tsconfig. Under this package's NodeNext config, extensionless relative imports in widget types
  never resolved, so `health.watch` was `{}` and accepted any value. It is now an object with
  required `worn` (boolean) and `source` (`charging` or `hrGap`), optional `since` (string or null),
  or null. `watch: {}`, `watch: {worn: "yes"}`, `watch: {source: "anything"}`, `watch: 42` and
  `watch: "x"` validated at `17d203b` and fail now. This is the only property any widget schema at
  `17d203b` typed `{}`.
- **A newly declared optional property with a value of the wrong type.** Draft-07 objects are open, so
  at `17d203b` an undeclared key passed with any value. These keys are now declared, so a value
  outside the declared type fails: `state` (one of `live`, `stale`, `empty`, `unavailable`,
  `suppressed`, `loading`, or null) and `generatedAt` (string or null) in `bookshelf`,
  `dev-activity-log`, `heart-rate`, `hydration`, `movement-rings`, `night-summary`, `reading-feed`,
  `starred-repo-list`, `theatre-reviews` and `workouts`; `bookshelf.localCovers` (string array or
  null); `dev-activity-log.events[].datetime` (string); `reading-feed.reading.articles[].datetime`
  and `starred-repo-list.repos[].datetime` (string or null); `night-summary.health.isEmpty`
  (boolean or null); `system-status.system.lines[].source` and `keyClass` (string or null);
  `workouts.health.workouts[].link` (string or null); `currentFocus` (string or null) and `now`
  (string or null) in `focus-overlay` and `dnd-overlay`.

No other required property was added, and every other type change widens (number to number or null).

**Consumer evidence, searched 2026-10-09:**

- This repository: all 306 `ds`-bucket fixtures in `fixture-map.json` validate against the widget
  schemas. The `consumer` bucket, which site and iOS validation reads through
  `LIFEGAMES_VALIDATE_CWD`, maps 7 fixtures, all to export or dashboard schemas, none to a widget
  schema.
- `j0nathan-ll0yd.github.io` (`main` at `7b4c8b72`): depends on `@j0nathan-ll0yd/schemas` `^2.1.0`.
  Its only readers, `scripts/generate-contract-lock.mjs` and `scripts/check-contract-lock.mjs`,
  hash the top level of `generated/` without recursing, so no `generated/widgets/` file; its
  `.contract-lock.json` lists 22 files, none a widget schema. No file under `src`, `scripts` or
  `tests` imports Ajv.
- `ios-LifegamesPortal` (`main` at `fcbb857`): no dependency on the package; its contract scripts
  lock the portal-contract export schemas only.
- `mantle-LifegamesPortal` (`main` at `d9e1285`) and `agent-enforcement` (`main` at `f4682f0`): no
  reference.
- `atlas` (`main` at `f97c9fdc`): `scripts/__tests__/component-matrix.test.mjs` resolves
  `generated/widgets/*.schema.json` paths for existence only; it validates nothing.
- GitHub code search over the `j0nathan-ll0yd` owner for `generated/widgets` and
  `heart-rate.schema.json`: hits in this repository and the atlas test above only.

**Limit:** the package is public on GitHub Packages, which publishes no dependents list, and code
search covers default branches only. A consumer outside the `j0nathan-ll0yd` owner cannot be
enumerated. Such a consumer that validates widget fixtures against these schemas must correct any
fixture that holds a value the list above names.

`fixture-map.json` wires the 20 new state fixtures.
