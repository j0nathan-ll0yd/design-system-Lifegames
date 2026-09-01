/**
 * Known-answer tests for the conformance ratchet (`ratchet.mjs`, check 4 of the catalog gate).
 *
 * Runs under `pnpm test:scripts` (node --test), beside schema.test.mjs.
 *
 * A ratchet is only worth its file if it can FAIL, so most of these are negative: the synthetic
 * catalogs below each encode one way the gate must red, and every one of them was confirmed to red
 * for the RIGHT reason (the assertions pin the message, not just the count). The positive cases pin
 * the other half — the 31 and 29 already-known gaps must stay quiet, or the gate is noise nobody
 * reads and the first thing anyone does is bypass it.
 *
 * Entries here are MINIMAL — `{widget, a11y, conformance}` only. `evaluateRatchet` reads nothing
 * else, and a fuller fixture would be a hand-written copy of generated values, which is the drift
 * schema.test.mjs's header explains this catalog exists to catch.
 */

import assert from 'node:assert/strict'
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import test from 'node:test'

import {catalogWidgets, REPO_ROOT} from './generate.mjs'
import {AXES, BASELINE_PATH, BaselineError, evaluateRatchet, gapsFromEntries, readBaseline, writeBaseline} from './ratchet.mjs'

const scratch = () => mkdtempSync(join(tmpdir(), 'conformance-ratchet-test-'))

/**
 * A widget with a behavioral test and an a11y label — covered on both axes.
 *
 * The test path deliberately omits the consumer repo name a real entry carries. `evaluateRatchet`
 * reads null-versus-not, never the value, and `scripts/scan-allowlist.txt` allowlists that marker
 * only where the reference must stay FOLLOWABLE (`BEHAVIORAL_TESTS` and the two real contracts). A
 * fictional path has nothing to follow, so widening the allowlist for one would weaken the scan for
 * no gain.
 */
const covered = (widget) => ({
  widget,
  a11y: {voiceOverLabel: true, ref: `Sources/LifegamesWidgets/Other/${widget}.swift:1`},
  conformance: {behavioralTest: `tests/behavioral/${widget}-matrix.test.ts`}
})

/** A widget with neither — the shape 27 of the 33 real widgets are in today. */
const uncovered = (widget) => ({widget, a11y: {voiceOverLabel: null, ref: null}, conformance: {behavioralTest: null}})

const baselineOf = ({behavioralGap = [], a11yGap = []} = {}) => ({behavioralGap: new Set(behavioralGap), a11yGap: new Set(a11yGap)})

const matching = (failures, needle) => failures.filter((message) => message.includes(needle))

test('a NEW widget with neither axis covered FAILS on both, and names the widget', () => {
  const {failures, prunable} = evaluateRatchet({entries: [uncovered('brand-new-widget')], baseline: baselineOf()})
  assert.equal(failures.length, 2, `expected one failure per axis, got ${JSON.stringify(failures)}`)
  assert.equal(matching(failures, 'no behavioral conformance test').length, 1)
  assert.equal(matching(failures, 'no recorded a11y label').length, 1)
  for (const message of failures) {
    assert.match(message, /brand-new-widget/)
  }
  assert.deepEqual(prunable, [])
})

test('a grandfathered widget PASSES on the axis it is listed under, and only that axis', () => {
  const {failures, prunable} = evaluateRatchet({entries: [uncovered('grandfathered')], baseline: baselineOf({behavioralGap: ['grandfathered']})})
  assert.equal(failures.length, 1, `only the ungrandfathered a11y axis should fail, got ${JSON.stringify(failures)}`)
  assert.match(failures[0], /no recorded a11y label/)
  assert.deepEqual(prunable, [])
})

test('a fully grandfathered widget is silent — the known debt does not red the gate', () => {
  const {failures, prunable} = evaluateRatchet({
    entries: [uncovered('grandfathered')],
    baseline: baselineOf({behavioralGap: ['grandfathered'], a11yGap: ['grandfathered']})
  })
  assert.deepEqual(failures, [])
  assert.deepEqual(prunable, [])
})

test('a REGRESSION — a covered widget losing coverage — FAILS even though the catalog stays valid', () => {
  // This is the failure check 1-3 cannot see. The entry is still grammatical and still complete; the
  // only thing wrong is that a populated field went back to null, and before the ratchet the widget
  // simply rejoined the 27 with nothing said.
  const regressed = {...covered('bookshelf'), conformance: {behavioralTest: null}}
  const {failures} = evaluateRatchet({entries: [regressed], baseline: baselineOf()})
  assert.equal(failures.length, 1)
  assert.match(failures[0], /bookshelf: no behavioral conformance test/)
})

test('a graduated widget whose id is still in the baseline is PRUNABLE, and prunable never blocks', () => {
  const {failures, prunable} = evaluateRatchet({
    entries: [covered('graduated')],
    baseline: baselineOf({behavioralGap: ['graduated'], a11yGap: ['graduated']})
  })
  assert.deepEqual(failures, [], 'closing a gap must never red the PR that closes it')
  assert.equal(prunable.length, 2)
  assert.equal(matching(prunable, 'behavioralGap: `graduated`').length, 1)
  assert.equal(matching(prunable, 'a11yGap: `graduated`').length, 1)
  for (const notice of prunable) {
    assert.match(notice, /prune its id .* in THIS PR/)
  }
})

test('a baseline id naming no widget in the catalog FAILS — a stale grandfathering reads as covered', () => {
  const {failures} = evaluateRatchet({
    entries: [covered('still-here')],
    baseline: baselineOf({behavioralGap: ['deleted-widget'], a11yGap: ['deleted-widget']})
  })
  assert.equal(failures.length, 2, `expected one stale failure per axis, got ${JSON.stringify(failures)}`)
  for (const message of failures) {
    assert.match(message, /lists `deleted-widget`, which is not a widget in the catalog/)
  }
})

test('a MISSING baseline throws BaselineError — never an empty set, never a pass', () => {
  const dir = scratch()
  try {
    assert.throws(() => readBaseline(join(dir, 'nope.json')), (error) => {
      assert.ok(error instanceof BaselineError)
      assert.match(error.message, /not found\. Generate it once with/)
      return true
    })
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('an unparseable or malformed baseline throws BaselineError rather than degrading to a pass', () => {
  const dir = scratch()
  const path = join(dir, 'conformance-baseline.json')
  const cases = [
    ['{not json', /not valid JSON/],
    ['[]', /expected an object with `behavioralGap` and `a11yGap` arrays/],
    ['null', /expected an object with `behavioralGap` and `a11yGap` arrays/],
    ['{"behavioralGap": []}', /`a11yGap` must be an array of non-empty widget ids/],
    ['{"behavioralGap": "x", "a11yGap": []}', /`behavioralGap` must be an array of non-empty widget ids/],
    ['{"behavioralGap": [1], "a11yGap": []}', /`behavioralGap` must be an array of non-empty widget ids/],
    ['{"behavioralGap": [""], "a11yGap": []}', /`behavioralGap` must be an array of non-empty widget ids/],
    ['{"behavioralGap": ["a", "a"], "a11yGap": []}', /`behavioralGap` contains duplicate ids/]
  ]
  try {
    for (const [bytes, expected] of cases) {
      writeFileSync(path, bytes)
      assert.throws(() => readBaseline(path), (error) => {
        assert.ok(error instanceof BaselineError, `expected BaselineError for ${bytes}, got ${error?.name}`)
        assert.match(error.message, expected)
        return true
      }, `no BaselineError for ${bytes}`)
    }
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('gapsFromEntries records exactly the null-field ids, sorted', () => {
  const gaps = gapsFromEntries([covered('zeta'), uncovered('beta'), uncovered('alpha'), {...covered('mid'), a11y: {voiceOverLabel: null, ref: null}}])
  assert.deepEqual(gaps.behavioralGap, ['alpha', 'beta'])
  assert.deepEqual(gaps.a11yGap, ['alpha', 'beta', 'mid'])
})

test('writeBaseline round-trips through readBaseline and is byte-idempotent', async () => {
  const dir = scratch()
  const path = join(dir, 'conformance-baseline.json')
  try {
    const written = await writeBaseline([uncovered('beta'), uncovered('alpha'), covered('gamma')], path)
    assert.deepEqual(written.behavioralGap, ['alpha', 'beta'])
    const first = readFileSync(path, 'utf8')
    const parsed = readBaseline(path)
    assert.deepEqual([...parsed.behavioralGap].sort(), ['alpha', 'beta'])
    assert.deepEqual([...parsed.a11yGap].sort(), ['alpha', 'beta'])
    // The artifact carries its own instructions: a reader who finds it in a diff learns the rule
    // without opening ratchet.mjs.
    const payload = JSON.parse(first)
    assert.match(payload.description, /Grandfathered baseline/)
    assert.equal(payload.generatedBy, 'node contracts/component-catalog/check.mjs --update-baseline')
    await writeBaseline([covered('gamma'), uncovered('alpha'), uncovered('beta')], path)
    assert.equal(readFileSync(path, 'utf8'), first, 'a re-record from the same set must be byte-identical')
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

// ── The committed baseline, bound to the real catalog ────────────────────────
//
// The tests above run on synthetic catalogs, which is what makes their answers known. These two bind
// the committed artifact to reality, so a baseline that drifted from the widget set fails here and
// not only in the gate.

const realEntries = catalogWidgets().map((widget) =>
  JSON.parse(readFileSync(join(REPO_ROOT, `contracts/component-catalog/catalog/${widget}.contract.json`), 'utf8'))
)

test('the committed baseline names only real widgets and grandfathers exactly the current gaps', () => {
  const baseline = readBaseline(BASELINE_PATH)
  const ids = new Set(realEntries.map((entry) => entry.widget))
  const gaps = gapsFromEntries(realEntries)
  for (const {key} of AXES) {
    for (const id of baseline[key]) {
      assert.ok(ids.has(id), `${key} grandfathers \`${id}\`, which is not a widget in the catalog`)
    }
    assert.deepEqual([...baseline[key]].sort(), gaps[key], `${key} has drifted — re-record with \`--update-baseline\``)
  }
})

test('the real catalog passes the ratchet, and reds the moment one widget loses coverage', () => {
  const baseline = readBaseline(BASELINE_PATH)
  assert.deepEqual(evaluateRatchet({entries: realEntries, baseline}).failures, [])

  // CAN-FAIL PROOF against the real catalog, not a synthetic one: take the one widget that has a
  // behavioral test and is therefore NOT grandfathered, drop its test, and the gate must red. If
  // this assertion ever passes vacuously the ratchet has stopped ratcheting.
  const graduated = realEntries.find((entry) => entry.conformance.behavioralTest !== null)
  assert.ok(graduated, 'no widget has a behavioral test — the can-fail proof would pass vacuously')
  const mutant = realEntries.map((entry) => entry.widget === graduated.widget ? {...entry, conformance: {behavioralTest: null}} : entry)
  const {failures} = evaluateRatchet({entries: mutant, baseline})
  assert.equal(failures.length, 1)
  assert.match(failures[0], new RegExp(`^${graduated.widget}: no behavioral conformance test`))
})
