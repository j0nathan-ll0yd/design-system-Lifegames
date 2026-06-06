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
      // Allow up to 0.2% pixel diff to absorb sub-pixel anti-aliasing variance.
      failureThreshold: 0.002,
      failureThresholdType: 'percent',
      customDiffDir: `${process.cwd()}/__snapshots__/__diff__`,
    });
  },
};
