import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
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
const SNAPSHOT_DIR = join(process.cwd(), '__snapshots__')

// Floor sits ~1.8x below the least-busy guarded story (primitives-pollstatus--off,
// measured 0.0177%). Blank frames measure exactly 0.0000%.
const MIN_CONTENT_RATIO = 0.0001

// Pixel diff deliberately remains tolerant of cross-environment AA variance. Catch
// structural changes separately: if one render has less than half the content
// footprint of the other, a component probably appeared or disappeared. The
// absolute floor prevents a handful of background-edge pixels from tripping this.
const MAX_CONTENT_RATIO_SWING = 0.5

/* Stories that legitimately render (near-)blank. Listed explicitly so the
   exemption is visible and tracked rather than absorbed by a lowered threshold —
   an unexplained entry here is a bug, not a config detail.

   All three are dismissed-modal states whose whole point is that nothing is
   painted: the overlay resolves to `display: none`, so an empty frame is the
   correct render, not a broken one. Verified via computed style rather than
   pixels — primitives-modal--visible is `display: flex` and does render. */
const SENTINEL_EXEMPT = new Set([
  'primitives-modal--hidden',
  'production-reading-bookmodal--empty',
  'production-reading-bookmodal--loading'
])

function isNear(pixel, colour) {
  return Math.abs(pixel.r - colour.r) <= BG_TOLERANCE && Math.abs(pixel.g - colour.g) <= BG_TOLERANCE && Math.abs(pixel.b - colour.b) <= BG_TOLERANCE
}

export function contentRatio(buffer) {
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

export function contentRatioSwing(currentRatio, baselineRatio) {
  const largerRatio = Math.max(currentRatio, baselineRatio)
  if (largerRatio < MIN_CONTENT_RATIO) {
    return 0
  }
  return Math.abs(currentRatio - baselineRatio) / largerRatio
}

export function assertContentRatioStable(storyId, currentRatio, baselineRatio) {
  const swing = contentRatioSwing(currentRatio, baselineRatio)
  if (swing < MAX_CONTENT_RATIO_SWING) {
    return
  }

  throw new Error(
    `Structural content sentinel: "${storyId}" changed from ${(baselineRatio * 100).toFixed(4)}% ` +
      `non-background pixels in the baseline to ${(currentRatio * 100).toFixed(4)}% now ` +
      `(${(swing * 100).toFixed(1)}% relative swing; limit ${(MAX_CONTENT_RATIO_SWING * 100).toFixed(0)}%). ` +
      `A component may have appeared or disappeared inside the frame. Review the live render and baseline; ` +
      `use storybook:visual:update to re-mint every baseline from an empty set when the change is intentional.`
  )
}

/** @type {import('@storybook/test-runner').TestRunnerConfig} */
export default {
  setup() {
    expect.extend({toMatchImageSnapshot})
  },

  async postVisit(page, context) {
    const image = await page.screenshot({animations: 'disabled'})
    const currentRatio = contentRatio(image)

    if (!SENTINEL_EXEMPT.has(context.id)) {
      if (currentRatio < MIN_CONTENT_RATIO) {
        throw new Error(
          `Content sentinel: "${context.id}" rendered ${(currentRatio * 100).toFixed(4)}% non-background pixels, ` +
            `below the ${(MIN_CONTENT_RATIO * 100).toFixed(4)}% floor. The story is blank or invisible — ` +
            `snapshotting it would guard nothing. Check that its styles actually applied ` +
            `(see the cascade-layer note in packages/tokens/src/compat.css) before touching this threshold.`
        )
      }
    }

    const baselinePath = join(SNAPSHOT_DIR, `${context.id}.png`)
    const baselineRatio = existsSync(baselinePath) ? contentRatio(readFileSync(baselinePath)) : null

    expect(image).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOT_DIR,
      customSnapshotIdentifier: context.id,
      // Allow up to 2% pixel diff. The dark-bg decorator from the
      // Storybook a11y fix renders differently on Linux CI vs local
      // macOS recording (font hinting, gradient interpolation,
      // sub-pixel anti-aliasing). Observed CI variance: ~1.2%.
      failureThreshold: 0.02,
      failureThresholdType: 'percent',
      customDiffDir: join(SNAPSHOT_DIR, '__diff__')
    })

    // Run this after the pixel matcher so ordinary (>2%) failures still emit
    // their useful diff artifact. This catches only changes the matcher accepted.
    if (baselineRatio !== null) {
      assertContentRatioStable(context.id, currentRatio, baselineRatio)
    }
  }
}
