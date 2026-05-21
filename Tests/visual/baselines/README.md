# Visual Regression Baselines

## showcase.png

- **Captured:** Pending initial capture after Phase E completion
- **Viewport:** 1440x900
- **Threshold:** 5% max pixel diff ratio
- **Conditions:** Static fixture data, no live API calls, Space Grotesk font loaded
- **Capture command:** `npx playwright test Tests/visual/production-mirror.spec.ts --update-snapshots`

The baseline will be captured from the first successful build of the production mirror showcase page.
