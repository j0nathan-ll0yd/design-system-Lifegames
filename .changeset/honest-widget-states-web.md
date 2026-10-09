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
- `runtime/widget-rules`: one state rule per widget (`heartRateState`, `movementRingsState`, …),
  called by both the templates and `toDashboardViewModels`, so a loader's reported state always
  matches `data-ssr-state`; shared formatters (`formatPositiveVital`, `formatHrv`,
  `formatTempDelta`, `formatWorkoutDuration`, `standHoursFrom`) so server and client render the
  same text. `finalize(props, rule)` in `runtime/view-models`.
- `revealLiveData` returns `false` and writes nothing for a suppressed card unless the caller
  passes `{leaveSuppressed: true}`; `releaseSuppression(card)` and `isSuppressedCard(card)` are
  new. Every updater skips its writes on a suppressed card.
- `safeHttpsUrl` in `runtime/html-utils`.
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
- NightSummary follows the sleep export alone (owner decision Q3): its state and `generatedAt` are
  the sleep export's. The health export lends only the sleep score, and only while it is live; an
  unavailable, stale or score-less health export renders the score as `—` and never takes the card
  down. New in `runtime/widget-rules`: `nightSummaryDomain(sleep, health)` and
  `sleepScoreSource(health, healthState)` (the client path:
  `adaptSleep(sleep, sleepScoreSource(health, healthState))`).
- NightSummary: a sleep export missing REM, deep or core has no total (`sleepDurationFormatted`
  is `''`, rendered as `—`), never a partial sum. `computeTotalSleepSeconds` returns `null` then.
- A paused watch renders no value (the scaffold is value-free) and the paused copy renders only
  while paused.
- The loading state shows no "live" label and a still live dot; its `<noscript>` note is visible.
- A stale card with a missing or invalid `generatedAt` shows no label and no `data-generated-at`.
- HeartRate renders a heart rate of 0 as `—` on server and client. Hydration's empty state shows
  the vessels with `—` and no input value.
- StarredRepoList, DevActivityLog and Workouts render an `href` only for an https URL, on server
  and client.
- A missing value carries no zone colour: HeartRate's BPM, zone badge and HRV render the
  no-reading mark in the default colour.
- A stale card's "as of" time wraps onto its own header line in full; the header never sets
  `overflow: hidden`, so a focused header link's outline is never clipped.
- The `#cardWorkouts[style*='none']` rebalance rules are removed from `layout.css`: Workouts never
  renders hidden.
