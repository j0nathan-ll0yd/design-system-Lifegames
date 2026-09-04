// Known-answer suite for the P4/P7 promotion gate (GOVERNANCE.md §5).
//
// One of the five D3 gates that had no can-fail proof (atlas decision 0111
// phase 1, backfill finding 1). The gate's blocking condition is narrow — a
// widget marked `status: "Stable"` with fewer than two consuming surfaces — and
// nothing proved it still fired.
//
// The cases below cover the decisive boundary in both directions (1 surface
// reds, 2 surfaces pass), the states that deliberately do NOT block
// (incubating, one-surface advisory), and the vacuity hole the refactor closed:
// a missing registry file used to degrade to an empty array, so the admission
// gate evaluated zero entries and exited 0.
//
// Every case builds a throwaway fixture tree and points `evaluatePromotion` at
// it with an explicit `root`.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {evaluatePromotion} from './check-promotion.mjs'

const SWIFT_REGISTRY = 'Sources/LifegamesWidgets/Resources/production-widgets.json'
const WEB_REGISTRY = 'widget-consumers.json'

/**
 * Materialise a fixture repo with both registries.
 * @param {{swift?: unknown[], web?: unknown[], omit?: string[]}} spec
 * @returns {string} the fixture root
 */
function fixture({swift = [], web = [], omit = []} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fixds-promotion-'))
  const files = {[SWIFT_REGISTRY]: JSON.stringify(swift, null, 2), [WEB_REGISTRY]: JSON.stringify({widgets: web}, null, 2)}
  for (const [rel, contents] of Object.entries(files)) {
    if (omit.includes(rel)) {
      continue
    }
    const full = path.join(root, rel)
    fs.mkdirSync(path.dirname(full), {recursive: true})
    fs.writeFileSync(full, contents)
  }
  return root
}

/** A widget that satisfies P7: Stable with two real surfaces. */
const COMPLIANT = {name: 'StepsRing', platform: 'swift', status: 'Stable', consumers: ['ios-app', 'watch-app']}

test('a compliant registry pair produces no violation', () => {
  const result = evaluatePromotion({root: fixture({swift: [COMPLIANT], web: []})})
  assert.deepEqual(result.violations, [])
  assert.deepEqual(result.stableAdvisory, [])
  assert.equal(result.entries.length, 1)
})

// covers: widget-contract#A widget labelled Stable has at least two real product surfaces
test('a Stable widget with ONE surface is rejected — the P7 boundary', () => {
  const result = evaluatePromotion({root: fixture({swift: [{name: 'SleepRing', platform: 'swift', status: 'Stable', consumers: ['ios-app']}]})})
  assert.equal(result.stableAdvisory.length, 1)
  assert.equal(result.stableAdvisory[0].name, 'SleepRing')
  assert.ok(result.violations.some((v) => v.startsWith('p7-stable-under-two-surfaces:')))
})

test('a Stable widget with ZERO surfaces is rejected', () => {
  const result = evaluatePromotion({root: fixture({swift: [{name: 'GhostRing', platform: 'swift', status: 'Stable', consumers: []}]})})
  assert.equal(result.stableAdvisory.length, 1)
  assert.ok(result.violations.some((v) => v.includes('GhostRing')))
})

test('the P7 boundary is >= 2: two surfaces pass, and the same widget at one surface does not', () => {
  const two = evaluatePromotion({root: fixture({swift: [{name: 'Edge', platform: 'swift', status: 'Stable', consumers: ['a', 'b']}]})})
  assert.deepEqual(two.violations, [])

  const one = evaluatePromotion({root: fixture({swift: [{name: 'Edge', platform: 'swift', status: 'Stable', consumers: ['a']}]})})
  assert.equal(one.violations.length, 1)
})

test('the WEB registry is evaluated too — a Stable web widget with one surface reds', () => {
  const result = evaluatePromotion({root: fixture({web: [{name: 'BooksShelf', status: 'Stable', consumers: ['website']}]})})
  assert.equal(result.stableAdvisory.length, 1)
  assert.equal(result.stableAdvisory[0].source, WEB_REGISTRY)
  assert.ok(result.violations.some((v) => v.includes('BooksShelf')))
})

// covers: widget-contract#A widget labelled Stable has at least two real product surfaces
test('an INCUBATING widget is a valid state, not a violation', () => {
  const result = evaluatePromotion({root: fixture({swift: [{name: 'NewIdea', platform: 'swift', status: 'Experimental', consumers: []}]})})
  assert.equal(result.incubating.length, 1)
  assert.deepEqual(result.violations, [])
})

test('a one-surface NON-Stable widget is advisory, not a violation', () => {
  const result = evaluatePromotion({root: fixture({swift: [{name: 'Almost', platform: 'swift', status: 'Beta', consumers: ['ios-app']}]})})
  assert.equal(result.oneSurfaceAdvisory.length, 1)
  assert.deepEqual(result.violations, [])
})

test('a MISSING registry REDS instead of degrading to an empty corpus', () => {
  // The vacuity hole: before this change a deleted or renamed registry yielded
  // `[]`, so the admission gate evaluated zero entries and exited 0.
  const result = evaluatePromotion({root: fixture({swift: [COMPLIANT], omit: [WEB_REGISTRY]})})
  assert.deepEqual(result.missingRegistries, [WEB_REGISTRY])
  assert.ok(result.violations.some((v) => v.startsWith('missing-registry:')))
})

test('an EMPTY fixture root reds on both registries — the gate cannot be aimed at nothing', () => {
  const result = evaluatePromotion({root: fixture({omit: [SWIFT_REGISTRY, WEB_REGISTRY]})})
  assert.deepEqual(result.missingRegistries, [SWIFT_REGISTRY, WEB_REGISTRY])
  assert.equal(result.violations.length, 2)
  assert.equal(result.entries.length, 0)
})

test('the real repository registries pass the gate over a non-empty corpus', () => {
  const result = evaluatePromotion()
  assert.deepEqual(result.violations, [])
  assert.ok(result.entries.length > 0, 'the real registries must contribute a non-empty corpus')
})
