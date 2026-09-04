// Known-answer suite for the P1 token parity gate (GOVERNANCE.md §5, F-006).
//
// One of the five D3 gates that had no can-fail proof (atlas decision 0111
// phase 1, backfill finding 1).
//
// What is proved here:
//
//   - A hex divergence between the web CSS and the Swift xcasset for the same
//     role REDS, at both the primitive tier (accent-*) and the semantic tier
//     (surface-*, text-*) — F-006 made semantic roles first-class parity
//     citizens, and nothing held the gate to it.
//   - The parity-exceptions.json allow-list DEMOTES a divergence rather than
//     hiding it, and a role NOT in the file still reds.
//   - Normalisation is real: #abc and #aabbcc agree, a float sRGB component and
//     a 0-255 component both resolve, and an 8-digit hex drops its alpha.
//   - An EMPTY side reds. tokens.css is a build artifact downloaded from the
//     `token-dist` CI artifact, and both loaders used to return an empty Map
//     when their source was missing. Zero roles meant zero comparisons, zero
//     mismatches and exit 0.
//
// Every case builds a throwaway fixture tree and points `compareTokenParity` at
// it with an explicit `root`.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {compareTokenParity} from './check-token-parity.mjs'

const CSS_REL = 'packages/tokens/dist/tokens.css'
const XCASSETS_REL = 'Sources/LifegamesTokens/Resources/Colors.xcassets'
const EXCEPTIONS_REL = 'tokens/parity-exceptions.json'

/**
 * Materialise a fixture repo carrying both platform token outputs.
 *
 * @param {{web?: Record<string, string>, swift?: Record<string, object>, exceptions?: string[] | null}} spec
 *   `web` maps role → CSS value; `swift` maps role → an xcasset `components` object.
 * @returns {string} the fixture root
 */
function fixture({web = {}, swift = {}, exceptions = []} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fixds-parity-'))

  const webEntries = Object.entries(web)
  if (webEntries.length > 0) {
    const css = `:root {\n${webEntries.map(([role, value]) => `  --lg-color-${role}: ${value};`).join('\n')}\n}\n`
    const cssPath = path.join(root, CSS_REL)
    fs.mkdirSync(path.dirname(cssPath), {recursive: true})
    fs.writeFileSync(cssPath, css)
  }

  for (const [role, components] of Object.entries(swift)) {
    const dir = path.join(root, XCASSETS_REL, `color-${role}.colorset`)
    fs.mkdirSync(dir, {recursive: true})
    fs.writeFileSync(path.join(dir, 'Contents.json'),
      JSON.stringify({info: {author: 'test', version: 1}, colors: [{idiom: 'universal', color: {'color-space': 'srgb', components}}]}, null, 2))
  }

  if (exceptions !== null) {
    const exPath = path.join(root, EXCEPTIONS_REL)
    fs.mkdirSync(path.dirname(exPath), {recursive: true})
    fs.writeFileSync(exPath, JSON.stringify(exceptions, null, 2))
  }

  return root
}

/** sRGB float components for #ff2d95. */
const PINK_FLOAT = {red: '0.999', green: '0.176', blue: '0.584', alpha: '1.000'}
/** sRGB float components for #101014. */
const BASE_FLOAT = {red: '0.063', green: '0.063', blue: '0.078', alpha: '1.000'}

test('matching roles across both platforms produce no violation', () => {
  const result = compareTokenParity({
    root: fixture({web: {'accent-pink': '#ff2d95', 'surface-base': '#101014'}, swift: {'accent-pink': PINK_FLOAT, 'surface-base': BASE_FLOAT}})
  })
  assert.deepEqual(result.violations, [])
  assert.deepEqual(result.mismatches, [])
  assert.equal(result.sortedRoles.length, 2)
})

test('a PRIMITIVE-tier hex divergence is rejected', () => {
  const result = compareTokenParity({
    root: fixture({
      web: {'accent-pink': '#ff2d95'},
      // #00ff00 instead of #ff2d95
      swift: {'accent-pink': {red: '0.000', green: '1.000', blue: '0.000', alpha: '1.000'}}
    })
  })
  assert.equal(result.mismatches.length, 1)
  assert.equal(result.mismatches[0].role, 'accent-pink')
  assert.equal(result.mismatches[0].web, '#ff2d95')
  assert.equal(result.mismatches[0].swift, '#00ff00')
  assert.ok(result.violations.some((v) => v.startsWith('p1-hex-divergence: accent-pink')))
})

test('a SEMANTIC-tier hex divergence is rejected — F-006 made these first-class', () => {
  const result = compareTokenParity({
    root: fixture({
      web: {'text-primary': '#f0f0f0'},
      // zinc.200 (#e4e4e7) instead of zinc.300 (#f0f0f0) — the historical divergence
      swift: {'text-primary': {red: '0.894', green: '0.894', blue: '0.906', alpha: '1.000'}}
    })
  })
  assert.equal(result.mismatches.length, 1)
  assert.equal(result.mismatches[0].role, 'text-primary')
  assert.ok(result.violations.some((v) => v.startsWith('p1-hex-divergence: text-primary')))
})

test('a role listed in parity-exceptions.json is demoted, not hidden', () => {
  const spec = {web: {'accent-amber': '#ffb300'}, swift: {'accent-amber': {red: '1.000', green: '0.500', blue: '0.000', alpha: '1.000'}}}

  const gated = compareTokenParity({root: fixture({...spec, exceptions: []})})
  assert.equal(gated.mismatches.length, 1, 'without the exception the divergence must red')

  const exempted = compareTokenParity({root: fixture({...spec, exceptions: ['accent-amber']})})
  assert.deepEqual(exempted.violations, [])
  assert.equal(exempted.exemptedMismatches.length, 1)
  assert.equal(exempted.exemptedMismatches[0].role, 'accent-amber', 'an exempted divergence stays visible in the table')
})

test('an exception for a DIFFERENT role does not suppress the real divergence', () => {
  const result = compareTokenParity({
    root: fixture({
      web: {'accent-blue': '#2d95ff'},
      swift: {'accent-blue': {red: '0.000', green: '0.000', blue: '0.000', alpha: '1.000'}},
      exceptions: ['accent-pink']
    })
  })
  assert.equal(result.mismatches.length, 1)
  assert.equal(result.mismatches[0].role, 'accent-blue')
})

test('hex normalisation agrees across shorthand, alpha and component encodings', () => {
  // #abc expands to #aabbcc; the 8-digit form drops its alpha; the Swift side is
  // given 0-255 integers rather than floats.
  const result = compareTokenParity({
    root: fixture({
      web: {'border-subtle': '#abc', 'surface-deep': '#aabbccff'},
      swift: {
        'border-subtle': {red: '170', green: '187', blue: '204', alpha: '1.000'},
        'surface-deep': {red: '0xAA', green: '0xBB', blue: '0xCC', alpha: '1.000'}
      }
    })
  })
  assert.deepEqual(result.violations, [], 'normalisation must not manufacture a divergence')
  assert.equal(result.web.get('border-subtle'), '#aabbcc')
  assert.equal(result.swift.get('surface-deep'), '#aabbcc')
})

test('a role present on only one platform is reported without gating', () => {
  const result = compareTokenParity({root: fixture({web: {'neon-lime': '#ccff00'}, swift: {'health-good': BASE_FLOAT}})})
  assert.deepEqual(result.webOnly, ['neon-lime'])
  assert.deepEqual(result.swiftOnly, ['health-good'])
  assert.deepEqual(result.mismatches, [])
})

test('a MISSING tokens.css REDS instead of comparing zero roles', () => {
  // The vacuity hole: tokens.css is a build artifact downloaded in CI. An empty
  // web map used to produce zero comparisons and exit 0.
  const result = compareTokenParity({root: fixture({swift: {'accent-pink': PINK_FLOAT}})})
  assert.deepEqual(result.emptySources, [CSS_REL])
  assert.ok(result.violations.some((v) => v.startsWith('empty-parity-source:')))
})

test('a MISSING xcassets directory REDS', () => {
  const result = compareTokenParity({root: fixture({web: {'accent-pink': '#ff2d95'}})})
  assert.deepEqual(result.emptySources, [XCASSETS_REL])
  assert.ok(result.violations.some((v) => v.includes(XCASSETS_REL)))
})

test('an EMPTY fixture root reds on both sides — the gate cannot be aimed at nothing', () => {
  const result = compareTokenParity({root: fixture({})})
  assert.deepEqual(result.emptySources, [CSS_REL, XCASSETS_REL])
  assert.equal(result.violations.length, 2)
})

test('the real repository tree passes the gate once tokens are built', (t) => {
  // tokens.css is emitted by `pnpm build:tokens` and downloaded as the
  // `token-dist` artifact in governance-gates, so it is absent in a bare
  // checkout. Skipping is honest here; the fixture cases above carry the
  // can-fail proof either way.
  if (!fs.existsSync(path.resolve(import.meta.dirname, '..', CSS_REL))) {
    t.skip(`${CSS_REL} not built — run \`pnpm build:tokens\` to exercise the real-tree case`)
    return
  }
  const result = compareTokenParity()
  assert.deepEqual(result.violations, [])
  assert.ok(result.sortedRoles.length > 0)
})
