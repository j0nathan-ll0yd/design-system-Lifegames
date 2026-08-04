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
 * the SHIPPED pipeline end to end against them, and then re-runs it under thirteen
 * deliberate SOURCE-TEXT mutations of the real evaluator — failing if any survives.
 *
 * THIS FILE RUNS IN CI (finding D4). It carries the 34 shared conformance vectors AND
 * the fixture-checksum assertion that makes vendoring them safe, and until now it was
 * reachable only through `pnpm test:scripts` — present in .husky/pre-push and in no
 * workflow — so this repo could diverge from the estate's canonical digest rule with
 * every CI check green. It is now a step in the `package-version-drift` job.
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
import {
  assertBuildOutputs,
  canonicalize,
  compareSemver,
  decideVerdict,
  differingFiles,
  DRIFT_CONFORMANCE_SHA256,
  exitClassFor,
  fetchPackument,
  globToRegExp,
  isDeadSourceMap,
  isDeclaredOutput,
  LANES,
  leakScreen,
  normalizeEntry,
  parseArgs,
  payloadDigests,
  PUBLISH_ONLY_SCRIPTS,
  readTarball,
  resolveToken,
  retryAfterMs,
  semverMax,
  SPEC_VERSION
} from './check-package-drift.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const conformanceBytes = fs.readFileSync(path.join(here, 'fixtures/drift-conformance.json'))
const conformance = JSON.parse(conformanceBytes.toString('utf8'))
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
    input: {declared: '1.0.0', registryVersions: ['1.0.0'], headDigest: 'a', referenceDigest: 'a'},
    verdict: 'CLEAN',
    referenceVersion: '1.0.0'
  },
  {
    why: 'declared version is published and the payloads differ — always blocking',
    input: {declared: '1.0.0', registryVersions: ['1.0.0'], headDigest: 'a', referenceDigest: 'b'},
    verdict: 'DRIFT',
    referenceVersion: '1.0.0'
  },
  {
    why: 'a published-but-not-newest declared version carries an advisory, not a different verdict',
    input: {declared: '1.0.0', registryVersions: ['1.0.0', '1.1.0'], headDigest: 'a', referenceDigest: 'a'},
    verdict: 'CLEAN',
    referenceVersion: '1.0.0',
    advisories: ['behind-registry']
  },
  {
    why: 'bumped ahead of the registry with a real payload change (finding H2)',
    input: {declared: '1.2.0', registryVersions: ['1.0.0', '1.1.0'], headDigest: 'a', referenceDigest: 'b'},
    verdict: 'PENDING_PUBLISH',
    referenceVersion: '1.1.0'
  },
  {
    why: 'bumped ahead of the registry but the payload is identical — revert the bump',
    input: {declared: '1.2.0', registryVersions: ['1.0.0', '1.1.0'], headDigest: 'a', referenceDigest: 'a'},
    verdict: 'BUMP_NOT_NEEDED',
    referenceVersion: '1.1.0'
  },
  {
    why: 'the manifest declares a version below what is already published',
    input: {declared: '0.9.0', registryVersions: ['1.0.0'], headDigest: 'a', referenceDigest: 'a'},
    verdict: 'VERSION_REGRESSION',
    referenceVersion: '1.0.0'
  },
  {
    why: 'packument 404 — nothing to compare against, never inferred as CLEAN',
    input: {declared: '1.0.0', registryVersions: [], headDigest: 'a', referenceDigest: null},
    verdict: 'NEVER_PUBLISHED',
    referenceVersion: null
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
  const input = {declared: '1.0.0', registryVersions: ['1.0.0'], headDigest: 'a', referenceDigest: 'b'}
  for (const lane of LANES) {
    assert.equal(decideVerdict({...input, lane}).verdict, 'DRIFT')
  }
})

test('exitClassFor: only PENDING_PUBLISH and NEVER_PUBLISHED vary by lane', () => {
  const laneVarying = new Set(['PENDING_PUBLISH', 'NEVER_PUBLISHED'])
  const allVerdicts = [
    'CLEAN',
    'BUMP_NOT_NEEDED',
    'SKIPPED',
    'PENDING_PUBLISH',
    'NEVER_PUBLISHED',
    'DRIFT',
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
