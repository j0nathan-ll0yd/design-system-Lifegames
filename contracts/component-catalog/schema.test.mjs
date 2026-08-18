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
import {existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'
import test from 'node:test'

import {buildPropNode, buildPropTree, catalogWidgets, generateAll, REPO_ROOT, schemaIndex, toKebab, unionWidgets} from './generate.mjs'
import {assertVectorIntegrity, runCatalogConformance, runFromDisk, SIDECAR_PATH, VECTORS_PATH} from './runner.mjs'
import {CATALOG_SPEC_VERSION, KNOWN_GROUPS, KNOWN_PLATFORMS, MAX_PROP_DEPTH, validateEntry} from './schema.mjs'

const vectorBytes = readFileSync(VECTORS_PATH)
const vectors = JSON.parse(vectorBytes.toString('utf8'))
const scratch = () => mkdtempSync(join(tmpdir(), 'component-catalog-test-'))

/** The covered set: the union of the Swift and web widget trees, discovered the same way the gate does. */
const WIDGETS = catalogWidgets()
const UNION = unionWidgets()

const contractOf = (widget) => JSON.parse(readFileSync(join(REPO_ROOT, `contracts/component-catalog/catalog/${widget}.contract.json`), 'utf8'))
const entriesOf = () => WIDGETS.map(contractOf)

/** Every node of a prop tree, paired with its depth and its path, so an invariant can be asserted over all of them. */
function walkPropTree(props, depth = 1, path = 'props') {
  const found = []
  for (const [name, node] of Object.entries(props)) {
    const here = `${path}.${name}`
    found.push({node, depth, path: here})
    if (node.properties) {
      found.push(...walkPropTree(node.properties, depth + 1, `${here}.properties`))
    }
    if (node.items) {
      found.push({node: node.items, depth: depth + 1, path: `${here}.items`})
      if (node.items.properties) {
        found.push(...walkPropTree(node.items.properties, depth + 2, `${here}.items.properties`))
      }
    }
  }
  return found
}

/** A wrapper entry so a bare prop tree can be run through the real `validateEntry`. */
const entryWithProps = (props) => ({
  specVersion: CATALOG_SPEC_VERSION,
  widget: 'bio-terminal',
  group: 'identity',
  platforms: ['swift', 'web'],
  props,
  propsRef: 'a.types.ts',
  swiftPropsRef: 'a.swift',
  states: ['default'],
  a11y: {voiceOverLabel: null, ref: null},
  conformance: {behavioralTest: null},
  generatedBy: 'g'
})

/** A synthetic schema nesting one object inside another `levels` deep. Nothing in the repo is this deep on purpose. */
function nestedSchema(levels) {
  let node = {type: 'string'}
  for (let i = 0; i < levels; i += 1) {
    node = {type: 'object', properties: {inner: node}, required: ['inner']}
  }
  return node
}

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
  for (const widget of WIDGETS) {
    const entry = contractOf(widget)
    assert.deepEqual(validateEntry(entry), {valid: true, errors: []}, widget)
    assert.ok(KNOWN_GROUPS.includes(entry.group), `${widget} group ${entry.group}`)
    assert.equal(entry.specVersion, CATALOG_SPEC_VERSION)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Grammar: the recursive props tree (specVersion 2)
// ─────────────────────────────────────────────────────────────────────────────

test('grammar: a deep tree validates through every arm of the recursion', () => {
  // Object properties, array items, an object INSIDE array items, a union type array, and a
  // truncated leaf — one entry that exercises each arm at once.
  const {valid, errors} = validateEntry(
    entryWithProps({
      profile: {
        type: 'object',
        optional: false,
        properties: {
          lines: {
            type: 'array',
            optional: false,
            items: {
              type: 'object',
              optional: false,
              properties: {text: {type: ['string', 'null'], optional: true}, meta: {type: 'object', optional: true, truncated: true}}
            }
          }
        }
      }
    })
  )
  assert.deepEqual(errors, [])
  assert.ok(valid)
})

test('grammar: a malformed node is rejected at DEPTH, not only at the top level', () => {
  // The v1-validator regression: a validator that only inspects the first level accepts every one
  // of these, because the top-level node is well formed in all four.
  const cases = [
    [{type: 'object', optional: false, properties: {inner: {type: 'string'}}}, 'props.p.properties.inner: missing required field `optional`'],
    [{type: 'object', optional: false, properties: {inner: 'string'}}, 'props.p.properties.inner: expected an object, got "string"'],
    [{type: 'array', optional: false, items: {optional: false}}, 'props.p.items: missing required field `type`'],
    [
      {type: 'object', optional: false, properties: {inner: {type: 'string', optional: false, items: {type: 'string', optional: false}}}},
      'props.p.properties.inner: has `items` but its type is "string" — only an `array` node has items'
    ]
  ]
  for (const [node, expected] of cases) {
    const {valid, errors} = validateEntry(entryWithProps({p: node}))
    assert.equal(valid, false, expected)
    assert.ok(errors.includes(expected), `expected ${JSON.stringify(expected)}, got ${JSON.stringify(errors)}`)
  }
})

test('grammar: a tree deeper than MAX_PROP_DEPTH is rejected', () => {
  // Built programmatically so the assertion tracks the constant rather than a copy of it.
  const deepest = (levels) => {
    let node = {type: 'string', optional: false}
    for (let i = 0; i < levels - 1; i += 1) {
      node = {type: 'object', optional: false, properties: {inner: node}}
    }
    return node
  }
  assert.deepEqual(validateEntry(entryWithProps({p: deepest(MAX_PROP_DEPTH)})).errors, [], 'exactly at the cap must be accepted')

  const {valid, errors} = validateEntry(entryWithProps({p: deepest(MAX_PROP_DEPTH + 1)}))
  assert.equal(valid, false)
  assert.ok(errors.some((message) => message.includes(`exceeds the maximum prop depth of ${MAX_PROP_DEPTH}`)), `got ${JSON.stringify(errors)}`)
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
    for (const widget of WIDGETS) {
      const entry = JSON.parse(readFileSync(join(dir, `${widget}.contract.json`), 'utf8'))
      // readFileSync throws if the path is wrong, which is the assertion. A `null` ref is a written
      // gap on a partial entry and has no file to resolve, which is a different claim from a wrong one.
      for (const ref of [entry.propsRef, entry.swiftPropsRef, entry.sources.props, entry.sources.a11y]) {
        if (ref !== null && ref !== undefined) {
          readFileSync(join(REPO_ROOT, ref))
        }
      }
    }
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('generator: a populated a11y ref cites a line that really holds the label', () => {
  // The one axis a reader is most likely to take on trust. Resolve the <file>:<line> and read it
  // back: if the view is edited and nobody regenerates, this line no longer holds the call.
  const populated = entriesOf().filter((entry) => entry.a11y.voiceOverLabel === true)

  assert.ok(populated.length > 0, 'the catalog must include at least one widget with a VoiceOver label')

  for (const entry of populated) {
    const [path, line] = [entry.a11y.ref.replace(/:\d+$/, ''), Number(entry.a11y.ref.match(/:(\d+)$/)[1])]
    const cited = readFileSync(join(REPO_ROOT, path), 'utf8').split('\n')[line - 1]
    assert.match(cited, /\.accessibilityLabel\(/, `${entry.widget} a11y.ref ${entry.a11y.ref}`)
  }
})

test('generator: an unpopulated a11y axis is a written gap, and its source really has no label', () => {
  // Two ways to be a gap, and they are told apart by PROVENANCE rather than by a second null: the
  // widget has a Swift view with no label in it (`sources.a11y` is written), or it has no Swift view
  // to read at all (`sources.a11y` is absent). Only the first is checkable against a file.
  const gaps = entriesOf().filter((entry) => entry.a11y.voiceOverLabel === null)

  assert.ok(gaps.length > 0, 'the catalog must include at least one widget without a VoiceOver label')

  for (const entry of gaps) {
    assert.equal(entry.a11y.ref, null, entry.widget)
    if (entry.sources.a11y === undefined) {
      assert.ok(!entry.platforms.includes('swift'), `${entry.widget}: no a11y source was read, so the widget must not claim the swift platform`)
      continue
    }
    const source = readFileSync(join(REPO_ROOT, entry.sources.a11y), 'utf8')
    assert.ok(!source.includes('.accessibilityLabel('), `${entry.widget}: ${entry.sources.a11y} has a label the catalog records as absent`)
  }
})

test('generator: the props of a contract match the source schema it cites', () => {
  // The anti-drift assertion. Read the generated widget schema independently and compare the prop
  // NAMES and optionality the catalog claims. Nothing here is typed by hand.
  for (const widget of WIDGETS.filter((slug) => contractOf(slug).props !== null)) {
    const entry = contractOf(widget)
    const schema = JSON.parse(readFileSync(join(REPO_ROOT, entry.sources.props), 'utf8'))
    const required = new Set(schema.required ?? [])
    assert.deepEqual(Object.keys(entry.props), Object.keys(schema.properties ?? {}).sort(), `${widget} prop names`)
    for (const [name, descriptor] of Object.entries(entry.props)) {
      assert.equal(descriptor.optional, !required.has(name), `${widget}.${name} optionality`)
    }
  }
})

test('generator: the NESTED prop names of a contract match the source schema it cites', () => {
  // The v2 half of the anti-drift assertion, one level below the top. The source node is resolved
  // by a deliberately independent three-line reading of the schema — a nullable object arrives as
  // `anyOf: [<object>, null]`, so the null member is dropped and the object member's `properties`
  // is the expected key set. If the generator's walk regressed to top-level-only, `properties`
  // would be absent here and this reds.
  const objectMemberOf = (node) => (Array.isArray(node.anyOf) ? node.anyOf : [node]).find((member) => member?.properties)

  for (const widget of WIDGETS.filter((slug) => contractOf(slug).props !== null)) {
    const entry = contractOf(widget)
    const schema = JSON.parse(readFileSync(join(REPO_ROOT, entry.sources.props), 'utf8'))
    for (const [name, node] of Object.entries(entry.props)) {
      const source = objectMemberOf(schema.properties[name])
      if (source === undefined) {
        assert.equal(node.properties, undefined, `${widget}.${name}: source has no properties, so the catalog must claim none`)
        continue
      }
      assert.deepEqual(Object.keys(node.properties ?? {}), Object.keys(source.properties).sort(), `${widget}.${name} nested prop names`)
    }
  }
})

test('generator: the committed trees really are deep, and every node is canonical', () => {
  // The regression guard on the whole increment: if the generator reverted to a flat map, every
  // tree would be one level and the depth assertion below reds. The invariants are asserted over
  // EVERY node, so a bug that only bites below the second level cannot hide.
  let deepest = 0
  // Four widgets in this repo really take no props, so an empty tree is legal here; `props: null` is
  // the separate case of no schema to read at all.
  for (const widget of WIDGETS.filter((slug) => contractOf(slug).props !== null)) {
    const nodes = walkPropTree(contractOf(widget).props)
    for (const {node, depth, path} of nodes) {
      deepest = Math.max(deepest, depth)
      assert.ok(depth <= MAX_PROP_DEPTH, `${widget} ${path} is at depth ${depth}, past the cap of ${MAX_PROP_DEPTH}`)
      assert.equal(typeof node.optional, 'boolean', `${widget} ${path} optional`)
      if (Array.isArray(node.type)) {
        assert.ok(node.type.length >= 2, `${widget} ${path}: a one-member union must collapse to a string`)
        assert.equal(new Set(node.type).size, node.type.length, `${widget} ${path}: union members must be unique`)
      } else {
        assert.ok(typeof node.type === 'string' && node.type.length > 0, `${widget} ${path} type`)
      }
      if (node.properties) {
        const names = Object.keys(node.properties)
        assert.deepEqual(names, [...names].sort(), `${widget} ${path}: properties must be sorted`)
      }
      if (node.truncated !== undefined) {
        assert.equal(node.truncated, true, `${widget} ${path}`)
        assert.equal(node.properties, undefined, `${widget} ${path}: a truncated node carries no children`)
        assert.equal(node.items, undefined, `${widget} ${path}: a truncated node carries no children`)
      }
    }
  }
  assert.ok(deepest >= 3, `the catalog must exercise real depth; deepest node is at ${deepest}`)
})

test('generator: the depth cap truncates rather than recursing forever', () => {
  // Fed a schema deeper than the cap, the generator must stop AT the cap and say so. Without this
  // a self-referential prop type would make the gate non-terminating instead of reporting a gap.
  const tree = buildPropTree({type: 'object', properties: {root: nestedSchema(MAX_PROP_DEPTH + 4)}, required: ['root']})
  const nodes = walkPropTree(tree)
  const truncated = nodes.filter(({node}) => node.truncated === true)

  assert.equal(Math.max(...nodes.map(({depth}) => depth)), MAX_PROP_DEPTH, 'nothing may be emitted below the cap')
  assert.equal(truncated.length, 1)
  assert.equal(truncated[0].depth, MAX_PROP_DEPTH)
  assert.equal(truncated[0].node.properties, undefined, 'a truncated node records children NOT walked')
  assert.deepEqual(validateEntry(entryWithProps(tree)).errors, [], 'a truncated tree must satisfy the grammar')
})

test('generator: a leaf sitting exactly at the cap is not mislabelled as truncated', () => {
  // `truncated` means children were dropped. A tree that fits exactly must carry no marker at all,
  // or every deep-but-complete widget would read as partially recorded.
  const tree = buildPropTree({type: 'object', properties: {root: nestedSchema(MAX_PROP_DEPTH - 1)}, required: ['root']})
  assert.ok(walkPropTree(tree).every(({node}) => node.truncated === undefined), 'no node may claim truncation')
})

test('generator: a nullable object keeps its nested shape instead of collapsing to a type name', () => {
  // `makeOptionalsNullable` in the schema generator rewrites every optional prop to
  // `anyOf: [T, null]`, so failing to walk unions would drop the shape of most optional props.
  const node = buildPropNode({anyOf: [{type: 'object', properties: {value: {type: 'number'}}, required: ['value']}, {type: 'null'}]}, true, 1)
  assert.deepEqual(node, {type: ['object', 'null'], optional: true, properties: {value: {type: 'number', optional: false}}})
})

test('generator: a union of two object shapes marks a key optional unless every member requires it', () => {
  // A key a consumer cannot rely on across both arms of a union is not required, whatever either
  // arm says on its own.
  const node = buildPropNode({
    anyOf: [
      {type: 'object', properties: {a: {type: 'string'}, b: {type: 'string'}}, required: ['a', 'b']},
      {type: 'object', properties: {a: {type: 'string'}}, required: []}
    ]
  }, false, 1)
  assert.equal(node.properties.a.optional, true, 'required in one member only')
  assert.equal(node.properties.b.optional, false, 'declared by one member, which requires it')
})

test('generator: a schema node with no type is recorded as unknown, never guessed', () => {
  assert.deepEqual(buildPropNode({}, true, 1), {type: 'unknown', optional: true})
})

test('generator: states are sorted and unique', () => {
  // Empty is legal at v3 — it means neither a fixture nor a snapshot was found, which is an honest
  // answer rather than a reason to invent a state name. At least one widget must have some, or the
  // states axis would be silently reading nothing at all.
  for (const entry of entriesOf()) {
    assert.deepEqual(entry.states, [...new Set(entry.states)].sort(), `${entry.widget} states must be sorted and deduplicated`)
  }
  assert.ok(entriesOf().some((entry) => entry.states.length > 0), 'no widget has any state; the states axis is reading nothing')
})

test('generator: the emitted bytes do not depend on where they are written', async () => {
  // The regression that made the idempotence check lie in both directions. `formatJson` resolves
  // Prettier's config from the file's place in the REAL catalog directory; resolving it from the
  // output directory instead found no `.prettierrc.mjs` under a temp path and silently reformatted at
  // Prettier's default printWidth of 80, so a temp-dir regeneration differed from the committed bytes
  // on every line between 80 and the repo's 100 columns.
  const dir = scratch()
  try {
    await generateAll({outDir: dir})
    for (const widget of WIDGETS) {
      const file = `${widget}.contract.json`
      assert.equal(readFileSync(join(dir, file), 'utf8'), readFileSync(join(REPO_ROOT, 'contracts/component-catalog/catalog', file), 'utf8'),
        `${file}: a temp-directory generation must be byte-identical to the committed one`)
    }
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// The union set and partial entries (specVersion 3)
// ─────────────────────────────────────────────────────────────────────────────

test('union: the catalog covers the Swift/web union exactly, with no phantom entries', () => {
  const committed = readdirSync(join(REPO_ROOT, 'contracts/component-catalog/catalog')).filter((file) => file.endsWith('.contract.json')).map((file) =>
    file.slice(0, -'.contract.json'.length)
  ).sort()
  assert.deepEqual(committed, [...WIDGETS].sort(), 'every union widget has exactly one contract, and no contract exists outside the union')
})

test('union: it holds both partial arms, and each one is partial about the right half', () => {
  // The point of v3. If either arm were empty the grammar's null branches would be unexercised by any
  // real widget, and the catalog would be back to covering only the complete ones.
  const webOnly = UNION.filter(({web, swift}) => web !== null && swift === null)
  const swiftOnly = UNION.filter(({web, swift}) => web === null && swift !== null)

  assert.ok(webOnly.length > 0, 'no web-only widget; the partial-entry path is untested by any real widget')
  assert.ok(swiftOnly.length > 0, 'no Swift-only widget; the partial-entry path is untested by any real widget')

  for (const {id} of webOnly) {
    const entry = contractOf(id)
    assert.deepEqual(entry.platforms, ['web'], id)
    assert.equal(entry.swiftPropsRef, null, `${id}: a web-only widget cites no Swift props file`)
    assert.equal(entry.a11y.voiceOverLabel, null, `${id}: a11y is read from a Swift view, which this widget does not have`)
  }
  for (const {id} of swiftOnly) {
    const entry = contractOf(id)
    assert.deepEqual(entry.platforms, ['swift'], id)
    assert.equal(entry.propsRef, null, `${id}: a Swift-only widget cites no web types file`)
  }
})

test('union: every entry platform claim is backed by a file on disk', () => {
  // `platforms` is the one axis a reader cannot check by opening a single cited file, because it is a
  // claim about ABSENCE on the other side. Resolve both sides independently here.
  for (const {id, web, swift} of UNION) {
    const entry = contractOf(id)
    assert.deepEqual(entry.platforms, KNOWN_PLATFORMS.filter((p) => (p === 'web' ? web !== null : swift !== null)), `${id} platforms`)
    if (web !== null) {
      assert.ok(existsSync(join(REPO_ROOT, web.ref)), `${id}: claims web but ${web.ref} does not exist`)
      assert.equal(entry.propsRef, web.ref, id)
    }
    if (swift !== null) {
      assert.ok(existsSync(join(REPO_ROOT, swift.viewRef)), `${id}: claims swift but ${swift.viewRef} does not exist`)
    }
  }
})

test('union: a Swift widget with no dedicated Props file is recorded as a null, not as web-only', () => {
  // Five widgets share a props type (`DevActivityEvent`, `LocationProps`). Keying Swift presence on
  // the Props file instead of the View file would write all five up as web-only, which is false, and
  // naming the shared file would be a guess. The null is the honest third answer.
  const shared = UNION.filter(({swift}) => swift !== null && swift.propsRef === null)
  assert.ok(shared.length > 0, 'no widget exercises the shared-props-type path')
  for (const {id} of shared) {
    const entry = contractOf(id)
    assert.equal(entry.swiftPropsRef, null, id)
    assert.ok(entry.platforms.includes('swift'), `${id}: has a Swift view, so it is on the swift platform`)
    assert.notEqual(entry.props, null, `${id}: with no Swift props file, the prop tree is the only contract left`)
  }
})

test('union: every widget id pairs a schema, and the id is the schema filename verbatim', () => {
  // The normalization rule, asserted rather than described. `toKebab` alone would mis-pair `OGImage`
  // (it kebabs to `ogimage` while the committed schema is `og-image.schema.json`), which is why the
  // canonical id comes from the schema FILENAME and the pairing from its `title`.
  const {byId, byPascal} = schemaIndex(REPO_ROOT)
  const exceptions = []
  for (const [pascal, id] of byPascal) {
    if (toKebab(`${pascal}Props`) !== id) {
      exceptions.push(`${pascal} -> ${id}`)
    }
  }
  assert.deepEqual(exceptions, ['OGImage -> og-image'], 'a new toKebab exception means the id normalization needs re-checking, not silencing')

  for (const {id, schema} of UNION) {
    if (schema === null) {
      continue
    }
    assert.equal(schema.ref, `packages/schemas/generated/widgets/${id}.schema.json`, id)
    assert.ok(byId.has(id), id)
  }
})

test('union: the -v3 suffix mismatch resolves to the schema id, with the Swift file recorded beside it', () => {
  // `ExplorationOdometerView.swift` against `exploration-odometer-v3.schema.json`. The versioned id
  // wins because the schema is the props source; the unversioned Swift view is not lost, it is
  // recorded through the Swift side of the entry.
  const versioned = UNION.filter(({id, swift}) => swift !== null && /-v\d+$/.test(id))
  assert.ok(versioned.length > 0, 'no versioned widget; the suffix-mismatch path is untested')
  for (const {id, swift} of versioned) {
    // The Swift view really does carry the UNVERSIONED name — otherwise this widget would not be
    // exercising the mismatch at all, and the rule that resolves it would be dead code.
    assert.equal(toKebab(`${swift.pascal}Props`), id.replace(/-v\d+$/, ''), `${id}: expected an unversioned Swift view name`)
    assert.ok(existsSync(join(REPO_ROOT, swift.viewRef)), `${id}: ${swift.viewRef}`)
    assert.ok(contractOf(id).platforms.includes('swift'), id)
  }
})

test('union: every production visual baseline is claimed by exactly one entry', () => {
  // The falsifier on the snapshot-prefix derivation. Storybook ids are the PascalCase name
  // LOWERCASED with no separators, not the kebab slug — v2 built the prefix from the slug, so every
  // multi-word widget silently reported zero snapshot states. A baseline nothing claims means the
  // derivation is wrong again.
  const baselines = readdirSync(join(REPO_ROOT, 'apps/storybook/__snapshots__')).filter((file) => file.startsWith('production-') && file.endsWith('.png'))
  assert.ok(baselines.length > 0, 'no production baselines on disk; this test is asserting nothing')

  const prefixes = UNION.map(({id, group, pascal}) => ({id, prefix: `production-${group}-${pascal.toLowerCase()}--`}))
  for (const file of baselines) {
    const claimants = prefixes.filter(({prefix}) => file.startsWith(prefix))
    assert.equal(claimants.length, 1, `${file} is claimed by ${claimants.length} entries (${claimants.map((c) => c.id).join(', ') || 'none'})`)
    const state = file.slice(claimants[0].prefix.length, -'.png'.length)
    assert.ok(contractOf(claimants[0].id).states.includes(state), `${claimants[0].id}: baseline state \`${state}\` is missing from the entry`)
  }
})

test('union: an unmappable Swift view stops the generator rather than being paired by guesswork', () => {
  // The STOP requirement. A wrong pairing writes one widget's prop tree under another widget's slug,
  // which is a contract that reads as verified and is not — strictly worse than a missing entry.
  const root = scratch()
  const write = (rel, body) => {
    mkdirSync(dirname(join(root, rel)), {recursive: true})
    writeFileSync(join(root, rel), body)
  }
  try {
    write('packages/schemas/generated/widgets/known.schema.json', JSON.stringify({title: 'KnownProps', type: 'object'}))
    write('packages/web/src/widgets/other/Known.types.ts', 'export interface KnownProps {}\n')
    write('Sources/LifegamesWidgets/Other/KnownView.swift', '// view\n')
    write('Sources/LifegamesWidgets/Resources/widgets/widget-manifest.json', JSON.stringify({widgets: []}))
    assert.deepEqual(unionWidgets(root).map(({id}) => id), ['known'], 'the control case must resolve')

    write('Sources/LifegamesWidgets/Other/StrangerView.swift', '// view\n')
    assert.throws(() => unionWidgets(root), /cannot map the Swift widget `Stranger`[\s\S]*will not guess a pairing/)
  } finally {
    rmSync(root, {recursive: true, force: true})
  }
})
