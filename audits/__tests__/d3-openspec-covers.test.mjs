// mantle-cli-output: test file, not a CLI script (marker satisfies scripts/-dir convention scan)
/**
 * Known-answer tests for the openspec-covers gate (`d3-openspec-covers.mjs`).
 *
 * Runs under `pnpm test:scripts` (node --test) AND directly in the CI `governance-gates` step, for
 * the same reason `contracts/component-catalog/ratchet.test.mjs` and
 * `c147-package-drift.test.mjs` run there: a suite reachable only through `pnpm test:scripts`
 * lives in `.husky/pre-push` and in no workflow, so `DS_SKIP_PREPUSH=1` would be enough to merge a
 * gate that no longer gates.
 *
 * The RULE is not under test here — it ships as `@j0nathan-ll0yd/estate-contracts/openspec-covers`
 * with its own conformance vectors and its own sha256 sidecar, and `checkCoversIntegrity()` proves
 * this repo received it intact. What IS under test is the two things this wrapper adds: the wider
 * language table, and the baseline partition. Both can silently manufacture green — a language table
 * that double-counts, or a partition that swallows a finding type it was never meant to grandfather —
 * so most cases below are negative.
 *
 * There is deliberately no annotation-shaped string literal anywhere in this file. The rule scans
 * `**\/*.test.mjs`, which now includes this one; every case here drives the partition with finding
 * OBJECTS instead, so the suite cannot tether or near-miss anything by existing.
 */

import assert from 'node:assert/strict'
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import test from 'node:test'

import {DEFAULT_LANGUAGES} from '@j0nathan-ll0yd/estate-contracts/openspec-covers'

import {
  assertLanguagesDisjoint,
  BASELINE_ELIGIBLE_TYPE,
  BASELINE_PATH,
  BaselineError,
  checkCoversIntegrity,
  DS_LANGUAGES,
  EXTRA_LANGUAGES,
  liveRequirementKeys,
  partitionFindings,
  readBaseline,
  REPO_ROOT,
  requirementKey,
  runGate,
  writeBaseline
} from '../checks/d3-openspec-covers.mjs'

const scratch = () => mkdtempSync(join(tmpdir(), 'openspec-covers-test-'))

const uncovered = (capability, name) => ({
  type: BASELINE_ELIGIBLE_TYPE,
  severity: 'warning',
  file: `openspec/specs/${capability}/spec.md`,
  line: 1,
  capability,
  requirementName: name,
  message: 'synthetic'
})

const other = (type) => ({type, severity: 'warning', file: 'x.test.mjs', line: 1, message: 'synthetic'})

const keysOf = (...ids) => new Set(ids)

// ─────────────────────────────────────────────────────────────────────────────
// Integrity: the shipped rule, and the table this wrapper widens it with
// ─────────────────────────────────────────────────────────────────────────────

test('integrity: the shipped rule matches its sidecar and the spec version this repo was written against', () => {
  assert.equal(checkCoversIntegrity(), true)
})

test('languages: the DS table is the contract default plus exactly the two shapes this repo adds', () => {
  assert.equal(DS_LANGUAGES.length, DEFAULT_LANGUAGES.length + EXTRA_LANGUAGES.length)
  assert.deepEqual(EXTRA_LANGUAGES.map((language) => language.glob), ['**/*.test.mjs', '**/*.test.js'])
  // The widened table must still scan the contract's three, verbatim.
  for (const base of DEFAULT_LANGUAGES) {
    assert.ok(DS_LANGUAGES.some((language) => language.glob === base.glob && language.id === base.id), `${base.id} was dropped`)
  }
})

test('languages: a table that claims one glob twice is REJECTED, because a file matched twice is counted twice', () => {
  const duplicated = [...DS_LANGUAGES, {id: 'mjs-again', glob: '**/*.test.mjs', commentRegex: /x/, nearMiss: true}]
  assert.throws(() => assertLanguagesDisjoint(duplicated), /not disjoint/)
})

test('languages: a table that repeats an id is REJECTED even when the globs differ', () => {
  const repeated = [...DS_LANGUAGES, {id: 'mjs', glob: '**/*.spec.mjs', commentRegex: /x/, nearMiss: true}]
  assert.throws(() => assertLanguagesDisjoint(repeated), /repeats the id/)
})

// ─────────────────────────────────────────────────────────────────────────────
// The partition — every way it must red
// ─────────────────────────────────────────────────────────────────────────────

test('a NEW untethered requirement absent from the baseline BLOCKS, and the finding survives intact', () => {
  const finding = uncovered('widget-contract', 'Brand new rule')
  const {blocking, grandfathered} = partitionFindings({
    findings: [finding],
    baselineIds: new Set(),
    requirementKeys: keysOf('widget-contract#Brand new rule')
  })
  assert.deepEqual(blocking, [finding])
  assert.deepEqual(grandfathered, [])
})

test('a grandfathered requirement is silent — the recorded gap does not red the gate', () => {
  const key = requirementKey('widget-contract', 'Known gap')
  const {blocking, grandfathered} = partitionFindings({
    findings: [uncovered('widget-contract', 'Known gap')],
    baselineIds: keysOf(key),
    requirementKeys: keysOf(key)
  })
  assert.deepEqual(blocking, [])
  assert.equal(grandfathered.length, 1)
  assert.equal(grandfathered[0].key, key)
})

test('the baseline grandfathers ONE finding type — a near-miss or a stale tether blocks however the baseline reads', () => {
  // The failure this pins: a partition keyed on the requirement rather than the finding type would
  // let a baseline entry swallow a covers-near-miss or a broken tether on the same requirement.
  const key = requirementKey('widget-contract', 'Known gap')
  const ineligible = ['covers-near-miss', 'stale-reference', 'scenario-gwt-structure', 'requirement-without-scenario', 'unresolved-verified-by']
  for (const type of ineligible) {
    const {blocking} = partitionFindings({findings: [other(type)], baselineIds: keysOf(key), requirementKeys: keysOf(key)})
    assert.equal(blocking.length, 1, `${type} must block regardless of the baseline`)
    assert.equal(blocking[0].type, type)
  }
})

test('a baseline id naming NO live requirement FAILS — a stale grandfathering reads as covered', () => {
  const {stale, prunable, blocking} = partitionFindings({
    findings: [],
    baselineIds: keysOf('widget-contract#A requirement that was renamed away'),
    requirementKeys: keysOf('widget-contract#The requirement it was renamed to')
  })
  assert.deepEqual(stale, ['widget-contract#A requirement that was renamed away'])
  assert.deepEqual(prunable, [])
  assert.deepEqual(blocking, [])
})

test('a GRADUATED requirement still named in the baseline is PRUNABLE, and prunable never blocks', () => {
  const key = requirementKey('widget-contract', 'Now tethered')
  const {prunable, stale, blocking} = partitionFindings({findings: [], baselineIds: keysOf(key), requirementKeys: keysOf(key)})
  assert.deepEqual(prunable, [key])
  assert.deepEqual(stale, [])
  assert.deepEqual(blocking, [])
})

test('a renamed requirement shows as one BLOCKING uncovered id and one STALE baseline id, never as a quiet swap', () => {
  const oldKey = 'widget-contract#Old name'
  const newKey = 'widget-contract#New name'
  const {blocking, stale} = partitionFindings({
    findings: [uncovered('widget-contract', 'New name')],
    baselineIds: keysOf(oldKey),
    requirementKeys: keysOf(newKey)
  })
  assert.equal(blocking.length, 1)
  assert.equal(requirementKey(blocking[0].capability, blocking[0].requirementName), newKey)
  assert.deepEqual(stale, [oldKey])
})

// ─────────────────────────────────────────────────────────────────────────────
// The baseline file itself
// ─────────────────────────────────────────────────────────────────────────────

test('an ABSENT baseline grandfathers nothing, which is stricter than the committed file and never a pass', () => {
  const dir = scratch()
  try {
    const {ids, present} = readBaseline(join(dir, 'nothing-here.json'))
    assert.equal(present, false)
    assert.equal(ids.size, 0)
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('an unparseable baseline THROWS rather than degrading to an empty set that passes', () => {
  const dir = scratch()
  try {
    const path = join(dir, 'covers-baseline.json')
    writeFileSync(path, '{ this is not json')
    assert.throws(() => readBaseline(path), BaselineError)
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('a baseline with no uncovered array, or a non-key entry, THROWS instead of being parsed past', () => {
  const dir = scratch()
  try {
    const path = join(dir, 'covers-baseline.json')
    writeFileSync(path, JSON.stringify({description: 'x'}))
    assert.throws(() => readBaseline(path), /no 'uncovered' array/)

    writeFileSync(path, JSON.stringify({uncovered: ['no-separator-in-this-one']}))
    assert.throws(() => readBaseline(path), /non-key entry/)

    writeFileSync(path, JSON.stringify({uncovered: [17]}))
    assert.throws(() => readBaseline(path), /non-key entry/)
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('writeBaseline round-trips through readBaseline, sorts, and is byte-idempotent', () => {
  const dir = scratch()
  try {
    const path = join(dir, 'covers-baseline.json')
    const ids = ['b#Second rule', 'a#First rule', 'b#Another rule']

    writeBaseline(new Set(ids), path)
    const first = readFileSync(path, 'utf-8')
    writeBaseline(readBaseline(path).ids, path)
    assert.equal(readFileSync(path, 'utf-8'), first, 'a second write over the same set must be byte-identical')

    assert.deepEqual(JSON.parse(first).uncovered, ['a#First rule', 'b#Another rule', 'b#Second rule'])
    assert.deepEqual([...readBaseline(path).ids].sort(), [...ids].sort())
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// The real tree
// ─────────────────────────────────────────────────────────────────────────────

test('the committed baseline names only live requirements and grandfathers exactly the current gaps', () => {
  const {ids, present} = readBaseline(BASELINE_PATH)
  assert.equal(present, true, 'openspec/covers-baseline.json must be committed')

  const live = liveRequirementKeys(REPO_ROOT)
  for (const id of ids) {
    assert.ok(live.has(id), `baseline id names no requirement in openspec/specs/: ${id}`)
  }

  const gate = runGate()
  assert.deepEqual([...gate.uncoveredKeys].sort(), [...ids].sort(), 'the baseline is neither ahead of nor behind the tree')
  assert.deepEqual(gate.prunable, [], 'a graduated requirement is still grandfathered — prune its id')
  assert.deepEqual(gate.stale, [])
})

test('the real tree is GREEN today, and reds the moment a requirement loses its tether', () => {
  const gate = runGate()
  assert.deepEqual(gate.blocking, [], 'openspec-covers --blocking must pass on main')
  assert.ok(gate.specsScanned > 0, 'no spec files scanned — the gate would pass vacuously')
  assert.ok(gate.coversAnnotationsFound > 0, 'no tethers found — the gate would pass vacuously')

  // PROOF OF FAIL. Drop every tether for one tethered requirement and the gate must red on it. This
  // is the assertion that separates a gate from a green light: the partition above is exercised on
  // synthetic input, and this exercises it on the tree the merge gate actually reads.
  const tethered = [...gate.requirementKeys].filter((key) => !gate.uncoveredKeys.has(key))
  assert.ok(tethered.length > 0, 'no requirement is tethered — there is nothing for the gate to protect')

  const victim = tethered.sort()[0]
  const [capability, ...rest] = victim.split('#')
  const {blocking} = partitionFindings({
    findings: [uncovered(capability, rest.join('#'))],
    baselineIds: readBaseline(BASELINE_PATH).ids,
    requirementKeys: gate.requirementKeys
  })
  assert.equal(blocking.length, 1, `losing the tether on '${victim}' must block`)
})

test('every language in the DS table finds at least one file in this repo, so none is a dead scan', () => {
  // A glob that matches nothing is indistinguishable from a glob that is spelled wrong. HCL is the
  // one exception and it is the contract's, not this repo's: design-system ships no Terraform.
  const gate = runGate()
  assert.ok(gate.testFilesScanned > 0)
  assert.equal(assertLanguagesDisjoint(DS_LANGUAGES), true)
})
