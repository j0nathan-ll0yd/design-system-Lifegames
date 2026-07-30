import {toMatchImageSnapshot} from 'jest-image-snapshot'
import {PNG} from 'pngjs'

/* CONTENT SENTINEL
   ----------------
   A story that renders nothing still produces a perfectly self-consistent
   snapshot: check mode compares blank to blank and passes forever. That is how
   52 baselines (every Production/* widget) sat blank and green — .tri-card was
   stuck at opacity: 0 because compat.css's visibility override had lost a
   cascade-layer fight it could never win (#123).

   So before comparing pixels, assert the frame actually contains rendered
   content: count pixels that are neither the page background (white) nor the
   dark decorator background, and require a minimum share. This runs in update
   mode too, so a blank baseline can never be minted in the first place. */

const PAGE_BG = {r: 255, g: 255, b: 255}
const DECORATOR_BG = {r: 0x06, g: 0x06, b: 0x0f}
const BG_TOLERANCE = 10

// Floor sits ~1.8x below the least-busy guarded story (primitives-pollstatus--off,
// measured 0.0177%). Blank frames measure exactly 0.0000%.
const MIN_CONTENT_RATIO = 0.0001

/* Stories that render (near-)blank today for reasons unrelated to #123. Listed
   explicitly so the exemption is visible and tracked rather than absorbed by a
   lowered threshold — an unexplained entry here is a bug, not a config detail.
   - primitives-skeleton--*: .lg-skeleton-* is defined only in the scoped <style>
     of packages/web/src/components/Skeleton.astro, but Skeleton.stories.ts
     hand-renders the markup with lit, so those styles never load.
   - production-reading-bookmodal--empty/--loading: empty state legitimately
     renders only the close button. */
const SENTINEL_EXEMPT = new Set([
  'primitives-skeleton--bar',
  'primitives-skeleton--bar-wide',
  'primitives-skeleton--circle',
  'primitives-skeleton--circle-large',
  'production-reading-bookmodal--empty',
  'production-reading-bookmodal--loading'
])

function isNear(pixel, colour) {
  return Math.abs(pixel.r - colour.r) <= BG_TOLERANCE && Math.abs(pixel.g - colour.g) <= BG_TOLERANCE && Math.abs(pixel.b - colour.b) <= BG_TOLERANCE
}

function contentRatio(buffer) {
  const {data, width, height} = PNG.sync.read(buffer)
  let content = 0
  for (let i = 0; i < data.length; i += 4) {
    const pixel = {r: data[i], g: data[i + 1], b: data[i + 2]}
    if (!isNear(pixel, PAGE_BG) && !isNear(pixel, DECORATOR_BG)) {
      content++
    }
  }
  return content / (width * height)
}

/** @type {import('@storybook/test-runner').TestRunnerConfig} */
export default {
  setup() {
    expect.extend({toMatchImageSnapshot})
  },

  async postVisit(page, context) {
    const image = await page.screenshot({animations: 'disabled'})

    if (!SENTINEL_EXEMPT.has(context.id)) {
      const ratio = contentRatio(image)
      if (ratio < MIN_CONTENT_RATIO) {
        throw new Error(
          `Content sentinel: "${context.id}" rendered ${(ratio * 100).toFixed(4)}% non-background pixels, ` +
            `below the ${(MIN_CONTENT_RATIO * 100).toFixed(4)}% floor. The story is blank or invisible — ` +
            `snapshotting it would guard nothing. Check that its styles actually applied ` +
            `(see the cascade-layer note in packages/tokens/src/compat.css) before touching this threshold.`
        )
      }
    }

    expect(image).toMatchImageSnapshot({
      customSnapshotsDir: `${process.cwd()}/__snapshots__`,
      customSnapshotIdentifier: context.id,
      // Allow up to 2% pixel diff. The dark-bg decorator from the
      // Storybook a11y fix renders differently on Linux CI vs local
      // macOS recording (font hinting, gradient interpolation,
      // sub-pixel anti-aliasing). Observed CI variance: ~1.2%.
      failureThreshold: 0.02,
      failureThresholdType: 'percent',
      customDiffDir: `${process.cwd()}/__snapshots__/__diff__`
    })
  }
}
