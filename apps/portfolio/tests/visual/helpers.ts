import path from 'path';
import type { Page } from '@playwright/test';
import { getScenarioFixtures, scenarioHasWorkouts, type ScenarioName } from './fixtures';

const CLOUDFRONT_BASE = 'https://d1pfm520aduift.cloudfront.net';
const WEBSOCKET_URL = 'wss://iu1k9jv4mi.execute-api.us-west-2.amazonaws.com';

export const stylePath = path.join(import.meta.dirname, 'screenshot.css');

export const WIDGET_SELECTORS = {
  identityCard: '#identityCard',
  bioTerminal: '#cardBio',
  systemStatus: '#cardSystem',
  heartRate: '#cardHR',
  dailyActivity: '#cardSteps',
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

const TRANSPARENT_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB' +
  'Nl7BcQAAAABJRU5ErkJggg==',
  'base64',
);

export async function interceptRoutes(page: Page, scenario: ScenarioName): Promise<void> {
  const fixtures = getScenarioFixtures(scenario);

  await page.route(`${CLOUDFRONT_BASE}/**`, async (route) => {
    const url = new URL(route.request().url());
    const fixturePath = fixtures[url.pathname];
    if (fixturePath) {
      await route.fulfill({
        path: fixturePath,
        contentType: 'application/json',
      });
    } else {
      await route.abort();
    }
  });

  await page.route(`${WEBSOCKET_URL}/**`, (route) => route.abort());

  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (
      url.startsWith('http://localhost') ||
      url.startsWith('data:') ||
      url.startsWith(CLOUDFRONT_BASE) ||
      url.startsWith(WEBSOCKET_URL.replace('wss://', 'https://')) ||
      url.startsWith('wss://')
    ) {
      await route.fallback();
      return;
    }
    const resourceType = route.request().resourceType();
    if (resourceType === 'image') {
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: TRANSPARENT_PIXEL,
      });
    } else {
      await route.abort();
    }
  });
}

export interface NavigateOptions {
  waitForWorkouts?: boolean;
  waitForScrollHeight?: boolean;
}

export async function navigateAndWait(page: Page, options: NavigateOptions = {}): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  await page.waitForFunction(
    () => document.querySelectorAll('.is-loading').length === 0,
    { timeout: 10000 },
  );

  if (options.waitForWorkouts) {
    await page.locator('#cardWorkouts').waitFor({ state: 'visible', timeout: 10000 });
  }

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
      { timeout: 10000 },
    );
  }
}

export async function setupPage(page: Page, scenario: ScenarioName, options?: NavigateOptions): Promise<void> {
  await interceptRoutes(page, scenario);
  const hasWorkouts = options?.waitForWorkouts ?? scenarioHasWorkouts(scenario);
  await navigateAndWait(page, {
    waitForWorkouts: hasWorkouts,
    waitForScrollHeight: options?.waitForScrollHeight ?? false,
  });
}
