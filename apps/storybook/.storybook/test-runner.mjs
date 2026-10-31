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

// Structural check behind the pixel matcher: if one render has less than half the
// content footprint of the other, a component probably appeared or disappeared.
// The absolute floor prevents a handful of background-edge pixels from tripping
// this. Under the pixel bound below it can fire only when a story's whole content
// is under about 2 x MAX_DIFF_PIXELS pixels; it stays as a cheap second net.
const MAX_CONTENT_RATIO_SWING = 0.5

/* PIXEL BOUND
   -----------
   The gate allowed a 2% diff (18,432 px of the 1280x720 frame) to absorb macOS vs
   Linux recording differences. Measured 2026-10-30 (research branch
   research/vr-gate-variance, runs below), that tolerance covered no noise:
   - CI vs CI: update-mode runs 41134852030, 41135062245 and 41135299348 (commit
     9fdf419) and 41114705590 / 41118793831 (DS #343) rendered all 122 stories
     byte-identical. Noise is 0 px.
   - Sensitivity: run 41135702627 rendered single DOM mutations against their
     controls. The smallest real change was one letter in a Bookshelf author name,
     25 px (0.0027%). At 2% the gate caught 1 of 22 mutants (a removed row).
   - Drift: 77 of the 96 baselines recorded in #144 differed from a CI render because
     code changed after them (run 41136521812 re-rendered #144-era code on today's
     lane), and the 2% tolerance passed every one.
   - With Space Grotesk loaded (this file's font wait), runs 41156583946,
     41156778029 and 41156936282 again rendered all stories byte-identical, and
     the smallest real change was one digit of the Bookshelf progress (68 to 69),
     31 px.
   So the bound is a pixel count: 10 px, below the smallest real change in either
   measurement (25 px, 31 px) with a 2.5x margin, and above the measured noise
   (0 px) so a stray few-pixel flake does not red a story. Record baselines only
   through the update-mode dispatch, which records on the same CI lane that checks
   them. A runner image change (Chromium, system libraries) moves every story;
   re-record then. */
export const MAX_DIFF_PIXELS = 10
export const SMALLEST_MEASURED_REAL_CHANGE_PIXELS = 25

/** jest-image-snapshot options for every story. */
export function imageSnapshotOptions(storyId) {
  return {
    customSnapshotsDir: SNAPSHOT_DIR,
    customSnapshotIdentifier: storyId,
    failureThreshold: MAX_DIFF_PIXELS,
    failureThresholdType: 'pixel',
    customDiffDir: join(SNAPSHOT_DIR, '__diff__')
  }
}

/* FONT WAIT
   ---------
   preview.ts loads Space Grotesk through the tokens package `fonts` entrypoint, with
   `font-display: swap`. A snapshot taken before a face loads draws the fallback
   face, and the next run may not: a font race would bring back the noise the 0 px
   measurement removed. So before every screenshot, load every declared Space
   Grotesk face explicitly (not only the faces the story's glyphs request, which
   would make the loaded set depend on the text), wait for document.fonts.ready and
   two animation frames for the relayout, then require that each face reports
   `loaded`. A missing or failed face fails the story; it never snapshots the
   fallback. */
export const BRAND_FONT_FAMILY = 'Space Grotesk'

export function assertBrandFontsLoaded(storyId, faces) {
  if (faces.length === 0) {
    throw new Error(
      `Font wait: "${storyId}" declares no ${BRAND_FONT_FAMILY} @font-face. Check that preview.ts imports ` +
        `the tokens package fonts entrypoint; a snapshot now would draw the fallback face.`
    )
  }
  const notLoaded = faces.filter((face) => face.status !== 'loaded')
  if (notLoaded.length > 0) {
    throw new Error(
      `Font wait: "${storyId}" has ${notLoaded.length} of ${faces.length} ${BRAND_FONT_FAMILY} faces not loaded ` + `(${
        notLoaded.map((face) => `${face.unicodeRange}: ${face.status}`).join('; ')
      }). Check that main.ts ` + `staticDirs serves /fonts; a snapshot now would draw the fallback face.`
    )
  }
}

async function waitForBrandFonts(page, storyId) {
  const faces = await page.evaluate(async (family) => {
    const brand = [...document.fonts].filter((face) => face.family.replace(/["']/g, '') === family)
    await Promise.all(brand.map((face) => face.load().catch(() => undefined)))
    await document.fonts.ready
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    return brand.map((face) => ({unicodeRange: face.unicodeRange, status: face.status}))
  }, BRAND_FONT_FAMILY)
  assertBrandFontsLoaded(storyId, faces)
}

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
    await waitForBrandFonts(page, context.id)
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

    expect(image).toMatchImageSnapshot(imageSnapshotOptions(context.id))

    // Run this after the pixel matcher so ordinary failures still emit their diff
    // artifact. This catches only changes the matcher accepted.
    if (baselineRatio !== null) {
      assertContentRatioStable(context.id, currentRatio, baselineRatio)
    }
  }
}
