// Known-answer suite for the DTCG 2025.10 conformance validator.
//
// One of the five D3 gates that had no can-fail proof (atlas decision 0111
// phase 1, backfill finding 1). This one also runs in a DIFFERENT CI job from
// the other five — `build-tokens`, not `governance-gates` — which is why D3's
// runner declaration had to grow a second entry alongside this suite.
//
// What is proved here:
//
//   - Each hard rule fires: BARE_VALUE_KEY, BARE_TYPE_KEY, INVALID_TYPE,
//     MISSING_TYPE, SHADOW_MISSING_FIELD, TYPOGRAPHY_INVALID_VALUE,
//     INVALID_NODE, PARSE_ERROR.
//   - MISSING_DESCRIPTION stays ADVISORY — it is reported but excluded from the
//     hard set that gates. That split is the whole exit-code contract and
//     nothing held it.
//   - $type INHERITANCE from a group node works, so a leaf under a typed group
//     is not falsely reported as MISSING_TYPE.
//   - The documented `tokens/projections/**` exclusion is real.
//   - An EMPTY source corpus reds. `walk()` returns `[]` for a directory that is
//     not there, so a renamed tokens tree left the validator conforming over
//     nothing at exit 0.
//
// Every case builds a throwaway fixture tree and points `validateDtcg` at it
// with an explicit `root`.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {validateDtcg} from '../checks/d3-validate-dtcg.mjs'

/**
 * Materialise a fixture repo of token files.
 * @param {Record<string, unknown | string>} files repo-relative path → JSON value (or raw string)
 * @returns {string} the fixture root
 */
function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fixds-dtcg-'))
  for (const [rel, value] of Object.entries(files)) {
    const full = path.join(root, rel)
    fs.mkdirSync(path.dirname(full), {recursive: true})
    fs.writeFileSync(full, typeof value === 'string' ? value : JSON.stringify(value, null, 2))
  }
  return root
}

/** A conformant single-token file. */
function cleanTokens(extra = {}) {
  return {color: {accent: {pink: {$type: 'color', $value: '#ff2d95', $description: 'Primary accent.'}}}, ...extra}
}

/** Rule ids present in a result. */
function rules(result) {
  return Object.keys(result.byRule).sort()
}

test('a conformant token file produces no violation', () => {
  const result = validateDtcg({root: fixture({'tokens/color.tokens.json': cleanTokens()})})
  assert.deepEqual(result.violations, [])
  assert.equal(result.sourceFiles.length, 1)
})

test('a deprecated bare "value" key is rejected', () => {
  const result = validateDtcg({
    root: fixture({'tokens/color.tokens.json': {color: {pink: {$type: 'color', value: '#ff2d95', $value: '#ff2d95', $description: 'x'}}}})
  })
  assert.ok(rules(result).includes('BARE_VALUE_KEY'))
  assert.ok(result.hardViolations.some((v) => v.rule === 'BARE_VALUE_KEY'))
})

test('a deprecated bare "type" key is rejected', () => {
  const result = validateDtcg({
    root: fixture({'tokens/color.tokens.json': {color: {pink: {type: 'color', $type: 'color', $value: '#ff2d95', $description: 'x'}}}})
  })
  assert.ok(rules(result).includes('BARE_TYPE_KEY'))
})

test('an unknown $type is rejected', () => {
  const result = validateDtcg({root: fixture({'tokens/color.tokens.json': {color: {pink: {$type: 'colour', $value: '#ff2d95', $description: 'x'}}}})})
  const hit = result.violations.find((v) => v.rule === 'INVALID_TYPE')
  assert.ok(hit)
  assert.match(hit.detail, /Unknown \$type "colour"/)
})

test('a leaf with no $type — locally or inherited — is rejected', () => {
  const result = validateDtcg({root: fixture({'tokens/color.tokens.json': {color: {pink: {$value: '#ff2d95', $description: 'x'}}}})})
  assert.ok(rules(result).includes('MISSING_TYPE'))
})

test('$type INHERITED from a group node satisfies the leaf — no false MISSING_TYPE', () => {
  const result = validateDtcg({root: fixture({'tokens/color.tokens.json': {color: {$type: 'color', pink: {$value: '#ff2d95', $description: 'x'}}}})})
  assert.deepEqual(result.violations, [])
})

test('a shadow composite missing a required field is rejected', () => {
  const result = validateDtcg({
    root: fixture({
      'tokens/shadow.tokens.json': {elevation: {low: {$type: 'shadow', $value: {offsetX: '0px', offsetY: '1px', color: '#000'}, $description: 'x'}}}
    })
  })
  const hit = result.violations.find((v) => v.rule === 'SHADOW_MISSING_FIELD')
  assert.ok(hit, `expected SHADOW_MISSING_FIELD, got ${rules(result)}`)
  assert.match(hit.detail, /"blur"/)
})

test('a typography composite with a non-object, non-reference $value is rejected', () => {
  const result = validateDtcg({root: fixture({'tokens/type.tokens.json': {body: {base: {$type: 'typography', $value: 42, $description: 'x'}}}})})
  assert.ok(rules(result).includes('TYPOGRAPHY_INVALID_VALUE'))
})

test('a non-object in a token GROUP position is rejected', () => {
  const result = validateDtcg({root: fixture({'tokens/color.tokens.json': {color: {accent: 'not-a-group'}}})})
  const hit = result.violations.find((v) => v.rule === 'INVALID_NODE')
  assert.ok(hit)
  assert.equal(hit.path, '(root).color.accent')
})

test('unparseable JSON is reported rather than skipped', () => {
  const result = validateDtcg({root: fixture({'tokens/broken.tokens.json': '{ "color": '})})
  assert.ok(rules(result).includes('PARSE_ERROR'))
  assert.ok(result.hardViolations.some((v) => v.rule === 'PARSE_ERROR'))
})

test('MISSING_DESCRIPTION is reported but stays ADVISORY — it never enters the hard set', () => {
  // The exit-code contract in one case: the validator reports the violation and
  // exits 0 for it, and exits 1 for anything else.
  const result = validateDtcg({root: fixture({'tokens/color.tokens.json': {color: {pink: {$type: 'color', $value: '#ff2d95'}}}})})
  assert.equal(result.violations.length, 1)
  assert.equal(result.violations[0].rule, 'MISSING_DESCRIPTION')
  assert.deepEqual(result.hardViolations, [], 'MISSING_DESCRIPTION must not gate')
})

test('tokens/projections/** is excluded from validation', () => {
  const result = validateDtcg({
    root: fixture({
      'tokens/color.tokens.json': cleanTokens(),
      // Would be BARE_VALUE_KEY + MISSING_TYPE if it were validated.
      'tokens/projections/map.tokens.json': {mapping: {a: {value: 'b'}}}
    })
  })
  assert.deepEqual(result.violations, [])
  assert.equal(result.sourceFiles.length, 1, 'the projection file must not join the corpus')
})

test('dist *.dtcg.json artifacts are validated alongside the sources', () => {
  const result = validateDtcg({
    root: fixture({
      'tokens/color.tokens.json': cleanTokens(),
      'packages/tokens/dist/tokens.dtcg.json': {color: {pink: {$type: 'colour', $value: '#ff2d95', $description: 'x'}}}
    })
  })
  assert.equal(result.distFiles.length, 1)
  assert.ok(result.violations.some((v) => v.rule === 'INVALID_TYPE' && v.file.includes('dist')))
})

test('an EMPTY source corpus REDS instead of conforming over nothing', () => {
  // The vacuity hole: `walk()` returns [] for a directory that is not there, so
  // a renamed tokens/ tree produced zero files, zero violations and exit 0.
  const result = validateDtcg({root: fixture({'packages/tokens/dist/tokens.dtcg.json': {color: {}}})})
  assert.ok(result.hardViolations.some((v) => v.rule === 'EMPTY_SOURCE_CORPUS'))
})

test('an ABSENT dist corpus is not a violation — it is a build artifact', () => {
  const result = validateDtcg({root: fixture({'tokens/color.tokens.json': cleanTokens()})})
  assert.deepEqual(result.distFiles, [])
  assert.deepEqual(result.violations, [])
})

test('the real repository token sources pass the hard rules over a non-empty corpus', () => {
  const result = validateDtcg()
  assert.deepEqual(result.hardViolations, [])
  assert.ok(result.sourceFiles.length > 0)
})
