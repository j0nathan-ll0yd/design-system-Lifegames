// Known-answer suite for the WCAG-AA contrast gate (F-021/F-022).
//
// One of the five D3 gates that had no can-fail proof (atlas decision 0111
// phase 1, backfill finding 1).
//
// What is proved here:
//
//   - A token pair below its threshold REDS, at the 4.5:1 body tier and at the
//     3.0:1 large-text/non-text tier, and the boundary is the declared number
//     rather than an approximation of it.
//   - --allow-fail DEMOTES exactly the named pairing and nothing else. An
//     allow-list entry for a different id leaves the real failure gating, and an
//     entry for a PASSING pairing does not count as a whitelist.
//   - Alpha compositing is real: an overlay token is blended over surface-base
//     before the ratio is taken, so a translucent text token is not scored as
//     if it were opaque.
//   - A token the pairing table names but the stylesheet omits THROWS. A gate
//     over 24 pairings must not silently score fewer.
//
// The stylesheet is fed in directly rather than read from disk: tokens.css is a
// build artifact, and a suite that depends on `pnpm build:tokens` having run
// proves the build, not the gate.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import {evaluateContrast, PAIRINGS} from '../checks/d3-contrast.mjs'

const CSS_REL = 'packages/tokens/dist/tokens.css'

// A palette every declared pairing passes against: near-black surfaces with
// high-luminance foregrounds.
const PASSING = {
  '--lg-color-surface-base': '#000000',
  '--lg-color-surface-raised': '#000000',
  '--lg-color-surface-deep': '#000000',
  '--lg-color-text-title': '#ffffff',
  '--lg-color-text-primary': '#ffffff',
  '--lg-color-text-muted': '#ffffff',
  '--lg-color-accent-pink': '#ffffff',
  '--lg-color-accent-blue': '#ffffff',
  '--lg-color-accent-green': '#ffffff',
  '--lg-color-accent-amber': '#ffffff',
  '--lg-color-accent-purple': '#ffffff'
}

/** Render a `:root {}` stylesheet from a token map. */
function stylesheet(overrides = {}) {
  const tokens = {...PASSING, ...overrides}
  return `:root {\n${Object.entries(tokens).map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}\n`
}

test('a fully passing palette produces no failure and scores every declared pairing', () => {
  const result = evaluateContrast({css: stylesheet()})
  assert.deepEqual(result.failures, [])
  assert.equal(result.results.length, PAIRINGS.length)
  assert.equal(result.pairingCount, 24, 'the pairing table is 9 text pairings plus 15 accent-on-surface')
})

test('body text below 4.5:1 is rejected', () => {
  // #747474 on #000000 scores 4.4929:1 — just under the body threshold.
  const result = evaluateContrast({css: stylesheet({'--lg-color-text-primary': '#747474'})})
  const failed = result.failures.filter((f) => f.textName === '--lg-color-text-primary')
  assert.equal(failed.length, 3, 'text-primary is paired against all three surfaces')
  for (const f of failed) {
    assert.equal(f.min, 4.5)
    assert.ok(f.ratio < 4.5, `${f.id} scored ${f.ratio}`)
  }
})

test('a heading below 3:1 is rejected at the large-text threshold', () => {
  // #595959 on #000000 scores 2.9980:1 — just under the large-text threshold.
  const result = evaluateContrast({css: stylesheet({'--lg-color-text-title': '#595959'})})
  const failed = result.failures.filter((f) => f.textName === '--lg-color-text-title')
  assert.equal(failed.length, 3)
  assert.equal(failed[0].min, 3.0)
})

test('an accent below 3:1 on a surface is rejected — F-021/F-022 non-text UI', () => {
  const result = evaluateContrast({css: stylesheet({'--lg-color-accent-amber': '#3a3a3a'})})
  const failed = result.failures.filter((f) => f.textName === '--lg-color-accent-amber')
  assert.equal(failed.length, 3)
  assert.ok(result.failures.every((f) => f.textName === '--lg-color-accent-amber'), 'only the mutated accent fails')
})

test('the 4.5:1 boundary is the declared number, not an approximation', () => {
  // One 8-bit channel step apart: #757575 scores 4.5578:1, #747474 scores 4.4929:1.
  const above = evaluateContrast({css: stylesheet({'--lg-color-text-muted': '#757575'})})
  assert.deepEqual(above.failures, [], 'a pairing above 4.5:1 must pass')

  const below = evaluateContrast({css: stylesheet({'--lg-color-text-muted': '#747474'})})
  assert.equal(below.failures.length, 3, 'a pairing one channel step under 4.5:1 must fail')
})

test('--allow-fail demotes exactly the named pairing', () => {
  const css = stylesheet({'--lg-color-accent-amber': '#3a3a3a'})

  const gated = evaluateContrast({css})
  assert.equal(gated.failures.length, 3)

  const partly = evaluateContrast({css, allowFail: ['accent.amber-on-surface.base']})
  assert.equal(partly.failures.length, 2, 'one id demotes one pairing, not the family')
  assert.equal(partly.allowedFailCount, 1)
  assert.ok(!partly.failures.some((f) => f.id === 'accent.amber-on-surface.base'))
})

test('an --allow-fail entry for a DIFFERENT pairing does not suppress the real failure', () => {
  const result = evaluateContrast({css: stylesheet({'--lg-color-accent-blue': '#3a3a3a'}), allowFail: ['accent.amber-on-surface.base']})
  assert.equal(result.failures.length, 3)
  assert.ok(result.failures.every((f) => f.textName === '--lg-color-accent-blue'))
  assert.equal(result.allowedFailCount, 0, 'an allow-list entry for a passing pairing is not a whitelist')
})

test('a translucent SURFACE is composited over surface-base before scoring', () => {
  // rgba(255,255,255,0.06) over #000000 lands on #0f0f0f, which white text
  // clears at 19.13:1. Taken at face value culori scores the same pair at
  // 1.00:1 and every pairing on that surface would red — the compositing step
  // is what separates the two, and nothing proved it still ran.
  const result = evaluateContrast({css: stylesheet({'--lg-color-surface-raised': 'rgba(255, 255, 255, 0.06)'})})
  assert.deepEqual(result.failures, [])
  const raised = result.results.filter((r) => r.surfName === '--lg-color-surface-raised')
  assert.equal(raised.length, 8, 'three text pairings plus five accent pairings sit on surface-raised')
  for (const r of raised) {
    assert.equal(r.surfHex, '#0f0f0f', 'the surface must be reported at its composited value')
    assert.ok(r.ratio > 15, `expected the composited ratio, got ${r.ratio}`)
  }
})

test('a MISSING token throws rather than silently scoring fewer pairings', () => {
  const tokens = {...PASSING}
  delete tokens['--lg-color-accent-purple']
  const css = `:root {\n${Object.entries(tokens).map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}\n`
  assert.throws(() => evaluateContrast({css}), /missing token: --lg-color-accent-purple/)
})

test('an EMPTY stylesheet throws — the gate cannot score an absent palette', () => {
  assert.throws(() => evaluateContrast({css: ''}), /missing token:/)
})

test('the real built tokens.css passes the gate', (t) => {
  const cssPath = path.resolve(import.meta.dirname, '..', '..', CSS_REL)
  if (!fs.existsSync(cssPath)) {
    t.skip(`${CSS_REL} not built — run \`pnpm build:tokens\` to exercise the real-tree case`)
    return
  }
  const result = evaluateContrast({css: fs.readFileSync(cssPath, 'utf8')})
  assert.deepEqual(result.failures, [])
})
