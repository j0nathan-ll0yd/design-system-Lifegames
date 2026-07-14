// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  updateHeartRate,
  updateWorkouts,
  updateNightSummary,
  updateHydration,
  updateDevActivityLog,
  updateReadingFeed,
  updateStarredRepos,
  updateSystemStatus,
  updateExplorationOdometer,
  updatePlaceLeaderboard,
  updateBookshelf,
  getCategoryColor,
  esc,
} from '../../src/runtime/updaters';
import type {
  AdaptedHealth,
  AdaptedSleep,
  WorkoutEntry,
  AdaptedGithubEvent,
  AdaptedArticle,
  AdaptedBooks,
  AdaptedStarredRepo,
} from '../../src/runtime/adapters';
import type { LocationExport } from '../../src/types/exports';
import { widgets } from '@lifegames/copy';

// ── helpers ───────────────────────────────────────────────────────────────────

function el(id: string): HTMLElement {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Missing element #${id}`);
  return e as HTMLElement;
}

function makeHealth(overrides: Partial<AdaptedHealth['quantities']> = {}): AdaptedHealth {
  return {
    date: '2026-01-01',
    quantities: {
      heartRate: { value: 72, unit: 'bpm' },
      hrvSDNN: { value: 45, unit: 'ms' },
      stepCount: { value: 8000, unit: 'steps' },
      distanceWalkingRunning: { value: 5200, unit: 'm' },
      exerciseTime: { value: 30, unit: 'min' },
      activeEnergyBurned: { value: 400, unit: 'kcal' },
      basalEnergyBurned: { value: 1800, unit: 'kcal' },
      dietaryWater: { value: 2000, unit: 'mL' },
      dietaryCaffeine: { value: 0.2, unit: 'g' },
      ...overrides,
    },
    derived: { totalCalories: 2200, deepPct: 20, remPct: 25, corePct: 45 },
    sleepScore: 85,
    sleepDurationFormatted: '7h 30m',
    sleepPhaseFormatted: { deep: '1h 30m', rem: '1h 52m', core: '3h 22m', awake: '15m' },
    hydration: {
      waterOz: 68,
      caffeineMg: 200,
      waterMax: 140,
      caffeineMax: 500,
      waterRangeLo: 74,
      waterRangeHi: 125,
      caffeineRangeLo: 200,
      caffeineRangeHi: 400,
    },
  };
}

function makeLocation(overrides: Partial<LocationExport> = {}): LocationExport {
  return {
    generatedAt: '2026-01-01T00:00:00Z',
    totalVisits: 500,
    totalPlaces: 80,
    totalDurationHours: 300,
    citiesVisited: 5,
    currentCity: 'Los Angeles',
    lastSeen: new Date(Date.now() - 3600000).toISOString(),
    last90Days: [
      { date: '2026-01-01', count: 3, uniquePlaces: 2, totalDurationMinutes: 90 },
      { date: '2026-01-02', count: 0, uniquePlaces: 0, totalDurationMinutes: 0 },
      { date: '2026-01-03', count: 5, uniquePlaces: 3, totalDurationMinutes: 120 },
    ],
    topPlaces: [
      {
        name: 'Coffee Shop',
        category: 'Dining',
        visitCount: 40,
        totalDurationMinutes: 800,
        lastVisitAt: null,
      },
      {
        name: 'Gym',
        category: 'Fitness & Outdoors',
        visitCount: 30,
        totalDurationMinutes: 600,
        lastVisitAt: null,
      },
    ],
    cityBreakdown: [
      { city: 'Los Angeles', visitCount: 300 },
      { city: 'San Francisco', visitCount: 100 },
    ],
    categoryBreakdown: [
      { category: 'Dining', visitCount: 50, totalMinutes: 1000 },
      { category: 'Work', visitCount: 30, totalMinutes: 600 },
    ],
    streaks: { currentStreak: 7, longestStreak: 21, totalActiveDays: 45 },
    explorationStats: { totalNeighborhoods: 12, totalCities: 5, totalStates: 3 },
    ...overrides,
  };
}

// ── esc ───────────────────────────────────────────────────────────────────────

describe('esc', () => {
  it('escapes html special chars', () => {
    expect(esc('<script>&"')).toBe('&lt;script&gt;&amp;&quot;');
  });
  it('returns empty string for null/undefined', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
  });
});

// ── getCategoryColor ───────────────────────────────────────────────────────────

describe('getCategoryColor', () => {
  it('returns known color for Dining', () => {
    expect(getCategoryColor('Dining')).toBe('var(--neon-orange, #ff6b00)');
  });
  it('returns fallback for unknown category', () => {
    expect(getCategoryColor('Unknown')).toBe('var(--text-muted, #9ca3af)');
  });
  it('returns fallback for null', () => {
    expect(getCategoryColor(null)).toBe('var(--text-muted, #9ca3af)');
  });
});

// ── updateHeartRate ────────────────────────────────────────────────────────────

describe('updateHeartRate', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="pulseBpm"></div>
      <div id="hrZoneBadge"></div>
      <div id="hrHrvValue"></div>
      <div id="hrEcgBg"></div>
      <div id="cardHR" class="tri-card is-loading tri-card-accent-blue"></div>
    `;
  });

  it('sets BPM text content', () => {
    updateHeartRate(makeHealth());
    expect(el('pulseBpm').textContent).toBe('72');
  });

  it('sets zone badge text', () => {
    updateHeartRate(makeHealth());
    expect(el('hrZoneBadge').textContent).toBe('Normal Zone');
  });

  it('sets HRV text content', () => {
    updateHeartRate(makeHealth());
    expect(el('hrHrvValue').textContent).toBe('45');
  });

  it('removes is-loading from cardHR', () => {
    updateHeartRate(makeHealth());
    expect(el('cardHR').classList.contains('is-loading')).toBe(false);
  });

  it('adds zone accent class to cardHR', () => {
    updateHeartRate(makeHealth());
    expect(el('cardHR').classList.contains('tri-card-accent-pink')).toBe(true);
  });

  it('removes prior accent class', () => {
    updateHeartRate(makeHealth());
    expect(el('cardHR').classList.contains('tri-card-accent-blue')).toBe(false);
  });

  it('uses bradycardia zone for hr < 45', () => {
    const data = makeHealth({ heartRate: { value: 40, unit: 'bpm' } });
    updateHeartRate(data);
    expect(el('hrZoneBadge').textContent).toBe('Bradycardia');
  });

  it('uses peak zone for hr > 140', () => {
    const data = makeHealth({ heartRate: { value: 160, unit: 'bpm' } });
    updateHeartRate(data);
    expect(el('hrZoneBadge').textContent).toBe('Peak Zone');
  });

  it('does not throw when elements are missing', () => {
    document.body.innerHTML = '';
    expect(() => updateHeartRate(makeHealth())).not.toThrow();
  });

  it('calls __ecgUpdate if available', () => {
    const ecgUpdate = vi.fn();
    (window as any).__ecgUpdate = ecgUpdate;
    updateHeartRate(makeHealth());
    expect(ecgUpdate).toHaveBeenCalledWith(72, 45, expect.any(String));
    delete (window as any).__ecgUpdate;
  });

  describe('paused state (watch.worn === false)', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="hrPaused" style="display:none">
          <span id="hrPausedLabel"></span>
          <span id="hrPausedDesc"></span>
        </div>
        <div id="pulseBpm"></div>
        <div id="hrZoneBadge"></div>
        <div id="hrHrvValue"></div>
        <div id="hrEcgBg"></div>
        <div id="cardHR" class="tri-card is-loading tri-card-accent-blue"></div>
      `;
    });

    it('shows hrGap label when source is hrGap', () => {
      const data: AdaptedHealth = {
        ...makeHealth(),
        watch: { worn: false, since: null, source: 'hrGap' },
      };
      updateHeartRate(data);
      expect(el('hrPausedLabel').textContent).toBe(widgets.heartRate.paused.label);
    });

    it('shows charging label when source is charging', () => {
      const data: AdaptedHealth = {
        ...makeHealth(),
        watch: { worn: false, since: null, source: 'charging' },
      };
      updateHeartRate(data);
      expect(el('hrPausedLabel').textContent).toBe(widgets.heartRate.paused.labelCharging);
    });

    it('shows charging description when source is charging', () => {
      const data: AdaptedHealth = {
        ...makeHealth(),
        watch: { worn: false, since: null, source: 'charging' },
      };
      updateHeartRate(data);
      expect(el('hrPausedDesc').textContent).toBe(widgets.heartRate.paused.descriptionCharging);
    });

    it('adds is-paused class to cardHR', () => {
      const data: AdaptedHealth = {
        ...makeHealth(),
        watch: { worn: false, since: null, source: 'hrGap' },
      };
      updateHeartRate(data);
      expect(el('cardHR').classList.contains('is-paused')).toBe(true);
    });

    it('still removes is-loading when paused (D-SMOKE)', () => {
      const data: AdaptedHealth = {
        ...makeHealth(),
        watch: { worn: false, since: null, source: 'hrGap' },
      };
      updateHeartRate(data);
      expect(el('cardHR').classList.contains('is-loading')).toBe(false);
    });

    it('removes is-paused on recovery (worn becomes true)', () => {
      // First call — paused
      const paused: AdaptedHealth = {
        ...makeHealth(),
        watch: { worn: false, since: null, source: 'hrGap' },
      };
      updateHeartRate(paused);
      expect(el('cardHR').classList.contains('is-paused')).toBe(true);
      // Second call — recovered (no watch field = worn)
      updateHeartRate(makeHealth());
      expect(el('cardHR').classList.contains('is-paused')).toBe(false);
    });
  });
});

// ── updateWorkouts ─────────────────────────────────────────────────────────────

describe('updateWorkouts', () => {
  const workout: WorkoutEntry = {
    activityType: 'Outdoor Walk',
    duration: 3600,
    energyBurned: 400,
    distance: 5000,
    source: 'Apple Watch',
  };

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="cardWorkouts" style="display:none">
        <div class="widget-body"></div>
      </div>
    `;
  });

  it('renders workout card with activity type', () => {
    updateWorkouts([workout]);
    expect(el('cardWorkouts').innerHTML).toContain('Outdoor Walk');
  });

  it('renders duration correctly', () => {
    updateWorkouts([workout]);
    expect(el('cardWorkouts').innerHTML).toContain('1h 0m');
  });

  it('renders calories', () => {
    updateWorkouts([workout]);
    expect(el('cardWorkouts').innerHTML).toContain('400 kcal');
  });

  it('renders distance in km', () => {
    updateWorkouts([workout]);
    expect(el('cardWorkouts').innerHTML).toContain('5.00 km');
  });

  it('shows the card (clears display:none)', () => {
    updateWorkouts([workout]);
    expect((el('cardWorkouts') as HTMLElement).style.display).toBe('');
  });

  it('does not throw for null data', () => {
    expect(() => updateWorkouts(null)).not.toThrow();
  });

  it('does not throw for empty array', () => {
    expect(() => updateWorkouts([])).not.toThrow();
  });

  it('does not throw when card is missing', () => {
    document.body.innerHTML = '';
    expect(() => updateWorkouts([workout])).not.toThrow();
  });

  it('renders workout without url as plain div', () => {
    const w = { ...workout, activityUrl: undefined };
    updateWorkouts([w]);
    expect(el('cardWorkouts').querySelector('.workout-sub-type')!.tagName).toBe('DIV');
  });

  it('renders workout with url as anchor', () => {
    const w = { ...workout, activityUrl: 'https://example.com' };
    updateWorkouts([w]);
    expect(el('cardWorkouts').querySelector('.workout-sub-type')!.tagName).toBe('A');
  });
});

// ── updateNightSummary ─────────────────────────────────────────────────────────

describe('updateNightSummary', () => {
  function setup() {
    document.body.innerHTML = `
      <div id="cardSleep" class="is-loading">
        <div id="sleepDuration"></div>
        <div id="sleepScoreVal"></div>
        <div id="sleepScoreFill" style="width:0%"></div>
        <div data-phase="deep"><span class="sleep-moon-pill-val"></span></div>
        <div data-phase="rem"><span class="sleep-moon-pill-val"></span></div>
        <div data-phase="core"><span class="sleep-moon-pill-val"></span></div>
        <div data-phase="awake"><span class="sleep-moon-pill-val"></span></div>
        <div id="sleepInsight"></div>
        <div id="sleepTimestamp"></div>
      </div>
    `;
  }

  const fullSleep: AdaptedSleep = {
    isEmpty: false,
    date: '2026-01-01',
    sleepScore: 85,
    sleepDurationFormatted: '7h 30m',
    sleepPhaseFormatted: { deep: '1h 30m', rem: '1h 52m', core: '3h 22m', awake: '15m' },
    derived: { deepPct: 20, remPct: 25, corePct: 45 },
    phases: { deep: 5400, rem: 6720, core: 12120, awake: 900 },
  };

  const emptySleep: AdaptedSleep = {
    isEmpty: true,
    date: '2026-01-01',
    sleepScore: 0,
    sleepDurationFormatted: '',
    sleepPhaseFormatted: { deep: '', rem: '', core: '', awake: '' },
    derived: { deepPct: 0, remPct: 0, corePct: 0 },
    phases: { deep: 0, rem: 0, core: 0, awake: 0 },
  };

  it('sets sleep duration', () => {
    setup();
    updateNightSummary(fullSleep);
    expect(el('sleepDuration').textContent).toBe('7h 30m');
  });

  it('sets sleep score', () => {
    setup();
    updateNightSummary(fullSleep);
    expect(el('sleepScoreVal').textContent).toBe('85');
  });

  it('sets score fill width', () => {
    setup();
    updateNightSummary(fullSleep);
    expect((el('sleepScoreFill') as HTMLElement).style.width).toBe('85%');
  });

  it('sets phase pill values', () => {
    setup();
    updateNightSummary(fullSleep);
    const deepPill = document.querySelector('[data-phase="deep"] .sleep-moon-pill-val');
    expect(deepPill!.textContent).toBe('1h 30m');
  });

  it('sets insight with deep and rem percentages', () => {
    setup();
    updateNightSummary(fullSleep);
    expect(el('sleepInsight').innerHTML).toContain('20% deep');
    expect(el('sleepInsight').innerHTML).toContain('25% REM');
  });

  it('sets timestamp to "last night"', () => {
    setup();
    updateNightSummary(fullSleep);
    expect(el('sleepTimestamp').textContent).toBe('last night');
  });

  it('removes is-loading', () => {
    setup();
    updateNightSummary(fullSleep);
    expect(el('cardSleep').classList.contains('is-loading')).toBe(false);
  });

  it('shows -- for duration when isEmpty', () => {
    setup();
    updateNightSummary(emptySleep);
    expect(el('sleepDuration').textContent).toBe('--');
  });

  it('shows -- for score when isEmpty', () => {
    setup();
    updateNightSummary(emptySleep);
    expect(el('sleepScoreVal').textContent).toBe('--');
  });

  it('sets fill to 0% when isEmpty', () => {
    setup();
    updateNightSummary(emptySleep);
    expect((el('sleepScoreFill') as HTMLElement).style.width).toBe('0%');
  });

  it('sets insight to no-data message when isEmpty', () => {
    setup();
    updateNightSummary(emptySleep);
    expect(el('sleepInsight').innerHTML).toContain('No sleep data');
  });

  it('does not throw when elements are missing', () => {
    document.body.innerHTML = '';
    expect(() => updateNightSummary(fullSleep)).not.toThrow();
  });
});

// ── updateHydration ────────────────────────────────────────────────────────────

describe('updateHydration', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="cardHydration" class="is-loading">
        <div id="hydraWaterLiq"></div>
        <div id="hydraWaterVal"></div>
        <div id="hydraCoffeeLiq"></div>
        <div id="hydraCoffeeVal"></div>
        <div id="hydraCoffeeLabel"></div>
      </div>
    `;
  });

  it('sets water value text', () => {
    updateHydration(makeHealth());
    expect(el('hydraWaterVal').textContent).toContain('oz');
  });

  it('sets caffeine value text', () => {
    updateHydration(makeHealth());
    expect(el('hydraCoffeeVal').textContent).toContain('mg');
  });

  it('sets coffee label to Caffeine', () => {
    updateHydration(makeHealth());
    expect(el('hydraCoffeeLabel').textContent).toBe('Caffeine');
  });

  it('sets water clip-path', () => {
    updateHydration(makeHealth());
    expect((el('hydraWaterLiq') as HTMLElement).style.clipPath).toMatch(/inset\(/);
  });

  it('sets caffeine clip-path', () => {
    updateHydration(makeHealth());
    expect((el('hydraCoffeeLiq') as HTMLElement).style.clipPath).toMatch(/inset\(/);
  });

  it('sets data-live-updated on water val', () => {
    updateHydration(makeHealth());
    expect((el('hydraWaterVal') as HTMLElement).dataset.liveUpdated).toBe('1');
  });

  it('removes is-loading', () => {
    updateHydration(makeHealth());
    expect(el('cardHydration').classList.contains('is-loading')).toBe(false);
  });

  it('does not throw when elements are missing', () => {
    document.body.innerHTML = '';
    expect(() => updateHydration(makeHealth())).not.toThrow();
  });
});

// ── updateDevActivityLog ──────────────────────────────────────────────────────

describe('updateDevActivityLog', () => {
  const events: AdaptedGithubEvent[] = [
    {
      type: 'commit',
      repo: 'my-repo',
      title: 'Fix bug',
      date: '2h ago',
      hash: 'abc123',
      additions: 10,
      deletions: 5,
      url: 'https://github.com/test/commit/abc123',
    },
    {
      type: 'pr_opened',
      repo: 'other-repo',
      title: 'Add feature',
      date: '1d ago',
      number: 42,
      url: 'https://github.com/test/pull/42',
    },
  ];

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="cardDevLog" class="is-loading">
        <div class="widget-body"></div>
      </div>
    `;
  });

  it('renders commit event with repo and title', () => {
    updateDevActivityLog(events);
    expect(el('cardDevLog').innerHTML).toContain('my-repo');
    expect(el('cardDevLog').innerHTML).toContain('Fix bug');
  });

  it('renders additions and deletions for commit', () => {
    updateDevActivityLog(events);
    expect(el('cardDevLog').innerHTML).toContain('+10');
    expect(el('cardDevLog').innerHTML).toContain('-5');
  });

  it('renders PR number', () => {
    updateDevActivityLog(events);
    expect(el('cardDevLog').innerHTML).toContain('#42');
  });

  it('removes is-loading', () => {
    updateDevActivityLog(events);
    expect(el('cardDevLog').classList.contains('is-loading')).toBe(false);
  });

  it('renders empty state and clears stale content for empty events', () => {
    // SSR ships baseline (populated) content; the updater must replace it.
    el('cardDevLog').querySelector('.widget-body')!.innerHTML =
      '<div class="gh-dal-terminal">stale baseline row</div>';
    updateDevActivityLog([]);
    expect(el('cardDevLog').innerHTML).not.toContain('stale baseline row');
    expect(el('cardDevLog').querySelector('.widget-empty')).not.toBeNull();
    expect(el('cardDevLog').classList.contains('is-loading')).toBe(false);
  });

  it('does not throw when card is missing', () => {
    document.body.innerHTML = '';
    expect(() => updateDevActivityLog(events)).not.toThrow();
  });

  it('renders anchor links for events with url', () => {
    updateDevActivityLog(events);
    const links = el('cardDevLog').querySelectorAll('a.gh-dal-line[href]');
    expect(links.length).toBe(2);
  });
});

// ── updateReadingFeed ─────────────────────────────────────────────────────────

describe('updateReadingFeed', () => {
  const articles: AdaptedArticle[] = [
    {
      title: 'Article 1',
      url: 'https://example.com/1',
      source: 'Source A',
      date: '1h ago',
      hasNotes: false,
      noteText: null,
    },
    {
      title: 'Article 2',
      url: 'https://example.com/2',
      source: 'Source B',
      date: '2h ago',
      hasNotes: true,
      noteText: 'My note',
    },
  ];

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="cardReading" class="is-loading">
        <div class="widget-body"></div>
      </div>
    `;
  });

  it('renders article titles', () => {
    updateReadingFeed(articles);
    expect(el('cardReading').innerHTML).toContain('Article 1');
    expect(el('cardReading').innerHTML).toContain('Article 2');
  });

  it('renders article sources', () => {
    updateReadingFeed(articles);
    expect(el('cardReading').innerHTML).toContain('Source A');
  });

  it('renders note icon for articles with notes', () => {
    updateReadingFeed(articles);
    expect(el('cardReading').querySelectorAll('.article-list-note').length).toBe(1);
  });

  it('removes is-loading', () => {
    updateReadingFeed(articles);
    expect(el('cardReading').classList.contains('is-loading')).toBe(false);
  });

  it('renders empty state and clears stale content for empty articles', () => {
    // SSR ships baseline (populated) content; the updater must replace it.
    el('cardReading').querySelector('.widget-body')!.innerHTML =
      '<ul class="article-list"><li>stale baseline article</li></ul>';
    updateReadingFeed([]);
    expect(el('cardReading').innerHTML).not.toContain('stale baseline article');
    expect(el('cardReading').querySelector('.widget-empty')).not.toBeNull();
    expect(el('cardReading').classList.contains('is-loading')).toBe(false);
  });

  it('does not throw when card is missing', () => {
    document.body.innerHTML = '';
    expect(() => updateReadingFeed(articles)).not.toThrow();
  });

  it('renders pagination when articles > 10', () => {
    const manyArticles: AdaptedArticle[] = Array.from({ length: 15 }, (_, i) => ({
      title: `Article ${i}`,
      url: `https://example.com/${i}`,
      source: 'Source',
      date: '1h ago',
      hasNotes: false,
      noteText: null,
    }));
    updateReadingFeed(manyArticles);
    expect(el('cardReading').querySelectorAll('.article-page-btn').length).toBeGreaterThan(1);
  });

  it('promotes source into title slot and suppresses parenthetical source when article title is empty', () => {
    const emptyTitleArticle: AdaptedArticle = {
      title: '',
      url: 'https://example.com/hoodline',
      source: 'Hoodline',
      date: '1h ago',
      hasNotes: false,
      noteText: null,
    };
    updateReadingFeed([emptyTitleArticle]);
    const titleEl = el('cardReading').querySelector('.article-list-title');
    expect(titleEl!.textContent).toBe('Hoodline');
    expect(el('cardReading').querySelector('.article-list-source')).toBeNull();
  });

  it('renders title in title slot and parenthetical source when article title is present', () => {
    const titledArticle: AdaptedArticle = {
      title: 'My Article',
      url: 'https://example.com/article',
      source: 'Source X',
      date: '1h ago',
      hasNotes: false,
      noteText: null,
    };
    updateReadingFeed([titledArticle]);
    const titleEl = el('cardReading').querySelector('.article-list-title');
    expect(titleEl!.textContent).toBe('My Article');
    expect(el('cardReading').querySelector('.article-list-source')!.textContent).toBe('(Source X)');
  });
});

// ── updateStarredRepos ────────────────────────────────────────────────────────

describe('updateStarredRepos', () => {
  const repos: AdaptedStarredRepo[] = [
    {
      owner: 'octocat',
      name: 'hello-world',
      url: 'https://github.com/octocat/hello-world',
      stars: 1234,
      language: 'TypeScript',
      languageColor: '#3178c6',
      starredAt: '2d ago',
    },
  ];

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="cardStarredRepos" class="is-loading">
        <div class="widget-body"><div class="gh-starred-list"></div></div>
      </div>
    `;
  });

  it('renders repo owner, name and stars', () => {
    updateStarredRepos(repos);
    expect(el('cardStarredRepos').innerHTML).toContain('octocat');
    expect(el('cardStarredRepos').innerHTML).toContain('hello-world');
    expect(el('cardStarredRepos').innerHTML).toContain('1,234');
  });

  it('removes is-loading', () => {
    updateStarredRepos(repos);
    expect(el('cardStarredRepos').classList.contains('is-loading')).toBe(false);
  });

  it('renders empty state and clears stale content for empty repos', () => {
    // SSR ships baseline (populated) content; the updater must replace it.
    el('cardStarredRepos').querySelector('.gh-starred-list')!.innerHTML =
      '<div class="gh-sl-row">stale baseline repo</div>';
    updateStarredRepos([]);
    expect(el('cardStarredRepos').innerHTML).not.toContain('stale baseline repo');
    expect(el('cardStarredRepos').querySelector('.widget-empty')).not.toBeNull();
    expect(el('cardStarredRepos').classList.contains('is-loading')).toBe(false);
  });

  it('does not throw when card is missing', () => {
    document.body.innerHTML = '';
    expect(() => updateStarredRepos(repos)).not.toThrow();
  });
});

// ── updateSystemStatus ─────────────────────────────────────────────────────────

describe('updateSystemStatus', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="systemStatus">
        <div class="sys-line" data-source="health">
          <span class="sys-dot sys-dot-red"></span>
          <span class="sys-key"></span>
          <span class="sys-val-red">OFFLINE</span>
        </div>
        <div class="sys-line" data-source="sleep">
          <span class="sys-dot"></span>
          <span class="sys-key"></span>
          <span class="sys-val-red">OFFLINE</span>
        </div>
      </div>
    `;
  });

  it('updates dot class when timestamp is present', () => {
    const ts = new Date(Date.now() - 60000).toISOString();
    updateSystemStatus({ health: ts, sleep: null });
    const dot = document.querySelector('[data-source="health"] .sys-dot');
    expect(dot!.className).toContain('sys-dot-red');
  });

  it('shows ACTIVE when timestamp is present', () => {
    const ts = new Date(Date.now() - 60000).toISOString();
    updateSystemStatus({ health: ts, sleep: null });
    const val = document.querySelector('[data-source="health"] [class*="sys-val"]');
    expect(val!.innerHTML).toContain('ACTIVE');
  });

  it('shows OFFLINE when timestamp is null', () => {
    updateSystemStatus({ health: null, sleep: null });
    const val = document.querySelector('[data-source="health"] [class*="sys-val"]');
    expect(val!.textContent).toBe('OFFLINE');
  });

  it('sets dot to red for offline source', () => {
    updateSystemStatus({ health: null, sleep: null });
    const dot = document.querySelector('[data-source="health"] .sys-dot');
    expect(dot!.className).toContain('sys-dot-red');
  });

  it('does not throw when container is missing', () => {
    document.body.innerHTML = '';
    expect(() => updateSystemStatus({ health: null })).not.toThrow();
  });
});

// ── updateExplorationOdometer ──────────────────────────────────────────────────

describe('updateExplorationOdometer', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="cardExplorationOdometer" class="is-loading">
        <div data-loc="odo-visits">0</div>
        <div data-loc="odo-places">0</div>
        <div data-loc="odo-cities">0</div>
        <div data-loc="odo-states">0</div>
        <div data-loc="odo-subtitle" style="display:none"></div>
      </div>
    `;
  });

  it('sets visits count', () => {
    updateExplorationOdometer(makeLocation());
    expect(
      el('cardExplorationOdometer').querySelector('[data-loc="odo-visits"]')!.textContent,
    ).toMatch(/500/);
  });

  it('sets places count', () => {
    updateExplorationOdometer(makeLocation());
    expect(
      el('cardExplorationOdometer').querySelector('[data-loc="odo-places"]')!.textContent,
    ).toMatch(/80/);
  });

  it('sets cities count', () => {
    updateExplorationOdometer(makeLocation());
    expect(
      el('cardExplorationOdometer').querySelector('[data-loc="odo-cities"]')!.textContent,
    ).toMatch(/5/);
  });

  it('sets subtitle with current city when present', () => {
    updateExplorationOdometer(makeLocation());
    const subtitle = el('cardExplorationOdometer').querySelector(
      '[data-loc="odo-subtitle"]',
    ) as HTMLElement;
    expect(subtitle.innerHTML).toContain('Los Angeles');
  });

  it('removes is-loading', () => {
    updateExplorationOdometer(makeLocation());
    expect(el('cardExplorationOdometer').classList.contains('is-loading')).toBe(false);
  });

  it('does not throw when card is missing', () => {
    document.body.innerHTML = '';
    expect(() => updateExplorationOdometer(makeLocation())).not.toThrow();
  });
});

// ── updatePlaceLeaderboard ─────────────────────────────────────────────────────

describe('updatePlaceLeaderboard', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="cardPlaceLeaderboard" class="is-loading">
        <div data-loc="leaderboard-list"></div>
      </div>
    `;
  });

  it('renders place names', () => {
    updatePlaceLeaderboard(makeLocation());
    expect(el('cardPlaceLeaderboard').innerHTML).toContain('Coffee Shop');
    expect(el('cardPlaceLeaderboard').innerHTML).toContain('Gym');
  });

  it('renders visit counts', () => {
    updatePlaceLeaderboard(makeLocation());
    expect(el('cardPlaceLeaderboard').innerHTML).toContain('40');
  });

  it('renders category badges', () => {
    updatePlaceLeaderboard(makeLocation());
    expect(el('cardPlaceLeaderboard').innerHTML).toContain('Dining');
  });

  it('removes is-loading', () => {
    updatePlaceLeaderboard(makeLocation());
    expect(el('cardPlaceLeaderboard').classList.contains('is-loading')).toBe(false);
  });

  it('removes is-loading when topPlaces is empty', () => {
    updatePlaceLeaderboard(makeLocation({ topPlaces: [] }));
    expect(el('cardPlaceLeaderboard').classList.contains('is-loading')).toBe(false);
  });

  it('does not throw when card is missing', () => {
    document.body.innerHTML = '';
    expect(() => updatePlaceLeaderboard(makeLocation())).not.toThrow();
  });
});

// ── updateBookshelf ────────────────────────────────────────────────────────────

describe('updateBookshelf', () => {
  function makeBooks(overrides: Partial<AdaptedBooks> = {}): AdaptedBooks {
    return {
      books: [
        {
          title: 'Test Book',
          author: 'Test Author',
          asin: 'B001TEST',
          status: 'reading',
          rating: null,
          progress: 42,
          link: 'https://amazon.com/dp/B001TEST',
          cover: null,
          coverThumb: null,
          coverCard: null,
          coverAvif: null,
          coverThumbAvif: null,
          coverCardAvif: null,
          notes: null,
          finishedAt: null,
          startedAt: null,
        },
      ],
      bookMeta: {},
      statusLabels: {
        pending: 'Pending',
        reading: 'Reading',
        upNext: 'Up Next',
        finished: 'Finished',
      },
      stats: { total: 1, reading: 1, completed: 0, upcoming: 0 },
      ...overrides,
    };
  }

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="cardBooks" class="is-loading">
        <div id="dashShelfRow"></div>
      </div>
    `;
  });

  it('renders book title', () => {
    updateBookshelf(makeBooks());
    expect(document.getElementById('dashShelfRow')!.innerHTML).toContain('Test Book');
  });

  it('renders book author', () => {
    updateBookshelf(makeBooks());
    expect(document.getElementById('dashShelfRow')!.innerHTML).toContain('Test Author');
  });

  it('renders the reading status badge (natural-case source, CSS uppercases to READING)', () => {
    updateBookshelf(makeBooks());
    // The badge text is sourced from @lifegames/copy (widgets.bookshelf.statusReading,
    // canonical natural-case 'Reading'); .shelf-book-status applies text-transform:uppercase
    // so the visible pixels remain 'READING' (D3 display transform).
    const html = document.getElementById('dashShelfRow')!.innerHTML;
    expect(html).toContain('class="shelf-book-status shelf-status-reading">Reading<');
  });

  it('renders progress bar for reading book', () => {
    updateBookshelf(makeBooks());
    expect(document.getElementById('dashShelfRow')!.innerHTML).toContain('42%');
  });

  it('removes is-loading from cardBooks', () => {
    updateBookshelf(makeBooks());
    expect(document.getElementById('cardBooks')!.classList.contains('is-loading')).toBe(false);
  });

  it('does not throw when dashShelfRow is missing', () => {
    document.body.innerHTML = '';
    expect(() => updateBookshelf(makeBooks())).not.toThrow();
  });

  it('adds shelf-book-active class for reading book', () => {
    updateBookshelf(makeBooks());
    expect(document.querySelector('.shelf-book')!.classList.contains('shelf-book-active')).toBe(
      true,
    );
  });

  it('renders stars for finished books with rating', () => {
    const books = makeBooks({
      books: [
        {
          title: 'Done Book',
          author: 'Author',
          asin: 'B002TEST',
          status: 'finished',
          rating: 4,
          progress: undefined,
          link: 'https://amazon.com/dp/B002TEST',
          cover: null,
          coverThumb: null,
          coverCard: null,
          coverAvif: null,
          coverThumbAvif: null,
          coverCardAvif: null,
          notes: null,
          finishedAt: null,
          startedAt: null,
        },
      ],
    });
    updateBookshelf(books);
    expect(document.getElementById('dashShelfRow')!.innerHTML).toContain('star-on');
  });

  it('updates in-place when existing book count matches', () => {
    // Pre-populate with same count of .shelf-book elements
    document.getElementById('dashShelfRow')!.innerHTML = `
      <div class="shelf-book" data-book='{}'>
        <img src="" alt="">
        <div class="shelf-book-title"><span>Old Title</span></div>
        <div class="shelf-book-author">Old Author</div>
        <div class="shelf-book-status shelf-status-upNext">Up Next</div>
      </div>
    `;
    updateBookshelf(makeBooks());
    expect(document.querySelector('.shelf-book-title span')!.textContent).toBe('Test Book');
  });

  describe('with widget-body DOM', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="cardBooks" class="is-loading">
          <div class="widget-body">
            <ul class="shelf-row" id="dashShelfRow"></ul>
          </div>
        </div>
      `;
    });

    it('renders widget-empty--stack in widget-body and removes is-loading when books is empty', () => {
      updateBookshelf(makeBooks({ books: [] }));
      const empty = document.querySelector('#cardBooks .widget-body .widget-empty');
      expect(empty).not.toBeNull();
      expect(empty!.classList.contains('widget-empty--stack')).toBe(true);
      expect(document.getElementById('cardBooks')!.classList.contains('is-loading')).toBe(false);
    });

    it('empty state contains correct title and body copy strings', () => {
      updateBookshelf(makeBooks({ books: [] }));
      expect(document.querySelector('#cardBooks .widget-empty-title')!.textContent).toBe(
        widgets.bookshelf.emptyTitle,
      );
      expect(document.querySelector('#cardBooks .widget-empty-body')!.textContent).toBe(
        widgets.bookshelf.emptyBody,
      );
    });

    it('recreates dashShelfRow and renders book title after empty-to-populated transition', () => {
      updateBookshelf(makeBooks({ books: [] }));
      expect(() => updateBookshelf(makeBooks())).not.toThrow();
      const shelfRow = document.getElementById('dashShelfRow');
      expect(shelfRow).not.toBeNull();
      expect(shelfRow!.innerHTML).toContain('Test Book');
    });
  });
});
