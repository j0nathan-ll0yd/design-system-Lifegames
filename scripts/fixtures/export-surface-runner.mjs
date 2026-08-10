/**
 * The SHARED conformance runner for the export-surface rule. Vendored verbatim alongside the
 * fixture into every repo that implements the rule, so all three implementations assert the SAME
 * things in the SAME order against the SAME vectors. Only a small adapter differs per repo.
 *
 * Usage from a repo's test file:
 *
 *   import {assertFixtureIntegrity, runSurfaceConformance} from './fixtures/export-surface-runner.mjs'
 *   import fixture from './fixtures/export-surface-conformance.json' with {type: 'json'}
 *
 *   const failures = runSurfaceConformance({
 *     fixture,
 *     specVersion: SURFACE_SPEC_VERSION,
 *     readExportSurface,   // (manifestText: string|null) => {kind, subpaths, detail}
 *     surfaceDelta,        // (reference, candidate) => {required, removed, added}
 *     bumpBetween,         // (from, to) => 'none'|'patch'|'minor'|'major'|null
 *     evaluateSurface      // ({declared, referenceVersion, reference, candidate}) => outcome
 *   })
 *   assert.deepEqual(failures, [])
 *
 * Returns an array of human-readable failure strings; empty means conforming.
 */

import {createHash} from 'node:crypto'

const eq = (left, right) => JSON.stringify(left) === JSON.stringify(right)

/**
 * @param {object} options
 * @param {object} options.fixture parsed export-surface-conformance.json
 * @param {number} options.specVersion the implementation's SURFACE_SPEC_VERSION constant
 * @returns {string[]} failures
 */
export function runSurfaceConformance({fixture, specVersion, readExportSurface, surfaceDelta, bumpBetween, evaluateSurface}) {
  const failures = []
  const fail = (id, detail) => failures.push(`${id}: ${detail}`)

  // Case zero, and the whole point of the number: the rule this binary implements must be the rule
  // the fixture describes. Without it a rule change could ship without a bump and pass everywhere.
  if (specVersion !== fixture.specVersion) {
    fail('SURFACE_SPEC_VERSION', `implementation is ${specVersion}, fixture is ${fixture.specVersion}`)
    return failures
  }

  for (const testCase of fixture.cases) {
    const {id, kind} = testCase
    try {
      if (kind === 'surface') {
        const got = readExportSurface(testCase.input)
        if (got.kind !== testCase.expect.kind) {
          fail(id, `kind want ${testCase.expect.kind} got ${got.kind} — ${testCase.why}`)
        }
        if (!eq([...got.subpaths], testCase.expect.subpaths)) {
          fail(id, `subpaths want ${JSON.stringify(testCase.expect.subpaths)} got ${JSON.stringify([...got.subpaths])}`)
        }
        // `detail` is prose and deliberately NOT pinned — only its presence is, because an
        // unreadable surface with no reason is unactionable.
        if (testCase.expect.kind === 'unreadable' && !got.detail) {
          fail(id, 'an unreadable surface must carry a reason')
        }
        continue
      }

      if (kind === 'delta') {
        const got = surfaceDelta(readExportSurface(testCase.reference), readExportSurface(testCase.candidate))
        for (const key of ['required', 'removed', 'added']) {
          const want = testCase.expect[key]
          const actual = Array.isArray(want) ? [...(got[key] ?? [])] : got[key]
          if (!eq(actual, want)) {
            fail(id, `${key} want ${JSON.stringify(want)} got ${JSON.stringify(actual)} — ${testCase.why}`)
          }
        }
        continue
      }

      if (kind === 'bump') {
        const got = bumpBetween(testCase.from, testCase.to)
        if (got !== testCase.expect.level) {
          fail(id, `${testCase.from} -> ${testCase.to} want ${testCase.expect.level} got ${got} — ${testCase.why}`)
        }
        continue
      }

      if (kind === 'outcome') {
        const got = evaluateSurface({
          declared: testCase.declared,
          referenceVersion: testCase.referenceVersion,
          reference: readExportSurface(testCase.reference),
          candidate: readExportSurface(testCase.candidate),
          // Present only on the changeset-aware (spec version 2) cases; absent means not-measured,
          // which the reference must treat exactly as spec version 1 did.
          pendingRelease: testCase.pendingRelease
        })
        if (got.kind !== testCase.expect.kind) {
          fail(id, `outcome want ${testCase.expect.kind} got ${got.kind} — ${testCase.why}`)
          continue
        }
        const required = got.kind === 'break' ? got.required : null
        if (required !== testCase.expect.required) {
          fail(id, `required want ${testCase.expect.required} got ${required}`)
        }
        const declaredBump = got.kind === 'indeterminate' ? null : got.declaredBump
        if (declaredBump !== testCase.expect.declaredBump) {
          fail(id, `declaredBump want ${testCase.expect.declaredBump} got ${declaredBump}`)
        }
        // sizingBump is the bump actually compared against the requirement (the credited projection
        // or the declared bump); creditedVersion is the projected version credited, or null. These
        // pin the changeset-awareness: which version the rule sized against, and whether it granted
        // credit. `?? null` is deliberate — a spec-version-1 runner reading a v2 fixture would fail
        // the case-zero SURFACE_SPEC_VERSION assertion first, never reach here.
        const sizingBump = got.kind === 'indeterminate' ? null : (got.sizingBump ?? null)
        if (sizingBump !== testCase.expect.sizingBump) {
          fail(id, `sizingBump want ${testCase.expect.sizingBump} got ${sizingBump} — ${testCase.why}`)
        }
        const creditedVersion = got.kind === 'indeterminate' ? null : (got.creditedVersion ?? null)
        if (creditedVersion !== testCase.expect.creditedVersion) {
          fail(id, `creditedVersion want ${JSON.stringify(testCase.expect.creditedVersion)} got ${JSON.stringify(creditedVersion)} — ${testCase.why}`)
        }
        if (got.kind !== 'indeterminate') {
          for (const key of ['removed', 'added']) {
            if (!eq([...(got.delta[key] ?? [])], testCase.expect[key])) {
              fail(id, `${key} want ${JSON.stringify(testCase.expect[key])} got ${JSON.stringify([...(got.delta[key] ?? [])])}`)
            }
          }
        }
        continue
      }

      fail(id, `unknown case kind ${kind} — the vendored runner is older than the fixture`)
    } catch (error) {
      // A throw is a conformance failure, not a test crash. The unreadable-input cases exist
      // precisely because an implementation that throws on a malformed manifest takes the whole
      // gate down instead of reporting INDETERMINATE for one package.
      fail(id, `THREW ${error?.constructor?.name ?? 'Error'}: ${error?.message}`)
    }
  }

  return failures
}

/**
 * Integrity of the vendored copy against the checksum the implementation pins.
 * Call this from the same test, BEFORE runSurfaceConformance.
 *
 * @param {Buffer|string} fixtureBytes raw bytes of the vendored export-surface-conformance.json
 * @param {string} expectedSha256 the constant pinned in the implementation's source
 * @returns {string[]} failures
 */
export function assertFixtureIntegrity(fixtureBytes, expectedSha256) {
  const got = createHash('sha256').update(Buffer.isBuffer(fixtureBytes) ? fixtureBytes : Buffer.from(fixtureBytes, 'utf8')).digest('hex')
  if (got !== expectedSha256) {
    return [
      `vendored export-surface-conformance.json sha256 ${got} != pinned ${expectedSha256}. ` +
      'Re-vendor from atlas/contracts/export-surface/ and update the pinned constant together.'
    ]
  }
  return []
}
