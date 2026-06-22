// Scenario data assembly for the static showcase visual harness.
//
// Background
// ----------
// The portfolio is a STATIC Astro build: there is no runtime live-data fetch.
// Each visual-regression scenario is therefore a distinct *build-time* render.
// This module is the single source of per-scenario data, sourced from the
// canonical `@lifegames/fixtures` package (the SAME source the web consumes),
// which eliminates the previously-drifted hand-baked `data/*.json` snapshots.
//
// Two fixture families are used:
//   1. POST-ADAPTER display shapes — `getDashboardFixture(variation)` returns
//      `{ profile, health, github, reading, books, system, starredRepos }`,
//      the exact shape the SSR widgets consume. Only `baseline | empty | full`
//      exist per domain (the normalized triad).
//   2. RAW export shapes — `rawFixtures.theatreReviews[v]` / `rawFixtures.focus[v]`,
//      consumed by the runtime updaters (`updateTheatreReviews`,
//      `updateFocusOverlay`) for the two widgets that SSR only a skeleton.
//
// Widget variations (Stage 2)
// ---------------------------
// Domain-specific widget variations (hr-bradycardia, hydration-zero, sleep-*,
// etc.) exist ONLY in the raw fixture family as LP-export shapes. They have NO
// post-adapter equivalent, and the rich DashboardHealth/DashboardBooks/etc.
// display shapes the widgets consume CANNOT be reconstructed from raw export
// data (they carry ranges/goals/solar/derived/sampleWorkouts/hydration that the
// runtime adapters do not produce — see packages/fixtures/src/post-adapter/health.ts).
//
// Therefore widget variations are composed here as targeted overrides of the
// post-adapter `baseline` display shape: clone baseline, then mutate ONLY the
// field(s) the variation is meant to exercise. This is the clean, deterministic
// approach and preserves full coverage. The kept-vs-dropped audit lives in
// tests/visual/fixtures.ts.
import { getDashboardFixture, type DashboardFixture } from '@lifegames/fixtures';
import { rawFixtures } from '@lifegames/fixtures/raw';
import type { TheatreReviewsExport, FocusExport } from '@lifegames/portal-contract/schemas';

export interface ScenarioData {
  dashboard: DashboardFixture;
  theatre: TheatreReviewsExport;
  /** Raw focus export, set only for the focus/dnd overlay scenarios. */
  focus: FocusExport | null;
}

// Structured-clone helper (avoids cross-scenario mutation of the shared
// post-adapter singletons). structuredClone is available in Node 18+ / the
// Astro build runtime.
function clone<T>(value: T): T {
  return structuredClone(value);
}

// ---------------------------------------------------------------------------
// Dashboard triad scenarios
// ---------------------------------------------------------------------------
// Map showcase scenario name → post-adapter variation. The showcase keeps three
// dashboard scenarios; only the WEB consumer dropped `complex`.
const DASHBOARD_VARIATION: Record<string, 'baseline' | 'empty' | 'full'> = {
  populated: 'baseline',
  empty: 'empty',
  complex: 'full',
};

// The post-adapter `empty` health shape is a RAW-ish minimal shape (quantities:
// {}, no hydration/ranges/goals/solar/derived) authored for the web's RUNTIME
// interception model — the web SSRs the `baseline` shell and only ever surfaces
// `empty` AFTER its updaters swap content. Our static showcase SSRs the empty
// scenario directly, and the rich health widgets (HeartRate/Hydration/
// NightSummary) dereference baseline structural fields. So for the empty
// dashboard we derive a structurally-complete-but-zeroed health shape from
// baseline: same object skeleton, metric VALUES zeroed. This is what an empty
// dashboard renders as in production (zeros, dashes, 0% rings) rather than a
// crash. Books/github/reading still use their true post-adapter `empty`.
function zeroedHealthFromBaseline(): DashboardFixture['health'] {
  const h = clone(getDashboardFixture('baseline').health);
  for (const key of Object.keys(h.quantities)) {
    const q = h.quantities[key as keyof typeof h.quantities] as
      | { value: number; unit: string }
      | undefined;
    if (q) q.value = 0;
  }
  h.sleep = {
    awake: { seconds: 0 },
    core: { seconds: 0 },
    deep: { seconds: 0 },
    rem: { seconds: 0 },
  };
  h.workouts = [];
  if (h.sampleWorkouts) h.sampleWorkouts = [];
  h.sleepScore = 0;
  h.sleepDurationFormatted = '0h 0m';
  if (h.sleepPhaseFormatted) {
    h.sleepPhaseFormatted = { deep: '0h 0m', rem: '0h 0m', core: '0h 0m', awake: '0h 0m' };
  }
  if (h.derived) {
    h.derived = { ...h.derived, totalCalories: 0, deepPct: 0, remPct: 0, corePct: 0 };
  }
  if (h.hydration) {
    h.hydration = { ...h.hydration, waterOz: 0, caffeineMg: 0 };
  }
  return h;
}

// ---------------------------------------------------------------------------
// Widget-variation composers: each takes the baseline DashboardFixture (already
// cloned) and mutates one domain.
// ---------------------------------------------------------------------------
type Composer = (d: DashboardFixture) => void;

// Heart Rate — override displayed BPM + resting HR + HRV.
function hrOverride(bpm: number, resting: number, hrv: number): Composer {
  return (d) => {
    d.health.quantities.heartRate = { value: bpm, unit: 'count/min' };
    d.health.quantities.restingHeartRate = { value: resting, unit: 'count/min' };
    d.health.quantities.hrvSDNN = { value: hrv, unit: 'ms' };
  };
}

// Hydration — override the hydration display block (waterOz / caffeineMg).
function hydrationOverride(waterOz: number, caffeineMg: number): Composer {
  return (d) => {
    if (d.health.hydration) {
      d.health.hydration.waterOz = waterOz;
      d.health.hydration.caffeineMg = caffeineMg;
    }
  };
}

// Sleep — override sleepScore + formatted phases + derived percentages.
function sleepOverride(opts: {
  score: number;
  phases: { deep: string; rem: string; core: string; awake: string };
  pcts: { deepPct: number; remPct: number; corePct: number };
  durationFormatted: string;
}): Composer {
  return (d) => {
    d.health.sleepScore = opts.score;
    d.health.sleepPhaseFormatted = opts.phases;
    d.health.sleepDurationFormatted = opts.durationFormatted;
    if (d.health.derived) {
      d.health.derived.deepPct = opts.pcts.deepPct;
      d.health.derived.remPct = opts.pcts.remPct;
      d.health.derived.corePct = opts.pcts.corePct;
    }
  };
}

// Workouts — override the workouts list (Workouts widget reads health.workouts).
function workoutsOverride(
  workouts: Array<{
    activity_type: string;
    duration: number;
    energy_burned: number;
    distance: number;
  }>,
): Composer {
  return (d) => {
    d.health.workouts = workouts;
  };
}

// Books — set every book's status (all-reading / all-completed).
function booksStatusOverride(status: 'reading' | 'finished'): Composer {
  return (d) => {
    d.books.books = d.books.books.map((b) => ({
      ...b,
      status,
      ...(status === 'finished'
        ? { progress: 100, finishedAt: b.finishedAt ?? '2024-06-01T00:00:00Z' }
        : { progress: b.progress > 0 && b.progress < 100 ? b.progress : 42 }),
    }));
  };
}

// Dev Activity Log — filter the activity feed to a single event family.
function githubActivityFilter(predicate: (type: string) => boolean): Composer {
  return (d) => {
    d.github.devActivity = d.github.devActivity.filter((e) => predicate(e.type));
  };
}

// The widget-variation registry. Each entry clones baseline then applies its
// composer. Documented kept/dropped audit is in tests/visual/fixtures.ts.
const WIDGET_VARIATION: Record<string, Composer> = {
  // Heart Rate
  'hr-bradycardia': hrOverride(48, 46, 70),
  'hr-peak': hrOverride(178, 58, 28),
  'hr-resting': hrOverride(58, 52, 62),

  // Hydration
  'hydration-zero': hydrationOverride(0, 0),
  'hydration-max': hydrationOverride(140, 480),

  // Night Summary (sleep)
  'sleep-deep-dominant': sleepOverride({
    score: 88,
    phases: { deep: '2h 30m', rem: '0h 45m', core: '3h 30m', awake: '15m' },
    pcts: { deepPct: 37.5, remPct: 11.3, corePct: 51.2 },
    durationFormatted: '6h 45m',
  }),
  'sleep-rem-dominant': sleepOverride({
    score: 90,
    phases: { deep: '0h 35m', rem: '2h 40m', core: '3h 30m', awake: '15m' },
    pcts: { deepPct: 8.6, remPct: 39.5, corePct: 51.9 },
    durationFormatted: '6h 45m',
  }),
  'sleep-short': sleepOverride({
    score: 54,
    phases: { deep: '0h 20m', rem: '0h 30m', core: '2h 10m', awake: '10m' },
    pcts: { deepPct: 11.1, remPct: 16.7, corePct: 72.2 },
    durationFormatted: '3h 0m',
  }),

  // Bookshelf
  'books-all-reading': booksStatusOverride('reading'),
  'books-all-completed': booksStatusOverride('finished'),

  // Dev Activity Log (github)
  'github-commits-only': githubActivityFilter((t) => t === 'commit'),
  'github-prs-only': githubActivityFilter((t) => t.startsWith('pr_') || t === 'pull_request'),

  // Workouts
  'workouts-multi': workoutsOverride([
    { activity_type: 'Running', duration: 3600, energy_burned: 680, distance: 10500 },
    { activity_type: 'Cycling', duration: 5400, energy_burned: 520, distance: 25000 },
    { activity_type: 'Swimming', duration: 2400, energy_burned: 420, distance: 1800 },
  ]),
  'workouts-barrys': workoutsOverride([
    {
      activity_type: 'Functional Strength Training',
      duration: 3300,
      energy_burned: 540,
      distance: 0,
    },
  ]),
};

// Theatre variations exist natively in the raw family (the TheatreReviews widget
// is runtime-populated from a raw export). Map scenario → raw variation key.
const THEATRE_VARIATION: Record<string, keyof typeof rawFixtures.theatreReviews> = {
  'theatre-all-grades': 'allGrades',
  'theatre-no-images': 'noImages',
};

// Focus overlay variations are raw-only (FocusExport scalar). Map scenario → key.
const FOCUS_VARIATION: Record<string, keyof typeof rawFixtures.focus> = {
  'focus-work': 'baseline', // currentFocus: 'Work'
  'focus-dnd': 'dnd', // currentFocus: 'Do Not Disturb'
};

/** Every scenario name the static showcase renders. */
export const SCENARIOS: string[] = [
  ...Object.keys(DASHBOARD_VARIATION),
  ...Object.keys(WIDGET_VARIATION),
  ...Object.keys(THEATRE_VARIATION),
  ...Object.keys(FOCUS_VARIATION),
];

/**
 * Assemble the full data payload for one scenario. Defaults the dashboard to
 * the baseline display shape, then layers the scenario-specific override.
 */
export function getScenarioData(scenario: string): ScenarioData {
  // Dashboard triad (whole-page variations).
  if (scenario in DASHBOARD_VARIATION) {
    const variation = DASHBOARD_VARIATION[scenario];
    const theatreKey =
      variation === 'empty' ? 'empty' : variation === 'full' ? 'maxReviews' : 'baseline';
    const dashboard = getDashboardFixture(variation);
    // Empty health uses the structurally-complete, zeroed shape (see note above)
    // so the rich SSR health widgets render an empty state instead of crashing.
    if (variation === 'empty') {
      dashboard.health = zeroedHealthFromBaseline();
    }
    return {
      dashboard,
      theatre: clone(rawFixtures.theatreReviews[theatreKey]),
      focus: null,
    };
  }

  // Single-domain widget variations: baseline + one override.
  if (scenario in WIDGET_VARIATION) {
    const dashboard = clone(getDashboardFixture('baseline'));
    WIDGET_VARIATION[scenario](dashboard);
    return {
      dashboard,
      theatre: clone(rawFixtures.theatreReviews.baseline),
      focus: null,
    };
  }

  // Theatre variations: baseline dashboard + raw theatre variation.
  if (scenario in THEATRE_VARIATION) {
    return {
      dashboard: getDashboardFixture('baseline'),
      theatre: clone(rawFixtures.theatreReviews[THEATRE_VARIATION[scenario]]),
      focus: null,
    };
  }

  // Focus/DND overlays: baseline dashboard + raw focus variation.
  if (scenario in FOCUS_VARIATION) {
    return {
      dashboard: getDashboardFixture('baseline'),
      theatre: clone(rawFixtures.theatreReviews.baseline),
      focus: clone(rawFixtures.focus[FOCUS_VARIATION[scenario]]),
    };
  }

  throw new Error(`Unknown scenario: ${scenario}`);
}
