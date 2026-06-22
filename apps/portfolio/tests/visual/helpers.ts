import path from 'path';
import type { Page } from '@playwright/test';
import { scenarioPath, type ScenarioName } from './fixtures';

export const stylePath = path.join(import.meta.dirname, 'screenshot.css');

export const WIDGET_SELECTORS = {
  identityCard: '#identityCard',
  bioTerminal: '#cardBio',
  systemStatus: '#cardSystem',
  heartRate: '#cardHR',
  workouts: '#cardWorkouts',
  hydration: '#cardHydration',
  nightSummary: '#cardSleep',
  devActivityLog: '#cardDevLog',
  readingFeed: '#cardReading',
  starredRepos: '#cardStarredRepos',
  bookshelf: '#cardBooks',
  theatreReviews: '#cardTheatreReviews',
  topBar: '.top-bar',
} as const;

export interface NavigateOptions {
  /**
   * Wait for the document scroll-height to stabilize before capturing. Used for
   * full-page screenshots where late layout (image reflow, font swap) can shift
   * the captured height.
   */
  waitForScrollHeight?: boolean;
}

// Wall-clock budget for the static reveal + font load. This is a STATIC build:
// there is no live-data fetch to wait on, so the only async work is font load
// and the inline reveal script stripping `.is-loading`. Generous in CI for
// CPU-contended parallel workers.
const REVEAL_TIMEOUT_MS = process.env.CI ? 15_000 : 5_000;

/**
 * Navigate to a scenario's pre-rendered static page and wait for it to settle.
 *
 * The portfolio showcase renders one static page per scenario:
 *   - `populated` → `/` (the default baseline showcase)
 *   - everything else → `/scenarios/<name>/`
 *
 * There is NO CloudFront/WebSocket interception (nothing to intercept on a
 * static build). Settling means: fonts loaded, and the static-reveal script has
 * removed every `.is-loading` skeleton class (the populated content is already
 * SSR'd, so this just unhides it deterministically).
 */
export async function setupPage(
  page: Page,
  scenario: ScenarioName,
  options: NavigateOptions = {},
): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(scenarioPath(scenario));
  await page.evaluate(() => document.fonts.ready);

  // The static-reveal script (DashboardShowcase.astro) strips `.is-loading` on
  // DOMContentLoaded; the runtime updaters (theatre/focus) also clear their own
  // skeletons. Wait until none remain.
  await page.waitForFunction(() => document.querySelectorAll('.is-loading').length === 0, {
    timeout: REVEAL_TIMEOUT_MS,
  });

  if (options.waitForScrollHeight) {
    await page.waitForFunction(
      () => {
        const h = document.documentElement.scrollHeight;
        return new Promise<boolean>((resolve) => {
          setTimeout(() => {
            resolve(document.documentElement.scrollHeight === h);
          }, 200);
        });
      },
      { timeout: REVEAL_TIMEOUT_MS },
    );
  }
}
