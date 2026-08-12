// mantle-cli-output: test file, not a CLI script (marker satisfies scripts/-dir convention scan)
/**
 * Unit + conformance suite for scripts/check-package-drift.mjs. Collected
 * automatically by the root `test:scripts` script (`node --test scripts/*.test.mjs`),
 * which pre-push runs as "audit script tests".
 *
 * SCOPE, STATED HONESTLY. This file covers the PURE layer: canonicalisation, the
 * digest, the verdict matrix, the lane→exitClass mapping, the leak screen, the tar
 * reader and auth resolution — plus ONE observation-layer slice, the registry
 * transport's retry behaviour, which is driven against a real loopback HTTP server
 * at the bottom of this file (fetch() is exercised for real there, and nowhere
 * else). It deliberately does NOT claim to cover the rest of the observation layer
 * (pnpm pack, git ls-files, the workspace build) — a previous generation of this
 * gate had 51 green unit tests and a passing --self-test while a one-line mutation
 * to its git observation made it report "17 clean" on a tree with two real drifts
 * (finding H1). Pure-function tests cannot see that class of defect, and pretending
 * otherwise is worse than not claiming the coverage.
 *
 * The observation layer is covered by `node scripts/check-package-drift.mjs
 * --self-test`, which stands up a throwaway git repo and an offline registry, runs
 * the SHIPPED pipeline end to end against them, and then re-runs it under every entry
 * in that file's MUTATION TABLE — deliberate SOURCE-TEXT mutations of the real
 * evaluator, each naming the scenario it must break — failing if any survives. The
 * count is deliberately not quoted here; it grows whenever the table does.
 *
 * THIS FILE RUNS IN CI (finding D4). It carries the 34 shared digest vectors and the 61
 * shared export-surface vectors (spec v2, changeset-aware — atlas decision 0024), plus the
 * fixture-checksum assertion that makes vendoring each of them safe, and until now it was
 * reachable only through `pnpm test:scripts` —
 * present in .husky/pre-push and in no workflow — so this repo could diverge from the
 * estate's canonical rules with every CI check green. It is now a step in the
 * `package-version-drift` job.
 *
 * THE EXPORT-SURFACE RULE IS COVERED IN BOTH PLACES, and the split is the same one.
 * Its 61 vectors define the rule and are asserted here; the WIRING — which verdicts it is
 * applied over, that an unreadable surface reaches exit 3, that the reference it compares
 * against is the published tarball and not the local one — is asserted end to end by the
 * --self-test S22 rungs, and by three source mutations (`surfaceselfref`,
 * `surfaceindetpass`, `surfacealwaysmajor`) that each break exactly one of them. S22c is
 * the NEGATIVE CONTROL: the same export removal under a MAJOR must pass and leave the run
 * at exit 0, so a gate that simply blocked everything cannot masquerade as this rule.
 *
 * THE PROCESS-EXIT BOUNDARY IS NOT COVERED HERE, DELIBERATELY. Nothing in this file
 * spawns the script, so `process.exitCode = code` could be changed to `= 0` and every
 * test here would stay green while the gate exited 0 on real drift (finding X2). That
 * boundary is covered by four --self-test rungs that spawn the script as a real OS
 * process and read its actual status: S13 (a known drift -> 2), S17 (a clean tree -> 0),
 * S18 (a dead registry -> 3) and S19 (nothing publishable -> 3). All four are needed,
 * because one rung asserting only DRIFT -> 2 could not see any exit-mapping edit that
 * PRESERVED 2 — MEASURED (finding D3): rewriting that line to launder exit 3 into exit 0
 * left the previous suite reporting "self-test passed, all 9 mutations killed" while
 * every "could not tell" silently became a pass. The `exitcode`, `exitalways2` and
 * `exitlaunder3` mutations prove each direction can fail.
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import test from 'node:test'
import {fileURLToPath} from 'node:url'
import zlib from 'node:zlib'

import {assertFixtureIntegrity, runConformance} from './fixtures/drift-conformance-runner.mjs'
// Both vendored runners export `assertFixtureIntegrity` — same function, different fixture —
// so the second is aliased rather than renamed in the vendored copy, which must stay verbatim.
import {assertFixtureIntegrity as assertSurfaceFixtureIntegrity, runExtractConformance, runSurfaceConformance} from './fixtures/export-surface-runner.mjs'
// The vendored EXTRACTOR (atlas decision 0028). Unlike the rule, this half is vendored rather than
// reimplemented — it is the only part of the contract that needs `typescript`, and a hand-written
// third copy of a named-export extractor would repeat findings X3/X7 with far better odds.
import {acceptsCachedSurface, extractSurfaceNames} from './fixtures/extract.mjs'
import ts from 'typescript'
// The third vendored runner — same `assertFixtureIntegrity` name, aliased again — carries the shared
// verdict-ladder vectors (atlas/contracts/verdict-ladder/).
import {assertFixtureIntegrity as assertLadderFixtureIntegrity, runLadderConformance} from './fixtures/verdict-conformance-runner.mjs'
import {
  assertBuildOutputs,
  bumpBetween,
  canonicalize,
  CLASSIFICATIONS,
  compareSemver,
  decideVerdict,
  differingFiles,
  DRIFT_CONFORMANCE_SHA256,
  evaluateSurface,
  exitClassFor,
  EXPORT_EXTRACT_CONFORMANCE_SHA256,
  EXPORT_SURFACE_CONFORMANCE_SHA256,
  EXTRACT_SPEC_VERSION,
  fetchPackument,
  globToRegExp,
  isDeadSourceMap,
  isDeclaredOutput,
  LADDER_CONFORMANCE_SHA256,
  LADDER_SPEC_VERSION,
  LANES,
  leakScreen,
  level1View,
  namesDelta,
  normalizeEntry,
  parseArgs,
  payloadDigests,
  PUBLISH_ONLY_SCRIPTS,
  readCache,
  readExportSurface,
  readExportTargets,
  readTarball,
  resolveToken,
  retryAfterMs,
  semverMax,
  SPEC_VERSION,
  subpathNameDelta,
  SURFACE_APPLICABLE_VERDICTS,
  SURFACE_SPEC_VERSION,
  surfaceAdvisories,
  surfaceDelta,
  surfaceOfPayload,
  VERIFIED_TS_VERSIONS,
  writeCache
} from './check-package-drift.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const conformanceBytes = fs.readFileSync(path.join(here, 'fixtures/drift-conformance.json'))
const conformance = JSON.parse(conformanceBytes.toString('utf8'))
const surfaceBytes = fs.readFileSync(path.join(here, 'fixtures/export-surface-conformance.json'))
const surfaceConformance = JSON.parse(surfaceBytes.toString('utf8'))
const extractBytes = fs.readFileSync(path.join(here, 'fixtures/export-extract-conformance.json'))
const extractConformance = JSON.parse(extractBytes.toString('utf8'))
const ladderBytes = fs.readFileSync(path.join(here, 'fixtures/verdict-conformance.json'))
const ladderConformance = JSON.parse(ladderBytes.toString('utf8'))
const tmpdir = (prefix) => fs.mkdtempSync(path.join(process.env.TMPDIR ?? '/tmp', prefix))

// ─────────────────────────────────────────────────────────────────────────────
// Cross-implementation conformance vectors
//
// THE FIXTURE AND THE RUNNER ARE VENDORED VERBATIM from the single source of truth,
// atlas/contracts/package-digest/. There used to be three files called
// drift-conformance.json in this estate — atlas (25 cases, specVersion 1),
// design-system (21 cases, specVersion 1) and mantle (20 cases, specVersion 2) — no
// two of which shared content OR a spec version, so nothing could detect that the three
// engines had silently diverged on what a package.json hashes to (findings X5 and X7).
// One fixture, one runner, one number: same specVersion <=> byte-identical normalization.
// ─────────────────────────────────────────────────────────────────────────────

test('conformance: the vendored fixture matches the checksum this implementation pins', () => {
  // Layer 1 of three. Editing the vendored fixture without editing
  // DRIFT_CONFORMANCE_SHA256 beside the engine turns this red immediately — which is
  // what makes vendoring safe rather than merely convenient. (Layer 2 is the atlas host
  // audit that re-hashes every repo's vendored copy against the SoT; layer 3 is
  // `build-fixture.mjs --check` in atlas CI.)
  assert.deepEqual(assertFixtureIntegrity(conformanceBytes, DRIFT_CONFORMANCE_SHA256), [])
})

test('conformance: all 34 shared vectors pass under the SHARED runner', () => {
  assert.equal(conformance.cases.length, 34)
  const failures = runConformance({
    fixture: conformance,
    specVersion: SPEC_VERSION,
    normalizeEntry,
    payloadDigests: (files, exclude) => payloadDigests(files, exclude)
  })
  assert.deepEqual(failures, [])
})

/**
 * The runner asserts specVersion as case zero and short-circuits, so an X7-class
 * mismatch is one loud failure rather than 34 confusing ones. Proven here rather than
 * assumed, because the whole value of the number rests on it.
 */
test('conformance: a wrong SPEC_VERSION short-circuits with exactly one message', () => {
  const failures = runConformance({fixture: conformance, specVersion: SPEC_VERSION + 1, normalizeEntry, payloadDigests})
  assert.equal(failures.length, 1)
  assert.match(failures[0], /^SPEC_VERSION: implementation is 4, fixture is 3$/)
})

/**
 * The vectors lock this implementation against the other two. On their own they cannot
 * tell a correct digest from a consistently wrong one, so the relations they exist to
 * express are asserted here independently of the recorded values — and, critically, the
 * vectors that the PREVIOUS design-system rule failed are named explicitly.
 */
test('conformance: the relations the shared vectors exist to pin', () => {
  const byId = Object.fromEntries(conformance.cases.map((c) => [c.id, c]))
  const verdictOf = (id) => byId[id].expect.verdict

  // THE X3 REGRESSION VECTOR, built from the real published portal-contract@1.0.0 bytes:
  // an npm-published registry manifest vs a pnpm-packed head of the SAME source. Truth is
  // CLEAN. The old design-system rule (normalize nothing) reported DRIFT here — a false
  // positive on a package that is exactly what is published.
  assert.equal(verdictOf('cmp-npm-published-vs-pnpm-packed-is-clean'), 'CLEAN')
  // ...and the six-script rule must not over-strip into scripts a consumer actually runs,
  // nor into legacy `prepublish`, which NEITHER pack tool removes.
  assert.equal(verdictOf('cmp-postinstall-edit-is-drift'), 'DRIFT')
  assert.equal(verdictOf('cmp-legacy-prepublish-edit-is-drift'), 'DRIFT')
  // The workspace cascade — a sibling moving 1.0.0 -> 1.0.1 with no source file changing
  // — is the signal this gate exists for and must survive normalization.
  assert.equal(verdictOf('cmp-nested-dep-cascade-is-drift'), 'DRIFT')
  // publishConfig hoisting is the same class of tool asymmetry but is deliberately NOT
  // normalized; this vector stops anyone quietly normalizing it later.
  assert.equal(verdictOf('cmp-publishconfig-edit-is-drift'), 'DRIFT')
  // pnpm's `"scripts": {}`, npm's full object and an absent key are one equivalence class.
  assert.equal(verdictOf('cmp-empty-scripts-vs-absent-scripts-is-clean'), 'CLEAN')
  // Formatting and key order are not drift; array order and a nested manifest's version are.
  assert.equal(verdictOf('cmp-formatting-and-key-order-is-clean'), 'CLEAN')
  assert.equal(verdictOf('cmp-files-array-reorder-is-drift'), 'DRIFT')
  assert.equal(verdictOf('cmp-nested-manifest-version-edit-is-drift'), 'DRIFT')
  // A malformed manifest must report a difference and must NOT throw. This implementation
  // threw a SyntaxError here before spec v3.
  assert.equal(verdictOf('cmp-malformed-manifest-edit-is-drift'), 'DRIFT')
  // A difference confined to an unresolvable map moves strictDigest but not effectiveDigest.
  assert.equal(verdictOf('cmp-dead-map-only-difference-is-clean-on-effective'), 'CLEAN')
})

// ─────────────────────────────────────────────────────────────────────────────
// Export-surface conformance vectors (spec v2 — changeset-aware, atlas decision 0024)
//
// SAME DISCIPLINE, SECOND RULE. The fixture and runner are vendored VERBATIM from
// atlas/contracts/export-surface/ and the checksum is pinned beside the engine, so
// editing either without editing the other turns this red. The rule is defined THERE,
// not here: the estate has already paid once for three hand-written copies of a shared
// rule diverging silently (findings X5 and X7), and birthing a second cross-repo rule
// as three independent copies would repeat exactly that.
// ─────────────────────────────────────────────────────────────────────────────

test('surface conformance: the vendored fixture matches the checksum this implementation pins', () => {
  assert.deepEqual(assertSurfaceFixtureIntegrity(surfaceBytes, EXPORT_SURFACE_CONFORMANCE_SHA256), [])
})

test('surface conformance: the vendored .sha256 sidecar agrees with the pinned constant', () => {
  const sidecar = fs.readFileSync(path.join(here, 'fixtures/export-surface-conformance.sha256'), 'utf8').trim().split(/\s+/)[0]
  assert.equal(sidecar, EXPORT_SURFACE_CONFORMANCE_SHA256)
})

test('surface conformance: all 100 shared vectors pass under the SHARED runner', () => {
  assert.equal(surfaceConformance.cases.length, 100)
  const failures = runSurfaceConformance({
    fixture: surfaceConformance,
    specVersion: SURFACE_SPEC_VERSION,
    readExportSurface,
    readExportTargets,
    surfaceDelta,
    bumpBetween,
    evaluateSurface
  })
  assert.deepEqual(failures, [])
})

test('surface conformance: a wrong SURFACE_SPEC_VERSION short-circuits with exactly one message', () => {
  const failures = runSurfaceConformance({
    fixture: surfaceConformance,
    specVersion: SURFACE_SPEC_VERSION + 1,
    readExportSurface,
    readExportTargets,
    surfaceDelta,
    bumpBetween,
    evaluateSurface
  })
  assert.equal(failures.length, 1)
  assert.match(failures[0], /^SURFACE_SPEC_VERSION: implementation is 4, fixture is 3$/)
})

// ─────────────────────────────────────────────────────────────────────────────
// EXTRACTOR conformance vectors (extract spec v2 — atlas decisions 0028 + 0030)
//
// TWO FIXTURES, TWO NUMBERS, THREE CASE-ZEROS. `export-surface-conformance.json` above pins
// the RULE, keyed by SURFACE_SPEC_VERSION; this one pins the EXTRACTOR, keyed by
// EXTRACT_SPEC_VERSION and by the SET of `typescript` versions it was generated against.
//
// The extractor is the one half of this contract this repo VENDORS rather than reimplements:
// it is the only part that depends on `typescript`, and a third hand-written copy of a
// named-export enumerator would repeat findings X3/X7 with far better odds than the digest did.
// ─────────────────────────────────────────────────────────────────────────────

test('extract conformance: the vendored fixture matches the checksum this implementation pins', () => {
  assert.deepEqual(assertSurfaceFixtureIntegrity(extractBytes, EXPORT_EXTRACT_CONFORMANCE_SHA256, 'export-extract-conformance.json'), [])
})

test('extract conformance: the vendored .sha256 sidecar agrees with the pinned constant', () => {
  const sidecar = fs.readFileSync(path.join(here, 'fixtures/export-extract-conformance.sha256'), 'utf8').trim().split(/\s+/)[0]
  assert.equal(sidecar, EXPORT_EXTRACT_CONFORMANCE_SHA256)
})

test('extract conformance: THE CHURN ISOLATION — the two fixtures carry two INDEPENDENT checksums', () => {
  // The whole point of splitting them (decision 0028 §D1), and it has now been exercised for
  // real: decision 0030 bumped EXTRACT_SPEC_VERSION 1 -> 2 and regenerated only the extractor
  // fixture. If these ever collapse to one file or one checksum, an extractor-only bump starts
  // forcing an estate-wide re-vendor of a rule nobody touched.
  assert.notEqual(EXPORT_SURFACE_CONFORMANCE_SHA256, EXPORT_EXTRACT_CONFORMANCE_SHA256)
  assert.equal(surfaceConformance.specVersion, SURFACE_SPEC_VERSION)
  assert.equal(extractConformance.extractSpecVersion, EXTRACT_SPEC_VERSION)
  assert.equal(surfaceConformance.extractSpecVersion, undefined, 'the RULE fixture must not be keyed by the extractor version')
  assert.equal(extractConformance.specVersion, undefined, 'the EXTRACTOR fixture must not be keyed by the rule version')
})

test('extract conformance: all 39 shared vectors pass under the SHARED runner', () => {
  assert.equal(extractConformance.cases.length, 39)
  const failures = runExtractConformance({
    fixture: extractConformance,
    extractSpecVersion: EXTRACT_SPEC_VERSION,
    verifiedTsVersions: VERIFIED_TS_VERSIONS,
    tsVersion: ts.version,
    createProgram: ts.createProgram,
    extractSurfaceNames,
    acceptsCachedSurface,
    ts
  })
  assert.deepEqual(failures, [])
})

test('extract conformance: a wrong EXTRACT_SPEC_VERSION short-circuits with exactly one message', () => {
  const failures = runExtractConformance({
    fixture: extractConformance,
    extractSpecVersion: EXTRACT_SPEC_VERSION + 1,
    verifiedTsVersions: VERIFIED_TS_VERSIONS,
    tsVersion: ts.version,
    createProgram: ts.createProgram,
    extractSurfaceNames,
    acceptsCachedSurface,
    ts
  })
  assert.equal(failures.length, 1)
  assert.match(failures[0], /^EXTRACT_SPEC_VERSION: implementation is 3, fixture is 2$/)
})

test('extract conformance: THE SET ITSELF IS PINNED — an implementation that widens it fails', () => {
  // The case-zero decision 0030 added, and the one that keeps a SET from decaying into a range.
  // Any repo could otherwise quietly append a patch nobody measured, pass its own conformance,
  // and extract differently from its siblings — X3/X7 applied to a dependency, one version at a
  // time. The runner compares the implementation's array against the sha-pinned fixture's.
  const failures = runExtractConformance({
    fixture: extractConformance,
    extractSpecVersion: EXTRACT_SPEC_VERSION,
    verifiedTsVersions: [...VERIFIED_TS_VERSIONS, '5.9.4'],
    tsVersion: ts.version,
    createProgram: ts.createProgram,
    extractSurfaceNames,
    acceptsCachedSurface,
    ts
  })
  assert.equal(failures.length, 1)
  assert.match(failures[0], /accepts .*5\.9\.4/)
})

test('extract conformance: THE TOOLCHAIN CASE-ZERO — a typescript OUTSIDE the verified set fails', () => {
  // X3/X7 applied to a DEPENDENCY. A version nobody measured can extract differently on a
  // construct absent from these 39 vectors, pass its own conformance, and then disagree on a REAL
  // verdict. The set is closed and measured; membership is what is asserted, not a range.
  const failures = runExtractConformance({
    fixture: extractConformance,
    extractSpecVersion: EXTRACT_SPEC_VERSION,
    verifiedTsVersions: VERIFIED_TS_VERSIONS,
    tsVersion: '5.8.0',
    createProgram: ts.createProgram,
    extractSurfaceNames,
    acceptsCachedSurface,
    ts
  })
  assert.equal(failures.length, 1)
  assert.match(failures[0], /5\.8\.0/)
})

test('extract conformance: a 7.x resolution fails with a SENTENCE, not a TypeError mid-run', () => {
  // `npm i typescript` now installs the native Go port, which has NO JavaScript compiler API. The
  // failure mode without this check is `ts.createProgram is not a function` thrown from inside a
  // gate run over a real package — an unreadable crash where a diagnosis belongs. This is also why
  // the verified set is a closed ENUMERATION: any range spelling would readmit 7.x.
  const failures = runExtractConformance({
    fixture: extractConformance,
    extractSpecVersion: EXTRACT_SPEC_VERSION,
    verifiedTsVersions: VERIFIED_TS_VERSIONS,
    tsVersion: '7.0.2',
    createProgram: undefined,
    extractSurfaceNames,
    acceptsCachedSurface,
    ts
  })
  assert.equal(failures.length, 1)
  assert.match(failures[0], /exposes no createProgram — this is the native 7\.x port/)
})

test('the typescript pin is EXACT, is a member of the verified set, and is what actually resolved', () => {
  // THE PIN IS A CONTRACT VERSION, and this is the only assertion tying all four together: the
  // contract's set, the manifest's declared version, that the declaration is a bare version rather
  // than a range, and the compiler actually loaded. A caret or tilde is not a pin — it is a time
  // bomb, because 7.x is already published.
  const rootManifest = JSON.parse(fs.readFileSync(path.join(here, '..', 'package.json'), 'utf8'))
  const declared = rootManifest.devDependencies.typescript
  assert.match(declared, /^\d+\.\d+\.\d+$/, 'package.json must pin typescript EXACTLY, with no range operator')
  assert.ok(VERIFIED_TS_VERSIONS.includes(declared), `the pinned ${declared} is not in the verified set ${VERIFIED_TS_VERSIONS.join(', ')}`)
  assert.equal(ts.version, declared, 'the resolved typescript is not the pinned one')
  assert.deepEqual([...VERIFIED_TS_VERSIONS], extractConformance.verifiedTypescriptVersions)
})

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 2 — the ADVISORY seam (atlas decision 0028 PR 3)
//
// This PR computes Level 2 and reports it, and moves NO exit code. Every test below exists to
// pin one half of that sentence: the rule really does see the names (or it is a no-op nobody
// would notice), and the verdict path really does not (or the estate's exit codes moved during
// a transient window where two of three engines are still on spec v2).
// ─────────────────────────────────────────────────────────────────────────────

test('ADVISORY-MUST-NOT-MOVE: level1View makes a named-only delta invisible to the verdict path', () => {
  // The load-bearing property of this PR, asserted as an EQUALITY against the same call with no
  // names at all — not merely as "it happens to be ok". A mutant that fed the names into the
  // verdict call (the `level2enforcing` mutation) turns the first outcome into a `break`.
  const reference = {
    kind: 'exports-map',
    subpaths: ['.'],
    detail: null,
    names: {'.': {classification: CLASSIFICATIONS.TYPED, names: [{name: 'gone', kind: 'value'}, {name: 'kept', kind: 'value'}], target: './i.d.ts'}}
  }
  const candidate = {
    kind: 'exports-map',
    subpaths: ['.'],
    detail: null,
    names: {'.': {classification: CLASSIFICATIONS.TYPED, names: [{name: 'kept', kind: 'value'}], target: './i.d.ts'}}
  }
  const args = {declared: '1.0.1', referenceVersion: '1.0.0'}

  // The verdict path: names stripped from BOTH sides, so this is the spec-v2 evaluation verbatim.
  const verdictOutcome = evaluateSurface({...args, reference: level1View(reference), candidate: level1View(candidate)})
  const spec2Equivalent = evaluateSurface({
    ...args,
    reference: {kind: 'exports-map', subpaths: ['.'], detail: null},
    candidate: {kind: 'exports-map', subpaths: ['.'], detail: null}
  })
  assert.equal(verdictOutcome.kind, 'ok')
  assert.deepEqual(verdictOutcome, spec2Equivalent, 'the level1View evaluation must be BYTE-IDENTICAL to the names-less one')

  // The advisory path: the SAME rule over the SAME pair WITH names sees the removal and majors.
  const level2Outcome = evaluateSurface({...args, reference, candidate})
  assert.equal(level2Outcome.kind, 'break')
  assert.equal(level2Outcome.required, 'major')
  assert.deepEqual(level2Outcome.delta.removedNames, [{subpath: '.', name: 'gone', kind: 'value'}])

  // ...and it is reported as an OBSERVATION, which is the entire output of the advisory phase.
  const shape = surfaceAdvisories(level2Outcome)
  assert.deepEqual(shape.advisories, ['surface-named-delta:.:removed:gone', 'surface-named-break:major'])
  assert.equal(shape.level2, 'break')
})

test('level1View strips ONLY `names`, and does not mutate the surface it is given', () => {
  const surface = {kind: 'exports-map', subpaths: ['.'], detail: null, names: {'.': {classification: CLASSIFICATIONS.TYPED, names: [], target: null}}}
  const view = level1View(surface)
  assert.deepEqual(view, {kind: 'exports-map', subpaths: ['.'], detail: null})
  assert.ok('names' in surface, 'level1View must not mutate its input — the advisory path reads the same object afterwards')
})

test('INDETERMINATE-NEVER-GREEN: an asymmetric names field is exit-3 shaped, never a Level-1 pass', () => {
  // THE A2b HOLE decision 0028 was written around. The reference surface is served from the digest
  // cache; an entry written before Level 2 existed carries NO names. If that asymmetry quietly
  // degraded to a Level-1 comparison, a real named-export removal would read as "no names removed"
  // = GREEN off a stale cache — "I could not read the surface" collapsing into "the surface is
  // empty", which is exactly what A2b forbids.
  const withNames = {
    kind: 'exports-map',
    subpaths: ['.'],
    detail: null,
    names: {'.': {classification: CLASSIFICATIONS.TYPED, names: [{name: 'a', kind: 'value'}], target: './i.d.ts'}}
  }
  const staleLevel1Entry = {kind: 'exports-map', subpaths: ['.'], detail: null}

  const delta = surfaceDelta(staleLevel1Entry, withNames)
  assert.equal(delta.required, null, 'an asymmetric pair must NOT size to a Level-1 requirement')
  assert.match(delta.detail, /carries no Level-2 `names` field/)

  // Both directions, and both escalate through evaluateSurface to `indeterminate` — which the
  // caller maps to exit 3. Neither can read `ok`.
  for (const [reference, candidate] of [[staleLevel1Entry, withNames], [withNames, staleLevel1Entry]]) {
    const outcome = evaluateSurface({declared: '1.0.1', referenceVersion: '1.0.0', reference, candidate})
    assert.equal(outcome.kind, 'indeterminate')
  }

  // ...and while Level 2 is advisory, the advisory string is the ONLY way that state is visible.
  // A silent indeterminate is indistinguishable from a clean read, which is the collapse itself.
  const shape = surfaceAdvisories(evaluateSurface({declared: '1.0.1', referenceVersion: '1.0.0', reference: staleLevel1Entry, candidate: withNames}))
  assert.deepEqual(shape.advisories, ['surface-level2-indeterminate'])
  assert.ok(shape.level2Detail, 'an INDETERMINATE with no reason is unactionable')
})

test('INDETERMINATE-NEVER-GREEN: two names-LESS sides are a genuine Level-1 comparison, not an asymmetry', () => {
  // The other half, and why `level1View` is a SUFFICIENT advisory seam rather than an approximate
  // one: stripping both sides must land in the spec-v2 path, not in the fail-closed branch. If this
  // regressed, every row in the repo would read INDETERMINATE — exit 3 — the moment Level 2 landed.
  const before = {kind: 'exports-map', subpaths: ['.', './t'], detail: null}
  const after = {kind: 'exports-map', subpaths: ['.'], detail: null}
  const delta = surfaceDelta(before, after)
  assert.equal(delta.required, 'major')
  assert.deepEqual(delta.removed, ['./t'])
  assert.deepEqual(delta.removedNames, [])
})

test('RUNTIME-TS-GUARD: the extractor refuses a drifted compiler on its own path, not just in the runner', () => {
  // N3(c). A runner-only guard is satisfied by a CI run on the pinned version while a stale hoisted
  // `typescript` is resolved at RUNTIME, extracts different names, and writes them into the
  // reference cache UNDER THE CORRECTLY-PINNED KEY. That poisoned entry is undetectable by the key,
  // because the key trusts the pin the runtime bypassed. So the guard has to fire here.
  const files = {'package.json': '{"name":"x","exports":{".":"./i.d.ts"}}', 'i.d.ts': 'export declare const a: number\n'}
  const manifestText = files['package.json']

  // A version the contract does not admit is refused, whatever that set turns out to be. Asserted
  // against a version NO plausible verified set contains, so this survives the v1 (single version)
  // -> v2 (verified SET, decision 0030) change without being rewritten to chase the constant.
  assert.throws(() => extractSurfaceNames({files, manifestText, ts: {...ts, version: '4.0.0'}}), /typescript/)
  assert.throws(() => extractSurfaceNames({files, manifestText, ts: {version: '7.0.2'}}), /exposes no createProgram — this is the native \(7\.x\) port/)
  assert.throws(() => extractSurfaceNames({files, manifestText, ts: null}), /requires the typescript compiler module/)

  // ...and an ADMITTED compiler extracts normally, so the guard is refusing drift and not
  // everything. The version is spoofed onto the real compiler through `extractSurfaceNames`' own
  // documented injection seam, which is what keeps this assertion independent of which patch this
  // repo happens to have installed: today the vendored extractor is spec v1 and admits only 5.9.2
  // while this repo pins 5.9.3, and decision 0030's whole finding is that those two extract
  // BYTE-IDENTICALLY. Once the v2 extractor lands, the bare `ts` works here unspoofed.
  // ...and the REAL resolved compiler extracts normally, unspoofed: this repo pins 5.9.3, which is
  // a member of the verified set, so the guard is refusing drift and not everything. Under extract
  // spec v1 this assertion had to inject a version onto the compiler because the contract admitted
  // only 5.9.2; the version SET is precisely what removed that indirection.
  assert.ok(VERIFIED_TS_VERSIONS.includes(ts.version), `the resolved typescript ${ts.version} is not a verified member`)
  const admitted = ts
  assert.deepEqual(extractSurfaceNames({files, manifestText, ts: admitted}).names['.'].names, [{name: 'a', kind: 'value'}])

  // The same compiler proves the RULE is wired to real extractor output, not to a hand-built
  // fixture: a `.d.ts` and an asset classify differently, and BOTH kinds of name are recorded
  // (dropping type-only names would make `export interface Opts` deletable under a patch).
  const rich = {
    'package.json': '{"name":"x","exports":{".":"./i.d.ts","./style":"./s.css"}}',
    'i.d.ts': 'export declare const a: number\nexport interface Opts {x: number}\n',
    's.css': 'a{}'
  }
  const extracted = extractSurfaceNames({files: rich, manifestText: rich['package.json'], ts: admitted}).names
  assert.deepEqual(extracted['.'].names, [{name: 'Opts', kind: 'type'}, {name: 'a', kind: 'value'}])
  assert.equal(extracted['.'].classification, CLASSIFICATIONS.TYPED)
  // An asset is NO_SURFACE — determinable, not unknown. Scoring it "0 exports, clean" would be a
  // meaningless green over 48% of the estate; calling it INDETERMINATE would block 5 of 24 packages.
  assert.equal(extracted['./style'].classification, CLASSIFICATIONS.NO_SURFACE)
})

test('RUNTIME-TS-GUARD: surfaceOfPayload turns an extractor throw into INDETERMINATE, never an empty name set', () => {
  // The boundary that keeps the guard above from being a gate-wide crash — AND from being a silent
  // pass. Both failure modes are wrong; this is the third answer. Asserted by feeding a payload
  // whose manifest is fine but whose extraction cannot run, via a `.d.ts` the compiler cannot parse
  // as one — the classifier's own INDETERMINATE, reached without stubbing anything.
  const packed = new Map([
    ['package.json', Buffer.from('{"name":"x","exports":{".":"./missing.d.ts"}}')]
  ])
  const surface = surfaceOfPayload(packed)
  assert.equal(surface.kind, 'exports-map')
  assert.equal(surface.names['.'].classification, CLASSIFICATIONS.INDETERMINATE)
  assert.deepEqual(surface.names['.'].names, [])
  assert.ok(surface.names['.'].detail, 'an INDETERMINATE subpath must carry a reason')
  // ...and it is fail-CLOSED downstream: comparing it against a real surface cannot read `ok`.
  const healthy = {
    kind: 'exports-map',
    subpaths: ['.'],
    detail: null,
    names: {'.': {classification: CLASSIFICATIONS.TYPED, names: [{name: 'a', kind: 'value'}], target: './i.d.ts'}}
  }
  assert.equal(evaluateSurface({declared: '1.0.1', referenceVersion: '1.0.0', reference: healthy, candidate: surface}).kind, 'indeterminate')
})

test('surfaceOfPayload ALWAYS carries a Level-2 `names` field, whatever the extractor answered', () => {
  // The engine-level half of "the rule is actually wired in". `surfaceOfPayload` calls the
  // extractor with the DEFAULT compiler — no injection seam — so what the names CONTAIN depends on
  // whether the resolved `typescript` is one the vendored extractor admits. What must hold either
  // way, and what this asserts, is that the field is PRESENT and populated per subpath.
  //
  // That is not a weaker version of the real assertion, it is a different and load-bearing one:
  // `surfaceDelta` keys its A2b asymmetry branch off the PRESENCE of `names`, so a surface that
  // silently omitted the field on the extractor's error path would compare as a plain Level-1
  // surface and a stale-cache removal would read green. Present-with-INDETERMINATE fails closed;
  // absent does not. (The positive "these exact names come out of that exact tree" assertion lives
  // in the RUNTIME-TS-GUARD test above, via the injection seam.)
  const packed = new Map([
    ['package.json', Buffer.from('{"name":"x","exports":{".":"./i.d.ts","./style":"./s.css"}}')],
    ['i.d.ts', Buffer.from('export declare const a: number\nexport interface Opts {x: number}\n')],
    ['s.css', Buffer.from('a{}')]
  ])
  const surface = surfaceOfPayload(packed)
  assert.deepEqual(surface.subpaths, ['.', './style'])
  assert.ok(surface.names, 'a Level-2 surface must carry `names` — its absence is the A2b asymmetry hole')
  assert.deepEqual(Object.keys(surface.names).sort(), ['.', './style'])
  for (const [subpath, entry] of Object.entries(surface.names)) {
    assert.ok(Object.values(CLASSIFICATIONS).includes(entry.classification), `${subpath} has no classification`)
    assert.ok(Array.isArray(entry.names), `${subpath} has no name list`)
    if (entry.classification === CLASSIFICATIONS.INDETERMINATE) {
      assert.ok(entry.detail, `${subpath} is INDETERMINATE with no reason — unactionable`)
    }
  }
})

test('namesDelta composes at MAX rank, never min — an addition cannot launder a removal', () => {
  // The `minrank` inversion is easy and catastrophic: it would let ANY breaking change ship green
  // by bundling an addition alongside it.
  const reference = {
    './a': {classification: CLASSIFICATIONS.TYPED, names: [{name: 'gone', kind: 'value'}]},
    './b': {classification: CLASSIFICATIONS.TYPED, names: []}
  }
  const candidate = {
    './a': {classification: CLASSIFICATIONS.TYPED, names: []},
    './b': {classification: CLASSIFICATIONS.TYPED, names: [{name: 'fresh', kind: 'value'}]}
  }
  assert.equal(namesDelta(reference, candidate).required, 'major')
})

test('subpathNameDelta: a value degrading to a type MAJORS; the reverse is additive', () => {
  // The same removal wearing a disguise — the value binding is gone even though the identifier
  // survives — so it must not read as "unchanged, only the kind moved".
  const typed = (names) => ({classification: CLASSIFICATIONS.TYPED, names})
  const degraded = subpathNameDelta('.', typed([{name: 'x', kind: 'value'}]), typed([{name: 'x', kind: 'type'}]))
  assert.equal(degraded.required, 'major')
  assert.deepEqual(degraded.removedNames, [{subpath: '.', name: 'x', kind: 'value'}])
  const promoted = subpathNameDelta('.', typed([{name: 'x', kind: 'type'}]), typed([{name: 'x', kind: 'value'}]))
  assert.equal(promoted.required, 'minor')
  // `unknown` (an alias chain leaving the payload) participates in PRESENCE but never manufactures
  // a kind regression out of "I could not resolve what this is".
  assert.equal(subpathNameDelta('.', typed([{name: 'x', kind: 'unknown'}]), typed([{name: 'x', kind: 'value'}])).required, 'none')
})

test('subpathNameDelta: TYPED -> NO_SURFACE revokes every name behind the subpath (MAJOR)', () => {
  // A `.d.ts` swapped for a `.json` keeps the subpath, so Level 1 sees nothing at all.
  const before = {classification: CLASSIFICATIONS.TYPED, names: [{name: 'a', kind: 'value'}]}
  const after = {classification: CLASSIFICATIONS.NO_SURFACE, names: []}
  assert.equal(subpathNameDelta('./x', before, after).required, 'major')
  assert.equal(subpathNameDelta('./x', after, before).required, 'minor')
  // Two assets are compared only against each other, and that is silence, not a requirement.
  assert.equal(subpathNameDelta('./x', after, after).required, 'none')
})

test('subpathNameDelta: an INDETERMINATE side is `required: null`, on EITHER side', () => {
  const typed = {classification: CLASSIFICATIONS.TYPED, names: [{name: 'a', kind: 'value'}]}
  const unknown = {classification: CLASSIFICATIONS.INDETERMINATE, names: [], detail: 'declared but absent'}
  assert.equal(subpathNameDelta('.', unknown, typed).required, null)
  assert.equal(subpathNameDelta('.', typed, unknown).required, null)
  // A subpath present on only ONE side still escalates: "I could not read the surface of a subpath
  // you added" is not evidence that adding it was safe.
  assert.equal(namesDelta({}, {'./new': unknown}).required, null)
})

test('readExportTargets returns EXACTLY the subpath keys readExportSurface reports', () => {
  // A SUGAR DISAGREEMENT between the two readers would mean the rule and the extractor disagree
  // about what a subpath even IS. The vendored `tgt-*` vectors assert this across the fixture; this
  // pins it against the three sugar forms directly.
  for (
    const manifest of [
      '{"exports":"./i.js"}',
      '{"exports":["./a.js","./b.js"]}',
      '{"exports":{"import":"./i.mjs","require":"./i.cjs"}}',
      '{"exports":{".":"./i.js","./t/*":"./t/*.js"}}',
      '{"main":"./i.js"}',
      '{"exports":42}'
    ]
  ) {
    assert.deepEqual(Object.keys(readExportTargets(manifest).targets).sort(), [...readExportSurface(manifest).subpaths].sort(), manifest)
  }
  // The three sugar forms all mean `{".": <value>}`, and the RAW value is what reaches the extractor.
  assert.deepEqual(readExportTargets('{"exports":"./i.js"}').targets, {'.': './i.js'})
  assert.deepEqual(readExportTargets('{"exports":{"import":"./i.mjs"}}').targets, {'.': {import: './i.mjs'}})
})

// ─────────────────────────────────────────────────────────────────────────────
// Cross-implementation VERDICT-LADDER conformance vectors
//
// THE FIXTURE AND THE RUNNER ARE VENDORED VERBATIM from atlas/contracts/verdict-ladder/. The ladder
// (decideVerdict + exitClassFor) was triplicated across mantle, this script and atlas with ZERO
// cross-implementation vectors — strictly worse than the pre-contract digest, and the three even
// disagreed on the most dangerous axis (what an UNKNOWN verdict does: compile error / throw / silent
// pass). These vectors pin all three to one definition; the __UNKNOWN_VERDICT__ / __UNKNOWN_LANE__
// cases assert exitClassFor THROWS rather than passing an unclassified verdict. See atlas 0022.
// ─────────────────────────────────────────────────────────────────────────────

test('ladder conformance: the vendored fixture matches the checksum this implementation pins', () => {
  assert.deepEqual(assertLadderFixtureIntegrity(ladderBytes, LADDER_CONFORMANCE_SHA256), [])
})

test('ladder conformance: the vendored .sha256 sidecar agrees with the pinned constant', () => {
  const sidecar = fs.readFileSync(path.join(here, 'fixtures/verdict-conformance.sha256'), 'utf8').trim().split(/\s+/)[0]
  assert.equal(sidecar, LADDER_CONFORMANCE_SHA256)
})

test('ladder conformance: every vector passes under the SHARED runner', () => {
  const failures = runLadderConformance({
    fixture: ladderConformance,
    specVersion: LADDER_SPEC_VERSION,
    resolveVerdict: (input) => decideVerdict(input),
    exitClassOf: (verdict, lane) => exitClassFor(verdict, lane),
    compareSemver
  })
  assert.deepEqual(failures, [])
})

test('ladder conformance: it carries the __UNKNOWN_VERDICT__ / __UNKNOWN_LANE__ throw vectors', () => {
  assert.equal(ladderConformance.specVersion, LADDER_SPEC_VERSION)
  assert.ok(ladderConformance.cases.some((c) => c.expect?.throws === true))
})

test('ladder conformance: a wrong LADDER_SPEC_VERSION short-circuits with exactly one message', () => {
  const failures = runLadderConformance({
    fixture: ladderConformance,
    specVersion: LADDER_SPEC_VERSION + 1,
    resolveVerdict: (input) => decideVerdict(input),
    exitClassOf: (verdict, lane) => exitClassFor(verdict, lane),
    compareSemver
  })
  assert.equal(failures.length, 1)
  assert.match(failures[0], /^LADDER_SPEC_VERSION: implementation is 2, fixture is 1$/)
})

/**
 * The vectors lock this implementation against the other two. On their own they cannot
 * tell a correct rule from a consistently wrong one, so the relations they exist to
 * express are asserted here independently of the recorded values — starting with the
 * measured regression that motivated the whole rule.
 */
test('surface conformance: the relations the shared vectors exist to pin', () => {
  const byId = Object.fromEntries(surfaceConformance.cases.map((c) => [c.id, c]))

  // THE REGRESSION, exactly as it shipped: @j0nathan-ll0yd/web@1.1.0 dropped `./types/*`
  // and went out as a MINOR. Every payload gate in the estate passed.
  const shipped = byId['out-web-1.0.0-to-1.1.0-BREAKS']
  assert.equal(shipped.expect.kind, 'break')
  assert.equal(shipped.expect.required, 'major')
  assert.equal(shipped.expect.declaredBump, 'minor')
  assert.deepEqual(shipped.expect.removed, ['./types/*'])

  // 0.x uses CARET-RANGE semantics, not naive field comparison: `^0.1.2` resolves
  // `>=0.1.2 <0.2.0`, so 0.1.0 -> 0.2.0 breaks a consumer as hard as 1.0.0 -> 2.0.0 does.
  // Reading only the major field would let a 0.x package delete an export under a "minor"
  // and pass — the same hole this rule exists to close. This repo ships 0.x packages.
  assert.equal(byId['bmp-zerox-minor-is-major'].expect.level, 'major')
  assert.equal(byId['bmp-zerozerox-patch-is-major'].expect.level, 'major')
  // An unparseable version is `null`, and null can never CLEAR a requirement.
  assert.equal(byId['bmp-unparseable-from-is-null'].expect.level, null)
  // Introducing an exports map REVOKES deep-import access to everything unlisted: MAJOR.
  // Removing it restores unbounded access: additive, MINOR.
  assert.equal(byId['sur-absent-exports-is-legacy'].expect.kind, 'legacy')
  // Every shape the reader refuses must carry a reason — an unreadable surface with no
  // reason is unactionable, and the caller must escalate it to exit 3 regardless.
  for (const id of ['sur-mixed-keys-is-unreadable', 'sur-number-exports-is-unreadable', 'sur-missing-manifest-is-unreadable']) {
    assert.equal(byId[id].expect.kind, 'unreadable')
    assert.ok(readExportSurface(byId[id].input).detail, `${id} produced no reason`)
  }

  // CHANGESET-AWARENESS (spec v2, atlas decision 0024). The four safety invariants the vendored
  // vectors pin, asserted independently of their recorded outcomes so a consistently-wrong credit
  // could not slip through. These are the same properties DS's --self-test S22e–S22j mirror.
  // 1. An ADEQUATE projected bump credits the delta (the DS #164 fix): removal under a declared
  //    MINOR with a pending MAJOR is `ok`, sized against the credited 2.0.0.
  const covered = byId['out-changeset-covers-removal-projected-major-PASSES']
  assert.equal(covered.expect.kind, 'ok')
  assert.equal(covered.expect.sizingBump, 'major')
  assert.equal(covered.expect.creditedVersion, '2.0.0')
  // 2. MANDATORY ADEQUACY: a projected MINOR does not cover a removal needing MAJOR — still a break,
  //    and the credited version is still recorded on the row.
  assert.equal(byId['out-changeset-inadequate-projected-minor-BREAKS'].expect.kind, 'break')
  assert.equal(byId['out-changeset-inadequate-projected-minor-BREAKS'].expect.required, 'major')
  // 3. FALLBACK: not-measured, measured-but-absent and indeterminate all size against `declared` and
  //    grant no credit (creditedVersion null) — byte-for-byte spec-version-1 behaviour.
  for (
    const id of [
      'out-changeset-not-measured-removal-BREAKS',
      'out-changeset-measured-absent-removal-BREAKS',
      'out-changeset-indeterminate-probe-removal-BREAKS'
    ]
  ) {
    assert.equal(byId[id].expect.kind, 'break', `${id} must fall back to a break`)
    assert.equal(byId[id].expect.creditedVersion, null, `${id} must credit nothing`)
  }
  // 4. CREDIT ONLY RAISES: a backward, regression-shaped projection (1.2.0 behind a declared 1.5.0)
  //    is refused by isStrictlyAhead, so the declared bump stands and the removal breaks.
  assert.equal(byId['out-changeset-backward-projection-not-credited-BREAKS'].expect.kind, 'break')
  assert.equal(byId['out-changeset-backward-projection-not-credited-BREAKS'].expect.creditedVersion, null)
})

// ─────────────────────────────────────────────────────────────────────────────
// Export-surface wiring — the parts the shared vectors deliberately do NOT cover
//
// The vectors define the RULE. They say nothing about how this engine reaches it: which
// verdicts it is applied over, what an unreadable surface does to the exit code, how the
// packed tarball becomes a manifest string, or what the reference cache is allowed to
// remember. Those are this repo's obligations and are asserted here.
// ─────────────────────────────────────────────────────────────────────────────

test('the surface rule is applied over exactly the five successfully-compared verdicts', () => {
  // NEVER_PUBLISHED has no reference surface to shrink from, and VERSION_REGRESSION is a
  // more fundamental defect in the same exit class — neither is second-guessed by this
  // rule. Widening this set silently is how a "could not tell" becomes a surface verdict.
  // PENDING_CHANGESET is present precisely so a SURFACE_BREAK on an excused package is NEVER
  // laundered green: the surface rule runs after the excuse and overrides it (atlas 0022).
  assert.deepEqual([...SURFACE_APPLICABLE_VERDICTS].sort(), ['BUMP_NOT_NEEDED', 'CLEAN', 'DRIFT', 'PENDING_CHANGESET', 'PENDING_PUBLISH'])
})

test('surfaceOfPayload reads the TOP-LEVEL manifest out of a packed tarball map', () => {
  const packed = new Map([
    ['package.json', Buffer.from('{"name":"x","exports":{".":"./i.js","./types/*":"./t/*.js"}}')],
    // A nested manifest is part of its package's payload, never the contract Node resolves.
    ['dist/package.json', Buffer.from('{"name":"x","exports":{"./nested":"./n.js"}}')]
  ])
  assert.deepEqual(surfaceOfPayload(packed).subpaths, ['.', './types/*'])
})

test('surfaceOfPayload treats a payload with NO manifest as unreadable, not as legacy', () => {
  // npm injects package.json at the package root unconditionally, so its absence means the
  // tarball is not what it claims to be. Calling that `legacy` would read "no exports map"
  // — i.e. a pass — out of an artifact nothing could be determined from.
  const surface = surfaceOfPayload(new Map([['dist/a.js', Buffer.from('x')]]))
  assert.equal(surface.kind, 'unreadable')
  assert.ok(surface.detail)
})

test('evaluateSurface: a version already published has NO headroom for a surface change', () => {
  // When the declared version IS the reference version the declared bump is `none`, so any
  // surface change breaks. Moving the surface of a version already in the registry is a
  // breaking change with no bump at all — `changeset publish` would skip it entirely.
  const before = readExportSurface('{"exports":{".":"./i.js","./t":"./t.js"}}')
  const after = readExportSurface('{"exports":{".":"./i.js"}}')
  const outcome = evaluateSurface({declared: '1.0.0', referenceVersion: '1.0.0', reference: before, candidate: after})
  assert.equal(outcome.kind, 'break')
  assert.equal(outcome.declaredBump, 'none')
  assert.equal(outcome.required, 'major')
})

test('evaluateSurface: an unreadable side is INDETERMINATE, never "no requirement"', () => {
  const readable = readExportSurface('{"exports":{".":"./i.js"}}')
  const unreadable = readExportSurface('{"exports":42}')
  assert.equal(evaluateSurface({declared: '2.0.0', referenceVersion: '1.0.0', reference: unreadable, candidate: readable}).kind, 'indeterminate')
  assert.equal(evaluateSurface({declared: '2.0.0', referenceVersion: '1.0.0', reference: readable, candidate: unreadable}).kind, 'indeterminate')
  // ...and an unsizeable bump is the same answer, for the same reason.
  assert.equal(evaluateSurface({declared: 'nightly', referenceVersion: '1.0.0', reference: readable, candidate: readable}).kind, 'indeterminate')
})

test('exitClassFor: SURFACE_BREAK is exit 2 in EVERY lane — the lane changes severity, not verdicts', () => {
  // Deliberately unlike PENDING_PUBLISH, which is the state this defect hid inside. By the
  // time the post-publish lane runs, consumers on a caret range have already resolved the
  // tarball that lost the subpath, so there is no lane in which this is tolerable.
  for (const lane of LANES) {
    assert.equal(exitClassFor('SURFACE_BREAK', lane), 2)
  }
})

/** The on-disk cache directory for the CURRENT key scheme, and the single entry inside it. */
const cacheEntryFile = (repoRoot) => {
  const dir = path.join(repoRoot, 'node_modules', '.cache', 'pkg-drift', `v${SPEC_VERSION}-s${SURFACE_SPEC_VERSION}-e${EXTRACT_SPEC_VERSION}`)
  return path.join(dir, fs.readdirSync(dir)[0])
}

/** A schema-valid spec-v3 reference surface: an `exports` map that carries its Level-2 `names`. */
const v3Surface = (names) => ({kind: 'exports-map', subpaths: ['.', './types/*'], detail: null, names})

test('the reference cache refuses an entry written before it recorded a surface', () => {
  // The digest SPEC_VERSION is deliberately NOT bumped for the added field — that number
  // means "the digest bytes changed", and they have not. Narrowing on the SHAPE is what
  // makes that safe: a pre-existing entry fails this check and is refetched, which costs
  // one download and can never produce a wrong answer. If this ever passes, a stale entry
  // would be read as `surface: undefined` and every surface comparison against it would
  // throw or silently pass.
  const repoRoot = tmpdir('drift-cache-')
  const surface = v3Surface({'.': {classification: CLASSIFICATIONS.TYPED, names: [{name: 'a', kind: 'value'}], target: './i.d.ts'}})
  const perFile = new Map([['package.json', 'abc']])
  writeCache(repoRoot, '@toy/cached', '1.0.0', {strictPerFile: perFile, effectivePerFile: perFile, surface})
  assert.deepEqual(readCache(repoRoot, '@toy/cached', '1.0.0').surface, surface)

  // Now rewrite it in the pre-surface shape, exactly as an older checkout left it on disk.
  const file = cacheEntryFile(repoRoot)
  const legacy = JSON.parse(fs.readFileSync(file, 'utf8'))
  delete legacy.surface
  delete legacy.surfaceSpecVersion
  fs.writeFileSync(file, JSON.stringify(legacy))
  assert.equal(readCache(repoRoot, '@toy/cached', '1.0.0'), null)
  fs.rmSync(repoRoot, {recursive: true, force: true})
})

test('A2b ON THE CACHE: a pre-Level-2 (names-LESS) entry is refused, never served as an empty name set', () => {
  // GUARD (a), atlas decision 0028 §2.4a — and the reason the whole decision was written. The
  // reference surface comes from THIS cache in steady state. An entry written before Level 2
  // existed carries `{kind, subpaths}` and no names; reading Level-2 names out of it yields an
  // EMPTY SET, so a real named-export removal reads as "no names removed" = GREEN. That is "I could
  // not read the surface" collapsing into "the surface is empty", which A2b forbids outright.
  //
  // Refusing it makes it a cache MISS, which refetches and re-extracts. A miss costs one download;
  // the alternative costs a silent false green on a breaking change.
  const repoRoot = tmpdir('drift-cache-stale-')
  const perFile = new Map([['package.json', 'abc']])
  const surface = v3Surface({'.': {classification: CLASSIFICATIONS.TYPED, names: [{name: 'a', kind: 'value'}], target: './i.d.ts'}})
  writeCache(repoRoot, '@toy/stale', '1.0.0', {strictPerFile: perFile, effectivePerFile: perFile, surface})

  const file = cacheEntryFile(repoRoot)
  const entry = JSON.parse(fs.readFileSync(file, 'utf8'))
  delete entry.surface.names // the pre-Level-2 shape, sitting at a CURRENT key (a half-migrated entry)
  fs.writeFileSync(file, JSON.stringify(entry))
  assert.equal(readCache(repoRoot, '@toy/stale', '1.0.0'), null, 'a names-less v3-key entry must be a MISS, not a names-less surface')
  fs.rmSync(repoRoot, {recursive: true, force: true})
})

test('A2b ON THE CACHE: the guard keys off FIELD PRESENCE, never emptiness', () => {
  // The other direction, and it is not a nicety. A package whose every subpath is an asset carries
  // a legitimately EMPTY name set BY DESIGN. An emptiness-keyed guard would refuse those entries
  // forever, sending them back to the registry on every single run, for no signal at all — a
  // perpetual-refetch flap. `{}` is a real answer; a MISSING field is the unreadable one.
  const repoRoot = tmpdir('drift-cache-empty-')
  const perFile = new Map([['package.json', 'abc']])
  const allAssets = v3Surface({'./style': {classification: CLASSIFICATIONS.NO_SURFACE, names: [], target: './s.css'}})
  writeCache(repoRoot, '@toy/assets', '1.0.0', {strictPerFile: perFile, effectivePerFile: perFile, surface: allAssets})
  assert.deepEqual(readCache(repoRoot, '@toy/assets', '1.0.0').surface, allAssets, 'an all-asset package must be SERVED, not refetched forever')

  // Even a completely empty names map is a real answer and must be served.
  const emptyNames = v3Surface({})
  writeCache(repoRoot, '@toy/empty', '1.0.0', {strictPerFile: perFile, effectivePerFile: perFile, surface: emptyNames})
  assert.deepEqual(readCache(repoRoot, '@toy/empty', '1.0.0').surface, emptyNames)
  fs.rmSync(repoRoot, {recursive: true, force: true})
})

test('the cache KEY carries both the surface and extract versions, so a superseded entry is never read', () => {
  // GUARD (b), §2.4b. The read guard and the key answer DIFFERENT questions, and only together do
  // they close the hole: the guard asks "is this the right SHAPE?", the key asks "was this produced
  // by the right RULE?". An entry written by a superseded extractor is SCHEMA-VALID — it has a
  // `names` field, so no shape check has any reason to reject it — while its names are simply
  // wrong. Only the key catches that one.
  //
  // The entry is ONE file holding both digest and surface, so a bump invalidates the WHOLE thing,
  // digests included. That over-invalidation is accepted: bumps are rare, the cost is one cold
  // pass, and correctness dominates.
  const repoRoot = tmpdir('drift-cache-key-')
  const perFile = new Map([['package.json', 'abc']])
  const surface = v3Surface({'.': {classification: CLASSIFICATIONS.TYPED, names: [{name: 'a', kind: 'value'}], target: './i.d.ts'}})
  writeCache(repoRoot, '@toy/keyed', '1.0.0', {strictPerFile: perFile, effectivePerFile: perFile, surface})

  const scheme = `v${SPEC_VERSION}-s${SURFACE_SPEC_VERSION}-e${EXTRACT_SPEC_VERSION}`
  assert.ok(fs.existsSync(path.join(repoRoot, 'node_modules', '.cache', 'pkg-drift', scheme)), `the entry must live under ${scheme}`)
  // A digest-only key (the pre-0028 scheme) would have collided with entries from any surface rule.
  assert.ok(!fs.existsSync(path.join(repoRoot, 'node_modules', '.cache', 'pkg-drift', `v${SPEC_VERSION}`)))

  // A stored entry whose recorded versions disagree with this build is refused even at a matching
  // path — the field check is the second net behind the key, exactly as the names guard is.
  const file = cacheEntryFile(repoRoot)
  const entry = JSON.parse(fs.readFileSync(file, 'utf8'))
  fs.writeFileSync(file, JSON.stringify({...entry, extractSpecVersion: EXTRACT_SPEC_VERSION + 1}))
  assert.equal(readCache(repoRoot, '@toy/keyed', '1.0.0'), null)
  fs.writeFileSync(file, JSON.stringify({...entry, surfaceSpecVersion: SURFACE_SPEC_VERSION - 1}))
  assert.equal(readCache(repoRoot, '@toy/keyed', '1.0.0'), null)
  fs.rmSync(repoRoot, {recursive: true, force: true})
})

test('the reference cache round-trips `names` VERBATIM — dropping them is the A2b hole itself', () => {
  // `readCache` reconstructs the surface field by field, so a missed field is a silent data loss
  // rather than a type error. Before Level 2 that reconstruction dropped everything but
  // `{kind, subpaths, detail}` — which is precisely the shape that reads a removal as green.
  const repoRoot = tmpdir('drift-cache-names-')
  const perFile = new Map([['package.json', 'abc']])
  const names = {
    '.': {classification: CLASSIFICATIONS.TYPED, names: [{name: 'Opts', kind: 'type'}, {name: 'a', kind: 'value'}], target: './i.d.ts', detail: null},
    './types/*': {classification: CLASSIFICATIONS.NO_SURFACE, names: [], target: './t.css', detail: 'asset'}
  }
  writeCache(repoRoot, '@toy/names', '1.0.0', {strictPerFile: perFile, effectivePerFile: perFile, surface: v3Surface(names)})
  const restored = readCache(repoRoot, '@toy/names', '1.0.0').surface
  assert.deepEqual(restored.names, names)

  // ...and the restored surface compares as a real Level-2 reference: a removal against it majors,
  // rather than degrading to the asymmetry branch or to a Level-1 pass.
  const candidate = v3Surface({...names, '.': {...names['.'], names: [{name: 'a', kind: 'value'}]}})
  const delta = surfaceDelta(restored, candidate)
  assert.equal(delta.required, 'major')
  assert.deepEqual(delta.removedNames, [{subpath: '.', name: 'Opts', kind: 'type'}])
  fs.rmSync(repoRoot, {recursive: true, force: true})
})

test('the stripped set is exactly the six scripts pnpm pack removes — prepublish is NOT one', () => {
  assert.deepEqual([...PUBLISH_ONLY_SCRIPTS], ['postpack', 'postpublish', 'prepack', 'prepare', 'prepublishOnly', 'publish'])
  assert.ok(!PUBLISH_ONLY_SCRIPTS.includes('prepublish'), 'legacy prepublish must survive — neither pack tool strips it')
  for (const consumerRun of ['preinstall', 'install', 'postinstall']) {
    assert.ok(!PUBLISH_ONLY_SCRIPTS.includes(consumerRun), `${consumerRun} runs on a consumer machine and must be hashed`)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Canonicalisation
// ─────────────────────────────────────────────────────────────────────────────

test('canonicalize sorts object keys recursively and preserves array order', () => {
  assert.equal(JSON.stringify(canonicalize({b: 1, a: {d: [3, 1, 2], c: 2}})), '{"a":{"c":2,"d":[3,1,2]},"b":1}')
})

test('canonicalize passes primitives and null through untouched', () => {
  assert.equal(canonicalize(null), null)
  assert.equal(canonicalize(false), false)
  assert.equal(canonicalize(0), 0)
  assert.equal(canonicalize('x'), 'x')
})

test('normalizeEntry deletes the top-level version from package.json only', () => {
  const manifest = Buffer.from('{"version":"9.9.9","name":"x"}')
  assert.equal(normalizeEntry('package.json', manifest).toString(), '{"name":"x"}')
  // Any other file is raw bytes, even if it happens to be JSON with a version.
  assert.equal(normalizeEntry('dist/meta.json', manifest).toString(), '{"version":"9.9.9","name":"x"}')
})

test('normalizeEntry keeps nested dependency versions (the cascade signal)', () => {
  const manifest = Buffer.from('{"name":"x","version":"1.0.0","dependencies":{"@s/dep":"1.0.1"}}')
  assert.match(normalizeEntry('package.json', manifest).toString(), /"@s\/dep":"1\.0\.1"/)
})

test('normalizeEntry falls back to raw bytes instead of throwing on an unusable manifest', () => {
  // The old rule called JSON.parse with no try/catch, so a malformed manifest crashed
  // the gate where the other two implementations reported a difference.
  const malformed = Buffer.from('{"name":"x",}')
  assert.equal(normalizeEntry('package.json', malformed).toString(), '{"name":"x",}')
  const notAnObject = Buffer.from('["not","a","manifest"]')
  assert.equal(normalizeEntry('package.json', notAnObject).toString(), '["not","a","manifest"]')
})

test('normalizeEntry collapses the three spellings of "no runnable scripts"', () => {
  const withOnlyPublishScripts = normalizeEntry('package.json', Buffer.from('{"name":"x","scripts":{"prepack":"tsc"}}')).toString()
  const withEmptyScripts = normalizeEntry('package.json', Buffer.from('{"name":"x","scripts":{}}')).toString()
  const withNoScripts = normalizeEntry('package.json', Buffer.from('{"name":"x"}')).toString()
  assert.equal(withOnlyPublishScripts, '{"name":"x"}')
  assert.equal(withEmptyScripts, '{"name":"x"}')
  assert.equal(withNoScripts, '{"name":"x"}')
})

test('differingFiles reports additions, removals and modifications, sorted', () => {
  const left = new Map([['a', '1'], ['b', '1'], ['c', '1']])
  const right = new Map([['a', '1'], ['b', '2'], ['d', '1']])
  assert.deepEqual(differingFiles(left, right), ['b', 'c', 'd'])
})

test('isDeadSourceMap ignores a map with no sources and one that is not JSON', () => {
  const files = new Map([
    ['dist/a.js.map', Buffer.from('{"version":3,"mappings":"AAAA"}')],
    ['dist/b.js.map', Buffer.from('nonsense')]
  ])
  assert.deepEqual(payloadDigests(files).deadMaps, [])
})

test('isDeadSourceMap honours sourceRoot and never kills a data: source', () => {
  const packed = new Set(['dist/a.js.map', 'src/a.ts'])
  // Without sourceRoot the source resolves to dist/a.ts, which is NOT packed; with it,
  // to src/a.ts, which is. Ignoring sourceRoot would wrongly call this map dead and drop
  // a real payload file out of the effective digest.
  assert.equal(isDeadSourceMap('dist/a.js.map', Buffer.from('{"sourceRoot":"../src","sources":["a.ts"]}'), packed), false)
  assert.equal(isDeadSourceMap('dist/a.js.map', Buffer.from('{"sources":["a.ts"]}'), packed), true)
  // Inlined content is always resolvable.
  assert.equal(isDeadSourceMap('dist/a.js.map', Buffer.from('{"sources":["data:text/plain,hi"]}'), packed), false)
})

test('a map with even ONE resolvable source stays in the effective digest', () => {
  // The conservative direction: keeping a file can only cause a report, never suppress
  // one. (mantle dropped a map when ANY source was missing — the unsafe direction.)
  const files = new Map([
    ['dist/a.js', Buffer.from('x')],
    ['dist/a.js.map', Buffer.from('{"sources":["a.js","../elsewhere/gone.ts"]}')]
  ])
  assert.deepEqual(payloadDigests(files).deadMaps, [])
})

test('payloadDigests excludes leak-screen hits entirely from both digests', () => {
  const files = new Map([['dist/a.js', Buffer.from('x')], ['src/.omc/scratch.json', Buffer.from('{}')]])
  const withLeak = payloadDigests(files, new Set(['src/.omc/scratch.json']))
  const withoutLeak = payloadDigests(new Map([['dist/a.js', Buffer.from('x')]]))
  assert.equal(withLeak.strictDigest, withoutLeak.strictDigest)
  assert.equal(withLeak.effectiveDigest, withoutLeak.effectiveDigest)
})

// ─────────────────────────────────────────────────────────────────────────────
// Verdicts — the state table, exhaustively
// ─────────────────────────────────────────────────────────────────────────────

const verdictCases = [
  {
    why: 'declared version is published and the payloads match',
    input: {declared: '1.0.0', registryVersions: ['1.0.0'], payloadMatchesReference: true},
    verdict: 'CLEAN',
    referenceVersion: '1.0.0'
  },
  {
    why: 'declared version is published and the payloads differ — always blocking',
    input: {declared: '1.0.0', registryVersions: ['1.0.0'], payloadMatchesReference: false},
    verdict: 'DRIFT',
    referenceVersion: '1.0.0'
  },
  {
    why: 'a published-but-not-newest declared version carries an advisory, not a different verdict',
    input: {declared: '1.0.0', registryVersions: ['1.0.0', '1.1.0'], payloadMatchesReference: true},
    verdict: 'CLEAN',
    referenceVersion: '1.0.0',
    advisories: ['behind-registry']
  },
  {
    why: 'bumped ahead of the registry with a real payload change (finding H2)',
    input: {declared: '1.2.0', registryVersions: ['1.0.0', '1.1.0'], payloadMatchesReference: false},
    verdict: 'PENDING_PUBLISH',
    referenceVersion: '1.1.0'
  },
  {
    why: 'bumped ahead of the registry but the payload is identical — revert the bump',
    input: {declared: '1.2.0', registryVersions: ['1.0.0', '1.1.0'], payloadMatchesReference: true},
    verdict: 'BUMP_NOT_NEEDED',
    referenceVersion: '1.1.0'
  },
  {
    why: 'the manifest declares a version below what is already published',
    input: {declared: '0.9.0', registryVersions: ['1.0.0'], payloadMatchesReference: true},
    verdict: 'VERSION_REGRESSION',
    referenceVersion: '1.0.0'
  },
  {
    why: 'packument 404 — nothing to compare against, never inferred as CLEAN',
    input: {declared: '1.0.0', registryVersions: [], payloadMatchesReference: false},
    verdict: 'NEVER_PUBLISHED',
    referenceVersion: null
  },
  {
    why: 'the reference payload could not be compared — INDETERMINATE, never a pass (A2b)',
    input: {declared: '1.0.0', registryVersions: ['1.0.0'], payloadMatchesReference: null},
    verdict: 'INDETERMINATE',
    referenceVersion: '1.0.0',
    advisories: ['reference-payload-unavailable']
  },
  {
    why: 'a covered drift whose projected version is a clean PENDING_PUBLISH becomes PENDING_CHANGESET',
    input: {declared: '1.0.0', registryVersions: ['1.0.0'], payloadMatchesReference: false, pendingRelease: {kind: 'measured', newVersion: '1.0.1'}},
    verdict: 'PENDING_CHANGESET',
    referenceVersion: '1.0.0',
    advisories: ['changeset-target:1.0.1']
  },
  {
    why: 'adequacy: a projected version that is already published stays DRIFT (never the C147 skip)',
    input: {
      declared: '1.0.0',
      registryVersions: ['1.0.0', '1.0.1'],
      payloadMatchesReference: false,
      pendingRelease: {kind: 'measured', newVersion: '1.0.1'}
    },
    verdict: 'DRIFT',
    referenceVersion: '1.0.0',
    advisories: ['behind-registry', 'changeset-inadequate:1.0.1->DRIFT']
  },
  {
    why: 'a not-measured probe grants no excuse — DRIFT stands (the LP/OMD property)',
    input: {
      declared: '1.0.0',
      registryVersions: ['1.0.0'],
      payloadMatchesReference: false,
      pendingRelease: {kind: 'not-measured', reason: 'no .changeset/config.json'}
    },
    verdict: 'DRIFT',
    referenceVersion: '1.0.0'
  },
  {
    why: 'an indeterminate probe softens a would-be DRIFT to INDETERMINATE, never a pass',
    input: {declared: '1.0.0', registryVersions: ['1.0.0'], payloadMatchesReference: false, pendingRelease: {kind: 'indeterminate', detail: 'boom'}},
    verdict: 'INDETERMINATE',
    referenceVersion: '1.0.0',
    advisories: ['changeset-probe-failed:boom']
  }
]

for (const testCase of verdictCases) {
  test(`decideVerdict: ${testCase.why}`, () => {
    const result = decideVerdict(testCase.input)
    assert.equal(result.verdict, testCase.verdict)
    assert.equal(result.referenceVersion, testCase.referenceVersion)
    assert.deepEqual(result.advisories, testCase.advisories ?? [])
  })
}

test('decideVerdict never reads the lane — the verdict cannot be rewritten by severity (M7)', () => {
  // Regression lock on the defect this replaced: the previous implementation
  // rewrote a pre-existing drift's verdict to CLEAN under --base, so a machine
  // consumer reading `verdict` saw CLEAN for a package that was drifting.
  const input = {declared: '1.0.0', registryVersions: ['1.0.0'], payloadMatchesReference: false}
  for (const lane of LANES) {
    assert.equal(decideVerdict({...input, lane}).verdict, 'DRIFT')
  }
})

test('exitClassFor: only the PENDING family and NEVER_PUBLISHED vary by lane', () => {
  const laneVarying = new Set(['PENDING_PUBLISH', 'PENDING_CHANGESET', 'NEVER_PUBLISHED'])
  const allVerdicts = [
    'CLEAN',
    'BUMP_NOT_NEEDED',
    'SKIPPED',
    'PENDING_PUBLISH',
    'PENDING_CHANGESET',
    'NEVER_PUBLISHED',
    'DRIFT',
    'SURFACE_BREAK',
    'VERSION_REGRESSION',
    'LEAKED_ARTIFACT',
    'INDETERMINATE',
    'BUILD_FAILED'
  ]
  for (const verdict of allVerdicts) {
    const classes = new Set(LANES.map((lane) => exitClassFor(verdict, lane)))
    assert.equal(classes.size, laneVarying.has(verdict) ? 2 : 1, `${verdict} varied across lanes unexpectedly`)
  }
})

test('exitClassFor: INDETERMINATE is exit 3 in EVERY lane — explicitly not a pass (A2b)', () => {
  for (const lane of LANES) {
    assert.equal(exitClassFor('INDETERMINATE', lane), 3)
    assert.equal(exitClassFor('BUILD_FAILED', lane), 4)
    assert.equal(exitClassFor('DRIFT', lane), 2)
    assert.equal(exitClassFor('LEAKED_ARTIFACT', lane), 2)
    assert.equal(exitClassFor('VERSION_REGRESSION', lane), 2)
  }
})

test('exitClassFor: post-publish escalates the "declared but never shipped" window (H2)', () => {
  assert.equal(exitClassFor('PENDING_PUBLISH', 'branch'), 0)
  assert.equal(exitClassFor('PENDING_PUBLISH', 'pre-push'), 0)
  assert.equal(exitClassFor('PENDING_PUBLISH', 'post-publish'), 2)
  assert.equal(exitClassFor('NEVER_PUBLISHED', 'branch'), 0)
  assert.equal(exitClassFor('NEVER_PUBLISHED', 'post-publish'), 2)
})

test('exitClassFor rejects an unknown verdict rather than defaulting to pass', () => {
  assert.throws(() => exitClassFor('PROBABLY_FINE', 'branch'), /unknown verdict/)
})

// ─────────────────────────────────────────────────────────────────────────────
// CLI argument parsing
// ─────────────────────────────────────────────────────────────────────────────

test('parseArgs accepts a bare -- (pnpm 11 forwards it from `pnpm run x -- --flag`)', () => {
  // Regression: the pre-push hook originally invoked the gate as
  // `pnpm check:package-drift -- --lane=pre-push`, and pnpm passed the `--`
  // through as a literal argument. The gate rejected it and the push failed
  // with "unknown argument --" — caught by the hook itself on its first run.
  assert.equal(parseArgs(['--', '--lane=pre-push']).lane, 'pre-push')
})

test('parseArgs rejects an unknown flag and an unknown lane rather than ignoring them', () => {
  assert.throws(() => parseArgs(['--lane=whenever']), /--lane must be one of/)
  assert.throws(() => parseArgs(['--yolo']), /unknown argument --yolo/)
})

test('parseArgs defaults to the branch lane with the cache and build enabled', () => {
  assert.deepEqual(parseArgs([]), {
    lane: 'branch',
    json: false,
    strictMaps: false,
    useCache: true,
    build: true,
    selfTest: false,
    mutation: null,
    repoRoot: null,
    registry: null,
    scope: null,
    help: false
  })
})

test('parseArgs accepts the overrides the end-to-end exit-code test needs', () => {
  const opts = parseArgs(['--repo-root=/tmp/fixture', '--registry=http://127.0.0.1:9/', '--scope=@toy'])
  assert.equal(opts.repoRoot, '/tmp/fixture')
  assert.equal(opts.registry, 'http://127.0.0.1:9/')
  assert.equal(opts.scope, '@toy')
})

// ─────────────────────────────────────────────────────────────────────────────
// semver
// ─────────────────────────────────────────────────────────────────────────────

test('compareSemver orders numerically, not lexicographically', () => {
  assert.equal(compareSemver('1.10.0', '1.9.0'), 1)
  assert.equal(compareSemver('1.0.0', '1.0.0'), 0)
  assert.equal(compareSemver('0.9.0', '1.0.0'), -1)
})

test('compareSemver ranks a prerelease below its release', () => {
  assert.equal(compareSemver('1.0.0-rc.1', '1.0.0'), -1)
  assert.equal(compareSemver('1.0.0-rc.2', '1.0.0-rc.10'), -1)
  assert.equal(compareSemver('1.0.0-alpha', '1.0.0-beta'), -1)
})

test('semverMax picks the newest published version', () => {
  assert.equal(semverMax(['1.0.0', '1.10.0', '1.9.0']), '1.10.0')
  assert.equal(semverMax(['2.0.0-rc.1', '1.9.9']), '2.0.0-rc.1')
})

// ─────────────────────────────────────────────────────────────────────────────
// Leak screen
// ─────────────────────────────────────────────────────────────────────────────

const outputs = {include: ['dist/**', 'swift/**'], exclude: []}

test('leakScreen accepts tracked files, declared build outputs and npm-injected root files', () => {
  const tracked = new Set(['src/index.ts', 'package.json'])
  const packed = [
    'src/index.ts', // tracked
    'dist/index.js', // declared turbo output
    'swift/Thing.swift', // declared turbo output
    'package.json', // injected
    'README.md', // injected
    'LICENSE', // injected — pnpm copies the workspace-root LICENSE in
    'CHANGELOG.md', // injected
    'NOTICE' // injected
  ]
  assert.deepEqual(leakScreen(packed, {tracked, outputs}), [])
})

test('leakScreen flags gitignored debris allowlisted by files[] — the real DS @web case', () => {
  const tracked = new Set(['src/index.ts'])
  const packed = ['src/index.ts', 'src/components/.omc/state/team-state.json']
  assert.deepEqual(leakScreen(packed, {tracked, outputs}), [
    'src/components/.omc/state/team-state.json'
  ])
})

test('leakScreen does not treat a NESTED README as npm-injected', () => {
  // npm injects README only at the package root. A nested one must be tracked.
  assert.deepEqual(leakScreen(['docs/README.md'], {tracked: new Set(), outputs}), ['docs/README.md'])
})

test('leakScreen honours a negated turbo output', () => {
  const negated = {include: ['dist/**'], exclude: ['dist/tmp/**']}
  assert.deepEqual(leakScreen(['dist/a.js', 'dist/tmp/scratch'], {tracked: new Set(), outputs: negated}), ['dist/tmp/scratch'])
})

test('isDeclaredOutput treats a bare directory entry as covering its subtree', () => {
  assert.equal(isDeclaredOutput('dist/a/b.js', {include: ['dist'], exclude: []}), true)
  assert.equal(isDeclaredOutput('distant/a.js', {include: ['dist'], exclude: []}), false)
})

test('globToRegExp escapes every regex metacharacter before applying glob syntax', () => {
  // The previous generation shipped three implementations that disagreed on `[`,
  // `]` and `:`. Escaping the full set removes the class, not one instance.
  for (const meta of ['[', ']', '{', '}', '(', ')', '+', '.', '^', '$', '|', ':']) {
    const pattern = `dist/a${meta}b`
    assert.equal(globToRegExp(pattern).test(pattern), true, `literal match for ${meta}`)
    assert.equal(globToRegExp(pattern).test('dist/axb'), false, `no wildcard leak for ${meta}`)
  }
  assert.equal(globToRegExp('dist/**').test('dist/a/b/c.js'), true)
  assert.equal(globToRegExp('dist/*.js').test('dist/a/b.js'), false)
})

test('assertBuildOutputs only asserts files[] entries that some task declares as output', () => {
  const tmp = tmpdir('drift-assert-')
  fs.mkdirSync(path.join(tmp, 'dist'))
  fs.writeFileSync(path.join(tmp, 'dprint.json'), '{}')
  // `dist` is declared and empty -> BUILD_FAILED material. `dprint.json` is a
  // literal tracked file with no build step at all -> must never be asserted.
  assert.deepEqual(assertBuildOutputs(tmp, ['dist', 'dprint.json'], outputs), ['dist (empty)'])
  fs.writeFileSync(path.join(tmp, 'dist', 'index.js'), 'x')
  assert.deepEqual(assertBuildOutputs(tmp, ['dist', 'dprint.json'], outputs), [])
  fs.rmSync(path.join(tmp, 'dist'), {recursive: true})
  assert.deepEqual(assertBuildOutputs(tmp, ['dist'], outputs), ['dist (absent)'])
  fs.rmSync(tmp, {recursive: true, force: true})
})

// ─────────────────────────────────────────────────────────────────────────────
// tar reader
// ─────────────────────────────────────────────────────────────────────────────

function tarEntry(name, body, typeflag = '0') {
  const header = Buffer.alloc(512)
  header.write(name, 0, 100, 'utf8')
  header.write('000644 \0', 100, 8, 'ascii')
  header.write('0000000 \0', 108, 8, 'ascii')
  header.write('0000000 \0', 116, 8, 'ascii')
  header.write(`${body.length.toString(8).padStart(11, '0')} `, 124, 12, 'ascii')
  header.write('00000000000 ', 136, 12, 'ascii')
  header.write(typeflag, 156, 1, 'ascii')
  header.write('ustar\0', 257, 6, 'ascii')
  header.write('00', 263, 2, 'ascii')
  const padded = Buffer.alloc(Math.ceil(body.length / 512) * 512)
  body.copy(padded)
  return Buffer.concat([header, padded])
}

const gzTar = (...entries) => zlib.gzipSync(Buffer.concat([...entries, Buffer.alloc(1024)]))

test('readTarball strips the package/ prefix and returns exact bytes', () => {
  const files = readTarball(gzTar(tarEntry('package/package.json', Buffer.from('{"name":"x"}')), tarEntry('package/dist/a.js', Buffer.from('a\n'))))
  assert.deepEqual([...files.keys()].sort(), ['dist/a.js', 'package.json'])
  assert.equal(files.get('dist/a.js').toString(), 'a\n')
})

test('readTarball skips directory entries and stops at the zero block', () => {
  const files = readTarball(gzTar(tarEntry('package/dist/', Buffer.alloc(0), '5'), tarEntry('package/dist/a.js', Buffer.from('a'))))
  assert.deepEqual([...files.keys()], ['dist/a.js'])
})

test('readTarball honours a GNU long-name entry', () => {
  const long = `package/dist/${'d'.repeat(120)}.js`
  const files = readTarball(gzTar(tarEntry('././@LongLink', Buffer.from(`${long}\0`), 'L'), tarEntry('package/truncated', Buffer.from('body'))))
  assert.deepEqual([...files.keys()], [long.slice('package/'.length)])
})

test('readTarball honours a pax path record', () => {
  const target = 'package/dist/pax-named.js'
  const body = ` path=${target}\n`
  const record = `${body.length + String(body.length + 2).length}${body}`
  const files = readTarball(gzTar(tarEntry('package/ignored', Buffer.from(record), 'x'), tarEntry('package/ignored', Buffer.from('b'))))
  assert.deepEqual([...files.keys()], ['dist/pax-named.js'])
})

test('readTarball refuses an entry outside package/ rather than silently dropping it', () => {
  assert.throws(() => readTarball(gzTar(tarEntry('elsewhere/a.js', Buffer.from('a')))), /outside package\//)
})

test('readTarball refuses an unsupported entry type (e.g. a symlink) rather than ignoring it', () => {
  assert.throws(() => readTarball(gzTar(tarEntry('package/link', Buffer.alloc(0), '2'))), /unsupported tar entry type/)
})

// ─────────────────────────────────────────────────────────────────────────────
// Auth resolution — there is no anonymous fallback, so this decides pass vs exit 3
// ─────────────────────────────────────────────────────────────────────────────

test('resolveToken prefers DRIFT_REGISTRY_TOKEN, then NODE_AUTH_TOKEN, then GITHUB_TOKEN', () => {
  const home = tmpdir('drift-home-')
  const opts = {home, allowGhCli: false}
  assert.equal(resolveToken({...opts, env: {DRIFT_REGISTRY_TOKEN: 'a', NODE_AUTH_TOKEN: 'b', GITHUB_TOKEN: 'c'}}).token, 'a')
  assert.equal(resolveToken({...opts, env: {NODE_AUTH_TOKEN: 'b', GITHUB_TOKEN: 'c'}}).token, 'b')
  assert.equal(resolveToken({...opts, env: {GITHUB_TOKEN: 'c'}}).token, 'c')
  fs.rmSync(home, {recursive: true, force: true})
})

test('resolveToken reads ~/.npmrc directly and expands ${VAR} the way npm does', () => {
  // pnpm does NOT expand ${VAR} in .npmrc while npm does, so the two tools
  // disagree about whether this host has a token. Expanding here makes the gate
  // agree with npm, and an UNEXPANDABLE placeholder counts as "no token" rather
  // than being sent to the registry literally.
  const home = tmpdir('drift-home-')
  fs.writeFileSync(path.join(home, '.npmrc'), '//npm.pkg.github.com/:_authToken=literal-token\n')
  assert.equal(resolveToken({home, env: {}, allowGhCli: false}).token, 'literal-token')

  fs.writeFileSync(path.join(home, '.npmrc'), '//npm.pkg.github.com/:_authToken=${MY_TOKEN}\n')
  assert.equal(resolveToken({home, env: {MY_TOKEN: 'expanded'}, allowGhCli: false}).token, 'expanded')
  assert.equal(resolveToken({home, env: {}, allowGhCli: false}).token, null)
  fs.rmSync(home, {recursive: true, force: true})
})

test('resolveToken names every source it tried, so the failure is self-service', () => {
  const home = tmpdir('drift-home-')
  const result = resolveToken({home, env: {}, allowGhCli: false})
  assert.equal(result.token, null)
  assert.deepEqual(result.tried.slice(0, 3), [
    'env:DRIFT_REGISTRY_TOKEN',
    'env:NODE_AUTH_TOKEN',
    'env:GITHUB_TOKEN'
  ])
  assert.match(result.tried.at(-1), /\.npmrc \/\/npm\.pkg\.github\.com\/:_authToken$/)
  fs.rmSync(home, {recursive: true, force: true})
})

test('resolveToken keys the .npmrc lookup off the registry host, not a hardcoded one', () => {
  const home = tmpdir('drift-home-')
  fs.writeFileSync(path.join(home, '.npmrc'), '//other.example.com/:_authToken=nope\n')
  assert.equal(resolveToken({home, env: {}, allowGhCli: false}).token, null)
  assert.equal(resolveToken({home, env: {}, allowGhCli: false, registry: 'https://other.example.com'}).token, 'nope')
  fs.rmSync(home, {recursive: true, force: true})
})

// ─────────────────────────────────────────────────────────────────────────────
// Registry transport — retries, driven against a REAL loopback HTTP server
//
// The one observation-layer slice this file covers, and it is covered here rather
// than in --self-test because the property under test is about ATTEMPT COUNTS, which
// only a server that counts requests can see.
//
// WHY THE RETRIES EXIST — MEASURED 2026-08-04. GitHub Packages answers HTTP 403 when
// it THROTTLES, the same status it uses for a genuinely bad token. One such 403 in
// the twin mantle engine took a package to INDETERMINATE, the run to exit 3
// (correctly — "could not tell" is never a pass), CI to red, and, because publishing
// is gated on CI, stopped the release train for two merges. This repo's PR #158
// drift job failed the same way.
//
// BOTH HALVES OF THE FIX ARE PINNED BELOW. Retrying has to absorb the flake, and it
// must never buy that by turning a real failure into a pass.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A toy registry that counts requests and answers whatever `respond(attempt)` says.
 * Returns the base URL, the live attempt count, and a close() for the caller's finally.
 */
async function startCountingRegistry(respond) {
  let attempts = 0
  const server = http.createServer((_request, response) => {
    attempts += 1
    const reply = respond(attempts)
    response.writeHead(reply.status, {'content-type': 'application/json', ...reply.headers})
    response.end(reply.body ?? '{}')
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return {url: `http://127.0.0.1:${server.address().port}`, attempts: () => attempts, close: () => new Promise((resolve) => server.close(resolve))}
}

const TOY_PACKUMENT = JSON.stringify({versions: {'1.0.0': {dist: {tarball: 'http://127.0.0.1:1/x.tgz', integrity: 'sha512-abc'}}}})

test('the transport recovers when a throttled request succeeds on a later attempt', async () => {
  const registry = await startCountingRegistry((attempt) => (attempt < 3 ? {status: 403} : {status: 200, body: TOY_PACKUMENT}))
  try {
    const result = await fetchPackument(registry.url, '@toy/widget', 'test-token')
    assert.equal(result.kind, 'ok')
    assert.equal(registry.attempts(), 3)
  } finally {
    await registry.close()
  }
})

test('the transport honours Retry-After without letting it stall the run', async () => {
  const registry = await startCountingRegistry((attempt) =>
    attempt === 1 ? {status: 429, headers: {'retry-after': '0.05'}} : {status: 200, body: TOY_PACKUMENT}
  )
  try {
    const result = await fetchPackument(registry.url, '@toy/widget', 'test-token')
    assert.equal(result.kind, 'ok')
    assert.equal(registry.attempts(), 2)
  } finally {
    await registry.close()
  }
})

test('retries NEVER manufacture a pass: every attempt rejected still reports auth, never ok', async () => {
  // THE GUARANTEE THAT MATTERS, and the reason retrying is safe to add to an A2b gate
  // at all. A genuinely bad token costs the four attempts and then reports exactly
  // what it reported before the retries existed — which runGate turns into
  // INDETERMINATE / exit 3, never CLEAN. If this assertion is ever "fixed" by making
  // an exhausted retry return ok, the gate has been defeated.
  const registry = await startCountingRegistry(() => ({status: 403}))
  try {
    const result = await fetchPackument(registry.url, '@toy/widget', 'test-token')
    assert.equal(result.kind, 'auth')
    assert.notEqual(result.kind, 'ok')
    assert.equal(registry.attempts(), 4)
  } finally {
    await registry.close()
  }
})

test('retries NEVER manufacture a pass: a persistent 500 stays unreachable, never ok', async () => {
  // The same guarantee on the other retryable family. `unreachable` is INDETERMINATE
  // too, so a registry that is answering but broken cannot be read as "nothing
  // published, so fine" — that is the shape the `swallow` self-test mutant exists for.
  const registry = await startCountingRegistry(() => ({status: 503}))
  try {
    const result = await fetchPackument(registry.url, '@toy/widget', 'test-token')
    assert.equal(result.kind, 'unreachable')
    assert.equal(registry.attempts(), 4)
  } finally {
    await registry.close()
  }
})

test('a 404 is NOT retried — an absent package is an answer, not a flake', async () => {
  const registry = await startCountingRegistry(() => ({status: 404}))
  try {
    const result = await fetchPackument(registry.url, '@toy/widget', 'test-token')
    assert.equal(result.kind, 'absent')
    assert.equal(registry.attempts(), 1)
  } finally {
    await registry.close()
  }
})

test('a 200 is NOT retried — the happy path costs exactly one request', async () => {
  const registry = await startCountingRegistry(() => ({status: 200, body: TOY_PACKUMENT}))
  try {
    const result = await fetchPackument(registry.url, '@toy/widget', 'test-token')
    assert.equal(result.kind, 'ok')
    assert.equal(registry.attempts(), 1)
  } finally {
    await registry.close()
  }
})

test('retryAfterMs ignores an absent, unparseable or absurd Retry-After', () => {
  // Falling back to the fixed backoff is the safe direction: the request is still
  // retried. Honouring a multi-hour Retry-After would hang the gate instead, and a
  // gate that hangs is a gate nobody runs.
  const headers = (value) => ({headers: new Headers(value === null ? {} : {'retry-after': value})})
  assert.equal(retryAfterMs(headers(null)), null)
  assert.equal(retryAfterMs(headers('later please')), null)
  assert.equal(retryAfterMs(headers('3600')), null)
  assert.equal(retryAfterMs(headers('-5')), null)
  assert.equal(retryAfterMs(headers('2')), 2000)
  const inTwentySeconds = new Date(Date.now() + 20_000).toUTCString()
  assert.ok(Math.abs(retryAfterMs(headers(inTwentySeconds)) - 20_000) < 1500)
})
