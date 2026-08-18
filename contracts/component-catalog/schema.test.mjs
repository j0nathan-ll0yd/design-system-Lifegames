/**
 * Unit tests for the component-contract catalog grammar, its conformance runner and its generator.
 *
 * Runs under `pnpm test:scripts` (node --test), beside scripts/check-package-drift.test.mjs.
 *
 * These tests deliberately do NOT restate any prop shape, state name or accessibility label. A
 * second hand-written copy of a generated value is exactly the drift this catalog exists to catch,
 * and a test holding that copy would drift with it. They assert STRUCTURAL properties instead: the
 * grammar rejects each malformed shape, the generator is deterministic, and every derived ref
 * resolves to a real file whose contents back the claim.
 */

import assert from 'node:assert/strict'
import {mkdtempSync, readFileSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import test from 'node:test'

import {buildEntry, generateAll, PILOT_WIDGETS, REPO_ROOT} from './generate.mjs'
import {assertVectorIntegrity, runCatalogConformance, runFromDisk, SIDECAR_PATH, VECTORS_PATH} from './runner.mjs'
import {CATALOG_SPEC_VERSION, KNOWN_GROUPS, validateEntry} from './schema.mjs'

const vectorBytes = readFileSync(VECTORS_PATH)
const vectors = JSON.parse(vectorBytes.toString('utf8'))
const scratch = () => mkdtempSync(join(tmpdir(), 'component-catalog-test-'))

// ─────────────────────────────────────────────────────────────────────────────
// Conformance vectors
// ─────────────────────────────────────────────────────────────────────────────

test('conformance: the vectors match the sha256 sidecar', () => {
  assert.deepEqual(assertVectorIntegrity(vectorBytes, readFileSync(SIDECAR_PATH, 'utf8')), [])
})

test('conformance: every grammar vector passes', () => {
  const {failures, caseCount} = runFromDisk()
  assert.deepEqual(failures, [])
  assert.equal(caseCount, vectors.cases.length)
})

test('conformance: the vector set covers both verdicts and every case is uniquely named', () => {
  // A vector file that only holds valid cases proves nothing about rejection, and vice versa.
  assert.ok(vectors.cases.some((testCase) => testCase.expectValid === true), 'no valid-entry vectors')
  assert.ok(vectors.cases.some((testCase) => testCase.expectValid === false), 'no invalid-entry vectors')
  assert.equal(new Set(vectors.cases.map((testCase) => testCase.name)).size, vectors.cases.length)
  for (const testCase of vectors.cases) {
    assert.ok(typeof testCase.why === 'string' && testCase.why.length > 0, `case ${testCase.name} has no \`why\``)
  }
})

test('conformance: every invalid vector pins which rule fired', () => {
  // Without `expectErrorContains`, a validator that rejects everything would pass every negative
  // vector for the wrong reason.
  for (const testCase of vectors.cases.filter((c) => c.expectValid === false)) {
    assert.equal(typeof testCase.expectErrorContains, 'string', `case ${testCase.name} has no expectErrorContains`)
  }
})

test('conformance: case zero reds when the grammar and the vectors disagree on specVersion', () => {
  // The half-done bump. This is the failure that makes the version number mean something.
  const failures = runCatalogConformance({fixture: vectors, specVersion: CATALOG_SPEC_VERSION + 1})
  assert.equal(failures.length, 1)
  assert.match(failures[0], /^CATALOG_SPEC_VERSION: implementation is \d+, vectors are \d+$/)
})

test('conformance: a validator that throws is a failure, not a crash', () => {
  const failures = runCatalogConformance({
    fixture: vectors,
    validate: () => {
      throw new TypeError('boom')
    }
  })
  assert.equal(failures.length, vectors.cases.length)
  assert.ok(failures.every((failure) => failure.includes('THREW TypeError: boom')))
})

test('conformance: a validator that always accepts fails every negative vector', () => {
  // Mutation check on the runner itself: a runner that reports zero failures for a broken validator
  // is a gate that never bites.
  const negatives = vectors.cases.filter((testCase) => testCase.expectValid === false).length
  const failures = runCatalogConformance({fixture: vectors, validate: () => ({valid: true, errors: []})})
  assert.equal(failures.length, negatives)
})

test('conformance: a validator whose valid flag disagrees with its errors is a failure', () => {
  const failures = runCatalogConformance({fixture: vectors, validate: () => ({valid: true, errors: ['inconsistent']})})
  assert.ok(failures.some((failure) => failure.includes('disagrees with 1 error')))
})

test('integrity: a sidecar naming a different file is not a pin on this one', () => {
  const wrongName = assertVectorIntegrity(vectorBytes, `${'0'.repeat(64)}  some-other-file.json\n`)
  assert.ok(wrongName.some((failure) => failure.includes('pins `some-other-file.json`')))
})

test('integrity: a malformed sidecar reds rather than being ignored', () => {
  assert.deepEqual(assertVectorIntegrity(vectorBytes, 'not a checksum\n'), [
    'sidecar: expected `<sha256hex>  <filename>`, got "not a checksum"'
  ])
})

// ─────────────────────────────────────────────────────────────────────────────
// Grammar
// ─────────────────────────────────────────────────────────────────────────────

test('grammar: valid and errors never disagree', () => {
  for (const testCase of vectors.cases) {
    const {valid, errors} = validateEntry(testCase.entry)
    assert.equal(valid, errors.length === 0, `case ${testCase.name}`)
  }
})

test('grammar: every committed contract is valid and declares a known group', () => {
  for (const widget of PILOT_WIDGETS) {
    const entry = JSON.parse(readFileSync(join(REPO_ROOT, `contracts/component-catalog/catalog/${widget}.contract.json`), 'utf8'))
    assert.deepEqual(validateEntry(entry), {valid: true, errors: []}, widget)
    assert.ok(KNOWN_GROUPS.includes(entry.group), `${widget} group ${entry.group}`)
    assert.equal(entry.specVersion, CATALOG_SPEC_VERSION)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Generator
// ─────────────────────────────────────────────────────────────────────────────

test('generator: two runs produce byte-identical output', async () => {
  const first = scratch()
  const second = scratch()
  try {
    const a = await generateAll({outDir: first})
    const b = await generateAll({outDir: second})
    assert.deepEqual(a.map(({file}) => file), b.map(({file}) => file))
    for (const [index, {file, bytes}] of a.entries()) {
      assert.equal(bytes, b[index].bytes, file)
      assert.equal(readFileSync(join(first, file), 'utf8'), readFileSync(join(second, file), 'utf8'), file)
    }
  } finally {
    rmSync(first, {recursive: true, force: true})
    rmSync(second, {recursive: true, force: true})
  }
})

test('generator: every derived ref resolves to a real file', async () => {
  const dir = scratch()
  try {
    await generateAll({outDir: dir})
    for (const widget of PILOT_WIDGETS) {
      const entry = JSON.parse(readFileSync(join(dir, `${widget}.contract.json`), 'utf8'))
      // readFileSync throws if the path is wrong, which is the assertion.
      readFileSync(join(REPO_ROOT, entry.propsRef))
      readFileSync(join(REPO_ROOT, entry.swiftPropsRef))
      readFileSync(join(REPO_ROOT, entry.sources.props))
      readFileSync(join(REPO_ROOT, entry.sources.a11y))
    }
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('generator: a populated a11y ref cites a line that really holds the label', () => {
  // The one axis a reader is most likely to take on trust. Resolve the <file>:<line> and read it
  // back: if the view is edited and nobody regenerates, this line no longer holds the call.
  const populated = PILOT_WIDGETS.map((widget) =>
    JSON.parse(readFileSync(join(REPO_ROOT, `contracts/component-catalog/catalog/${widget}.contract.json`), 'utf8'))
  ).filter((entry) => entry.a11y.voiceOverLabel === true)

  assert.ok(populated.length > 0, 'the pilot set must include at least one widget with a VoiceOver label')

  for (const entry of populated) {
    const [path, line] = [entry.a11y.ref.replace(/:\d+$/, ''), Number(entry.a11y.ref.match(/:(\d+)$/)[1])]
    const cited = readFileSync(join(REPO_ROOT, path), 'utf8').split('\n')[line - 1]
    assert.match(cited, /\.accessibilityLabel\(/, `${entry.widget} a11y.ref ${entry.a11y.ref}`)
  }
})

test('generator: an unpopulated a11y axis is a written gap, and its source really has no label', () => {
  const gaps = PILOT_WIDGETS.map((widget) =>
    JSON.parse(readFileSync(join(REPO_ROOT, `contracts/component-catalog/catalog/${widget}.contract.json`), 'utf8'))
  ).filter((entry) => entry.a11y.voiceOverLabel === null)

  assert.ok(gaps.length > 0, 'the pilot set must include at least one widget without a VoiceOver label')

  for (const entry of gaps) {
    assert.equal(entry.a11y.ref, null, entry.widget)
    const source = readFileSync(join(REPO_ROOT, entry.sources.a11y), 'utf8')
    assert.ok(!source.includes('.accessibilityLabel('), `${entry.widget}: ${entry.sources.a11y} has a label the catalog records as absent`)
  }
})

test('generator: the props of a contract match the source schema it cites', () => {
  // The anti-drift assertion. Read the generated widget schema independently and compare the prop
  // NAMES and optionality the catalog claims. Nothing here is typed by hand.
  for (const widget of PILOT_WIDGETS) {
    const entry = JSON.parse(readFileSync(join(REPO_ROOT, `contracts/component-catalog/catalog/${widget}.contract.json`), 'utf8'))
    const schema = JSON.parse(readFileSync(join(REPO_ROOT, entry.sources.props), 'utf8'))
    const required = new Set(schema.required ?? [])
    assert.deepEqual(Object.keys(entry.props), Object.keys(schema.properties ?? {}).sort(), `${widget} prop names`)
    for (const [name, descriptor] of Object.entries(entry.props)) {
      assert.equal(descriptor.optional, !required.has(name), `${widget}.${name} optionality`)
    }
  }
})

test('generator: states are sorted, unique and non-empty', () => {
  for (const widget of PILOT_WIDGETS) {
    const {states} = JSON.parse(readFileSync(join(REPO_ROOT, `contracts/component-catalog/catalog/${widget}.contract.json`), 'utf8'))
    assert.ok(states.length > 0, widget)
    assert.deepEqual(states, [...new Set(states)].sort(), `${widget} states must be sorted and deduplicated`)
  }
})

test('generator: an unknown widget slug throws rather than emitting an empty entry', () => {
  // The failure mode that would otherwise produce a contract full of nulls that reads as coverage.
  assert.throws(() => buildEntry(REPO_ROOT, {widget: 'no-such-widget', behavioralTest: null}),
    /expected exactly one group to contain NoSuchWidget\.types\.ts, found none/)
})
