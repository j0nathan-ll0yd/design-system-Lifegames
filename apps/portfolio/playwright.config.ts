import { defineConfig } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? '50%' : undefined,

  reporter: isCI
    ? [['github'], ['blob'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['html', { open: 'on-failure' }]],

  // Static-showcase model: `pnpm build` bakes every scenario into its own
  // pre-rendered page (`/` + `/scenarios/<name>/`) from @lifegames/fixtures.
  // There is no runtime fixture middleware to configure — the suite navigates
  // to the pre-built pages, so no per-scenario env is needed.
  webServer: {
    command: 'pnpm build && pnpm preview',
    url: 'http://localhost:4321/',
    timeout: 120_000,
    reuseExistingServer: !isCI,
  },

  use: {
    baseURL: 'http://localhost:4321/',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    serviceWorkers: 'block',
    launchOptions: {
      args: ['--force-device-scale-factor=1'],
    },
  },

  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },

  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}',

  projects: [
    {
      name: 'desktop-1400',
      use: { browserName: 'chromium', viewport: { width: 1400, height: 900 } },
    },
    {
      name: 'tablet-1100',
      use: { browserName: 'chromium', viewport: { width: 1100, height: 800 } },
    },
    {
      name: 'tablet-768',
      use: { browserName: 'chromium', viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'mobile-600',
      use: { browserName: 'chromium', viewport: { width: 600, height: 900 } },
    },
  ],
});
