import {getJestConfig} from '@storybook/test-runner'
import {toMatchImageSnapshot} from 'jest-image-snapshot'

/** @type {import('@storybook/test-runner').TestRunnerConfig} */
export default {
  ...getJestConfig(),
  testEnvironmentOptions: {'jest-playwright': {browsers: ['chromium'], launchOptions: {headless: true}}},
  /** @type {import('jest-image-snapshot').MatchImageSnapshotOptions} */
  setup() {
    expect.extend({toMatchImageSnapshot})
  },
  async postVisit(page, context) {
    // Capture screenshot per story with dark background (default theme).
    // Snapshots land in apps/storybook/__snapshots__/<StoryId>.png
    const image = await page.screenshot({animations: 'disabled'})
    expect(image).toMatchImageSnapshot({
      customSnapshotsDir: `${import.meta.dirname}/__snapshots__`,
      customSnapshotIdentifier: context.id,
      // Allow up to 0.2% pixel diff to absorb sub-pixel anti-aliasing variance.
      failureThreshold: 0.002,
      failureThresholdType: 'percent',
      // Store diff images alongside baselines for easy review.
      customDiffDir: `${import.meta.dirname}/__snapshots__/__diff__`
    })
  }
}
