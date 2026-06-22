// Scenario → static-page-path map for the static showcase visual harness.
//
// ARCHITECTURE (re-architected: static build-time scenarios)
// ----------------------------------------------------------
// The portfolio is a STATIC Astro build with no runtime live-data fetch. Each
// scenario is a distinct pre-rendered page, built from the canonical
// `@lifegames/fixtures` source via `src/lib/scenario-data.ts`. The harness
// navigates to the page; there is NO CloudFront/WebSocket route interception
// (the previous runtime-driven model that copied the web app's harness, which
// hung 88/144 tests waiting for hydration that never happens on a static site).
//
// Page layout:
//   - `populated` → `/`            (default baseline showcase)
//   - all others  → `/scenarios/<name>/`
//
// Scenario data composition lives in `src/lib/scenario-data.ts`. The lists below
// MUST stay in sync with the `SCENARIOS` exported there (the route's
// getStaticPaths source of truth).

// --- Dashboard triad (whole-page scenarios) ---
// populated→baseline, empty→zeroed-baseline, complex→full. The showcase keeps
// all three; only the WEB consumer dropped `complex`.
const DASHBOARD_SCENARIOS = ['populated', 'empty', 'complex'] as const;

// --- Widget variations ---
//
// COVERAGE AUDIT (kept vs dropped) — REQUIRED by the re-architecture brief.
//
// Widget variations override a single domain. In the OLD runtime model these
// came from raw per-domain fixtures (health/bradycardia.json etc.) injected via
// CloudFront interception. On a STATIC build there is nothing to intercept, and
// the rich SSR display shapes (DashboardHealth/DashboardBooks/DashboardGithub)
// the widgets consume CANNOT be reconstructed from the raw LP-export fixtures —
// they carry ranges/goals/solar/derived/sampleWorkouts/hydration that no runtime
// adapter produces (see packages/fixtures/src/post-adapter/health.ts). The
// `post-adapter` family only ships the {baseline,empty,full} triad per domain,
// NOT per-widget variations, so the entangled "run a raw variation through its
// post-adapter" path the brief floated does not exist as a function.
//
// RESOLUTION: each widget variation is composed in scenario-data.ts as a targeted
// override of the post-adapter `baseline` DISPLAY shape (clone baseline, mutate
// only the field the variation exercises). This is clean and deterministic.
//
// KEPT (composed via display-shape override):
//   HeartRate:    hr-bradycardia, hr-peak, hr-resting        (override heartRate/restingHeartRate/hrvSDNN)
//   Hydration:    hydration-zero, hydration-max              (override health.hydration.waterOz/caffeineMg)
//   NightSummary: sleep-deep-dominant, sleep-rem-dominant, sleep-short
//                                                            (override sleepScore/sleepPhaseFormatted/derived pcts)
//   Bookshelf:    books-all-reading, books-all-completed     (override every book status)
//   DevActivityLog: github-commits-only, github-prs-only     (filter devActivity by event type)
//   Workouts:     workouts-multi, workouts-barrys            (override health.workouts list)
//   TheatreReviews: theatre-all-grades, theatre-no-images    (native raw variation via runtime updater)
//   Overlays:     focus-work, focus-dnd                      (native raw FocusExport via runtime updater)
//
// DROPPED (vs the OLD runtime fixture set) — with reasons:
//   books-no-covers — DROPPED. The OLD variation relied on book asins whose
//     covers fall back to external Amazon image URLs (unreachable under
//     Playwright). On a static build with no network, this renders identically
//     to any other books scenario except for broken-image placeholders that are
//     not a meaningful, intentional widget state to baseline. The genuine
//     no-cover rendering path is exercised indirectly by every books scenario
//     (the baseline post-adapter book asins already lack local webp and fall
//     back), so a dedicated `books-no-covers` adds no deterministic signal.
//   hr-fatburn / hr-normal / hrv-{green,amber,red} — NOT PORTED. The OLD set
//     only screenshotted bradycardia/peak/resting for HeartRate; the additional
//     raw HR/HRV variations were never in the portfolio widgets.spec.ts, so
//     there is no coverage regression.
//   sleep variations beyond the three above, github beyond commits/prs, workouts
//     beyond multi/barrys, theatre beyond all-grades/no-images — match the OLD
//     portfolio widgets.spec.ts exactly; nothing dropped relative to it.
const WIDGET_VARIATION_SCENARIOS = [
  'hr-bradycardia',
  'hr-peak',
  'hr-resting',
  'hydration-zero',
  'hydration-max',
  'sleep-deep-dominant',
  'sleep-rem-dominant',
  'sleep-short',
  'books-all-reading',
  'books-all-completed',
  'github-commits-only',
  'github-prs-only',
  'workouts-multi',
  'workouts-barrys',
  'theatre-all-grades',
  'theatre-no-images',
] as const;

// --- Overlay scenarios (focus / DnD) ---
const OVERLAY_SCENARIOS = ['focus-work', 'focus-dnd'] as const;

export type DashboardScenario = (typeof DASHBOARD_SCENARIOS)[number];
export type ScenarioName =
  | (typeof DASHBOARD_SCENARIOS)[number]
  | (typeof WIDGET_VARIATION_SCENARIOS)[number]
  | (typeof OVERLAY_SCENARIOS)[number];

/** Every scenario the harness can navigate to. */
export const ALL_SCENARIOS: ScenarioName[] = [
  ...DASHBOARD_SCENARIOS,
  ...WIDGET_VARIATION_SCENARIOS,
  ...OVERLAY_SCENARIOS,
];

/**
 * Resolve a scenario name to its static page path.
 * `populated` is the default showcase at `/`; everything else is a
 * getStaticPaths-generated page under `/scenarios/<name>`. NOTE: the Astro
 * config sets `trailingSlash: 'never'`, so scenario URLs must NOT carry a
 * trailing slash (a trailing slash 404s under `astro preview`).
 */
export function scenarioPath(scenario: ScenarioName): string {
  return scenario === 'populated' ? '/' : `/scenarios/${scenario}`;
}
