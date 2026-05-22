import path from 'path';

const GENERATED = path.join(import.meta.dirname, '..', '..', 'test', 'fixtures', 'generated');

export type FixtureSet = Record<string, string>;

function fixture(dir: string, file: string): string {
  return path.join(GENERATED, dir, `${file}.json`);
}

const BASELINE: FixtureSet = {
  '/health.json': fixture('health', 'baseline'),
  '/sleep.json': fixture('sleep', 'baseline'),
  '/workouts.json': fixture('workouts', 'baseline'),
  '/books.json': fixture('books', 'baseline'),
  '/github-starred-repos.json': fixture('github-starred-repos', 'baseline'),
  '/github-events.json': fixture('github-events', 'baseline'),
  '/articles.json': fixture('articles', 'baseline'),
  '/location.json': fixture('location', 'baseline'),
  '/focus.json': fixture('focus', 'no-focus'),
  '/theatre-reviews.json': fixture('theatre-reviews', 'baseline'),
};

const DASHBOARD_SCENARIOS: Record<string, FixtureSet> = {
  populated: { ...BASELINE },

  empty: {
    ...BASELINE,
    '/health.json': fixture('health', 'missing-optional'),
    '/sleep.json': fixture('sleep', 'empty'),
    '/workouts.json': fixture('workouts', 'empty'),
    '/books.json': fixture('books', 'empty'),
    '/github-events.json': fixture('github-events', 'empty'),
    '/articles.json': fixture('articles', 'empty'),
    '/location.json': fixture('location', 'empty-top-places'),
    '/theatre-reviews.json': fixture('theatre-reviews', 'empty'),
  },

  complex: {
    ...BASELINE,
    '/health.json': fixture('health', 'max-hydration'),
    '/sleep.json': fixture('sleep', 'long-sleep'),
    '/workouts.json': fixture('workouts', 'multi-workout'),
    '/books.json': fixture('books', 'six-books'),
    '/github-events.json': fixture('github-events', 'over-ten'),
    '/articles.json': fixture('articles', 'over-thirty'),
    '/location.json': fixture('location', 'full90-days'),
    '/theatre-reviews.json': fixture('theatre-reviews', 'max-reviews'),
  },
};

const WIDGET_VARIATION_SCENARIOS: Record<string, FixtureSet> = {
  'hr-bradycardia': { ...BASELINE, '/health.json': fixture('health', 'bradycardia') },
  'hr-peak': { ...BASELINE, '/health.json': fixture('health', 'peak') },
  'hr-resting': { ...BASELINE, '/health.json': fixture('health', 'resting') },

  'hydration-zero': { ...BASELINE, '/health.json': fixture('health', 'zero-hydration') },
  'hydration-max': { ...BASELINE, '/health.json': fixture('health', 'max-hydration') },

  'sleep-deep-dominant': { ...BASELINE, '/sleep.json': fixture('sleep', 'deep-dominant') },
  'sleep-rem-dominant': { ...BASELINE, '/sleep.json': fixture('sleep', 'rem-dominant') },
  'sleep-short': { ...BASELINE, '/sleep.json': fixture('sleep', 'short-sleep') },

  'books-all-reading': { ...BASELINE, '/books.json': fixture('books', 'all-reading') },
  'books-all-completed': { ...BASELINE, '/books.json': fixture('books', 'all-completed') },
  'books-no-covers': { ...BASELINE, '/books.json': fixture('books', 'no-covers') },

  'github-commits-only': { ...BASELINE, '/github-events.json': fixture('github-events', 'commits-only') },
  'github-prs-only': { ...BASELINE, '/github-events.json': fixture('github-events', 'prs-only') },

  'workouts-multi': { ...BASELINE, '/workouts.json': fixture('workouts', 'multi-workout') },
  'workouts-barrys': { ...BASELINE, '/workouts.json': fixture('workouts', 'barrys-bootcamp') },

  'theatre-all-grades': { ...BASELINE, '/theatre-reviews.json': fixture('theatre-reviews', 'all-grades') },
  'theatre-no-images': { ...BASELINE, '/theatre-reviews.json': fixture('theatre-reviews', 'no-images') },

  'focus-work': { ...BASELINE, '/focus.json': fixture('focus', 'baseline') },
  'focus-dnd': { ...BASELINE, '/focus.json': fixture('focus', 'dnd') },
};

export type ScenarioName = keyof typeof DASHBOARD_SCENARIOS | keyof typeof WIDGET_VARIATION_SCENARIOS;

export function getScenarioFixtures(scenario: ScenarioName): FixtureSet {
  if (scenario in DASHBOARD_SCENARIOS) {
    return DASHBOARD_SCENARIOS[scenario];
  }
  if (scenario in WIDGET_VARIATION_SCENARIOS) {
    return WIDGET_VARIATION_SCENARIOS[scenario];
  }
  throw new Error(`Unknown scenario: ${scenario}`);
}

export function scenarioHasWorkouts(scenario: ScenarioName): boolean {
  const fixtures = getScenarioFixtures(scenario);
  const workoutsPath = fixtures['/workouts.json'];
  return !workoutsPath.includes('/empty.json');
}
