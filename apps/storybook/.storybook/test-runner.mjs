import { toMatchImageSnapshot } from 'jest-image-snapshot';

/** @type {import('@storybook/test-runner').TestRunnerConfig} */
export default {
  setup() {
    expect.extend({ toMatchImageSnapshot });
  },

  async postVisit(page, context) {
    const image = await page.screenshot({ animations: 'disabled' });
    expect(image).toMatchImageSnapshot({
      customSnapshotsDir: `${process.cwd()}/__snapshots__`,
      customSnapshotIdentifier: context.id,
      // Allow up to 1% pixel diff to absorb sub-pixel anti-aliasing variance
      // plus cross-platform rendering differences between local macOS recording
      // and Linux CI playback (font hinting, gradient interpolation).
      failureThreshold: 0.01,
      failureThresholdType: 'percent',
      customDiffDir: `${process.cwd()}/__snapshots__/__diff__`,
    });
  },
};
