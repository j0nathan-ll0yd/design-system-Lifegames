const { getJestConfig } = require('@storybook/test-runner');
const { toMatchImageSnapshot } = require('jest-image-snapshot');

/** @type {import('@storybook/test-runner').TestRunnerConfig} */
module.exports = {
  ...getJestConfig(),
  testEnvironmentOptions: {
    'jest-playwright': {
      browsers: ['chromium'],
      launchOptions: { headless: true },
    },
  },
  /** @type {import('jest-image-snapshot').MatchImageSnapshotOptions} */
  setup() {
    expect.extend({ toMatchImageSnapshot });
  },
  async postVisit(page, context) {
    // Capture screenshot per story with dark background (default theme).
    // Snapshots land in apps/storybook/__snapshots__/<StoryId>.png
    const image = await page.screenshot({ animations: 'disabled' });
    expect(image).toMatchImageSnapshot({
      customSnapshotsDir: `${__dirname}/__snapshots__`,
      customSnapshotIdentifier: context.id,
      // Allow up to 0.2% pixel diff to absorb sub-pixel anti-aliasing variance.
      failureThreshold: 0.002,
      failureThresholdType: 'percent',
      // Store diff images alongside baselines for easy review.
      customDiffDir: `${__dirname}/__snapshots__/__diff__`,
    });
  },
};
