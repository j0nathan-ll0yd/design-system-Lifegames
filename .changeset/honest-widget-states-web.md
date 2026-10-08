---
'@j0nathan-ll0yd/web': major
---

Honest widget states and measured-versus-missing adapters (atlas decision 0160, Phase 1).

**Breaking (why this is a major).** `adaptHealth` and `adaptSleep` no longer turn a missing
measurement into `0`. These public output types widen from `number` to `number | null`:
`AdaptedHealth.hydration.waterOz`, `.hydration.caffeineMg`, `.derived.totalCalories`,
`.derived.deepPct`, `.derived.remPct`, `.derived.corePct`, `.sleepScore`, `AdaptedSleep.sleepScore`,
`AdaptedSleep.derived.*` and `AdaptedSleep.phases.*`; `SleepPhases` fields and `formatPhase`'s input
in `runtime/sleep` widen the same way. `quantities.exerciseTime` is absent when the export omits it.
A missing sleep phase formats as `''` (no reading), and the phase shares are null unless the export
carried deep, REM and core. A TypeScript
reader of these fields must handle `null`. No compatible signature exists: keeping `number` keeps the
fabricated zero. Known consumer impact: `j0nathan-ll0yd.github.io` passes adapter output straight to
the design-system updaters and reads none of these fields (`src/lib/runtime/live-data.ts`).

**Additive.** Every widget call signature from 3.x still compiles and renders as before:

- Each live widget takes optional `state` (`live`, `stale`, `empty`, `unavailable`, `suppressed`,
  `loading`) and `generatedAt` props; the pure mapper `resolveWidgetState` serves old calls. Card roots
  carry `data-ssr-state` and `data-generated-at`; `stale` shows an absolute "as of" time.
- New runtime modules: `runtime/widget-state`, `runtime/view-models` (`toDashboardViewModels`,
  `composeSystemLines`, `toWorkoutsList`, `toReadingArticles`). State strings come from the
  `widgets.widgetState` copy keys (`@j0nathan-ll0yd/copy` minor).
- `revealLiveData(card, state?)` in `runtime/updater-empty`: removes notices, reveals the hidden
  scaffold, restores the header's live label and records `live` or `empty`. `renderWidgetEmpty`
  records `empty`. `theatreCardsHtml` in `runtime/updaters-theatre`.
- `updateSystemStatus(timestamps, now?)` and `formatRelativeTime(iso, now?)` take an optional clock.
- Adapted events, articles and starred repos carry `datetime` (ISO) beside their relative label.

**Behavior changes consumers see.**

- Workouts renders visible by default.
- Hydration renders its values in server markup; `initHydration` keeps them; the
  `data-hydration-fixture` carrier holds only hydration fields, only in `live` and `stale`.
- Bookshelf no longer reads `node:fs`, `node:path` or `process.cwd()`. Pass `localCovers` (the
  same-origin cover paths the site mirrors) to keep same-origin covers; otherwise covers load from the
  contract URL with the W6 fallback.
- TheatreReviews renders review cards from props; a review URL that is not `https:` renders no
  `href`.
- DevActivityLog renders no `+0 -0` for a commit whose export lacks line counts
  (`additions`/`deletions` are optional in `DevActivityLogProps`).
- FocusOverlay and DndOverlay take `currentFocus` and `now`; DndOverlay's five sample rows are gone.
- MovementRings invents no sunrise, sunset or sun position when `solar` is absent.
- SystemStatus never renders the retired Location row, in any mode.
- Every date renders in `America/Los_Angeles`.
