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
      // Allow up to 2% pixel diff. The dark-bg decorator from the
      // Storybook a11y fix renders differently on Linux CI vs local
      // macOS recording (font hinting, gradient interpolation,
      // sub-pixel anti-aliasing). Observed CI variance: ~1.2%.
      failureThreshold: 0.02,
      failureThresholdType: 'percent',
      customDiffDir: `${process.cwd()}/__snapshots__/__diff__`,
    });
  },
};
