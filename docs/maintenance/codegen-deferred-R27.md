# RESOLVED: WidgetModels Swift Codegen (R27)

**Status:** RESOLVED (2026-06-06)

## Problem (was)

`packages/schemas/swift/WidgetModels.swift` (the canonical codegen output) contained
duplicate top-level struct names (e.g., `Article`, `Book`, `Goals`, `Quantity`, `Solar`)
because multiple JSON schemas share these type names. When that file was copied verbatim
into `Sources/LifegamesSchemas/WidgetModels.swift` (a compiled SPM module), the Swift
compiler raised type-ambiguity errors and the build failed.

## Resolution

Updated `packages/schemas/scripts/codegen.ts` aggregation step to detect and resolve
type-name collisions automatically during Swift code generation:

- **Identical duplicates** (same struct body across schemas) are deduplicated — the first
  occurrence is kept and subsequent identical definitions are dropped. This applies to
  `Goals`, `Quantity`, and `Solar` which are shared between `HealthExport` and
  `DashboardHealth` (the latter is an overlay-merged superset of the former).

- **Different duplicates** (same name, different struct body) are prefixed with the parent
  schema name. Examples:
  - `Article` (DashboardReading) → `DashboardReadingArticle`
  - `Book` (DashboardBooks) → `DashboardBooksBook`
  - `Workout` (DashboardHealth) → `DashboardHealthWorkout`
  - `Stats` (DashboardGithub/DashboardReading/DashboardBooks) → `DashboardGithubStats` stays as `Stats` (first occurrence), others become `DashboardReadingStats`, `DashboardBooksStats`

The codegen output is now byte-identical-safe: `packages/schemas/swift/WidgetModels.swift`
can be copied directly to `Sources/LifegamesSchemas/WidgetModels.swift` and compiles as
an SPM module without ambiguity.

`scripts/check-freshness.sh` has been restored to perform a real diff (was previously
stubbed to exit 0).
