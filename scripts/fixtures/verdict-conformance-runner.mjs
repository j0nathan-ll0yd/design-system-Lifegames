/**
 * The SHARED conformance runner for the drift-verdict ladder. Vendored verbatim alongside the
 * fixture into every repo that implements the ladder, so all three implementations assert the SAME
 * things in the SAME order against the SAME vectors. Only the small adapter differs per repo.
 *
 * Usage from a repo's test file:
 *
 *   import {assertFixtureIntegrity, runLadderConformance} from './fixtures/verdict-conformance-runner.mjs'
 *   import fixture from './fixtures/verdict-conformance.json' with {type: 'json'}
 *   import {LADDER_SPEC_VERSION, resolveVerdict, exitClassOf, compareSemver} from '../src/.../verdict.js'
 *
 *   const failures = runLadderConformance({
 *     fixture,
 *     specVersion: LADDER_SPEC_VERSION,
 *     resolveVerdict,   // (input) => {verdict, referenceVersion, advisories}
 *     exitClassOf,      // (verdict, lane) => number, or throws
 *     compareSemver     // (a, b) => number
 *   })
 *   assert.deepEqual(failures, [])
 *
 * This file is a pure library — it declares no entry point of its own, exactly like the sibling
 * `contracts/package-digest/runner.mjs` and `contracts/export-surface/runner.mjs`, so it can be
 * vendored verbatim into a repo that has no `reference.mjs` next to it. Drive it from a test file,
 * or from `build-fixture.mjs --check` (which recomputes every expectation from the reference).
 *
 * Returns an array of human-readable failure strings; empty means conforming.
 */

import {createHash} from 'node:crypto'

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const eq = (left, right) => JSON.stringify(left) === JSON.stringify(right)
const sign = (value) => (value < 0 ? -1 : value > 0 ? 1 : 0)

/**
 * @param {object} options
 * @param {object} options.fixture parsed verdict-conformance.json
 * @param {number} options.specVersion the implementation's LADDER_SPEC_VERSION constant
 * @param {(input: object) => {verdict: string, referenceVersion: string|null, advisories: string[]}} options.resolveVerdict
 * @param {(verdict: string, lane: string) => number} options.exitClassOf
 * @param {(a: string, b: string) => number} options.compareSemver
 * @returns {string[]} failures
 */
export function runLadderConformance({fixture, specVersion, resolveVerdict, exitClassOf, compareSemver}) {
  const failures = []
  const fail = (id, detail) => failures.push(`${id}: ${detail}`)

  // Case zero, and the whole point of the number: the ladder this binary implements must be the
  // ladder the fixture describes. Without it a verdict-set or exit-mapping change could ship without
  // a bump and pass everywhere. Short-circuit so a mismatch is one loud failure, not 100 confusing ones.
  if (specVersion !== fixture.specVersion) {
    fail('LADDER_SPEC_VERSION', `implementation is ${specVersion}, fixture is ${fixture.specVersion}`)
    return failures
  }

  for (const testCase of fixture.cases) {
    const {id, kind} = testCase
    try {
      if (kind === 'exit') {
        if (testCase.expect.throws) {
          // An unclassified verdict or unknown lane MUST throw — the silent-pass hole this contract
          // pins. Swallow the throw here so the outer catch does not read it as a crash.
          let threw = false
          try {
            exitClassOf(testCase.verdict, testCase.lane)
          } catch {
            threw = true
          }
          if (!threw) {
            fail(id, `expected exitClassOf(${JSON.stringify(testCase.verdict)}, ${JSON.stringify(testCase.lane)}) to THROW — ${testCase.why}`)
          }
          continue
        }
        const got = exitClassOf(testCase.verdict, testCase.lane)
        if (got !== testCase.expect.exitClass) {
          fail(id, `exitClassOf(${JSON.stringify(testCase.verdict)}, ${JSON.stringify(testCase.lane)}) want ${testCase.expect.exitClass} got ${got}`)
        }
        continue
      }

      if (kind === 'semver') {
        const got = sign(compareSemver(testCase.a, testCase.b))
        if (got !== testCase.expect.sign) {
          fail(id, `compareSemver(${JSON.stringify(testCase.a)}, ${JSON.stringify(testCase.b)}) want ${testCase.expect.sign} got ${got} — ${testCase.why}`)
        }
        continue
      }

      if (kind === 'resolve') {
        const got = resolveVerdict(testCase.input)
        if (got.verdict !== testCase.expect.verdict) {
          fail(id, `verdict want ${testCase.expect.verdict} got ${got.verdict} — ${testCase.why}`)
        }
        if ((got.referenceVersion ?? null) !== (testCase.expect.referenceVersion ?? null)) {
          fail(id, `referenceVersion want ${JSON.stringify(testCase.expect.referenceVersion)} got ${JSON.stringify(got.referenceVersion)}`)
        }
        // Advisories are semantic tags (behind-registry, changeset-target:…, changeset-inadequate:…);
        // both the SET and the ORDER are part of the contract.
        if (!eq([...(got.advisories ?? [])], testCase.expect.advisories)) {
          fail(id, `advisories want ${JSON.stringify(testCase.expect.advisories)} got ${JSON.stringify([...(got.advisories ?? [])])}`)
        }
        continue
      }

      fail(id, `unknown case kind ${kind} — the vendored runner is older than the fixture`)
    } catch (error) {
      // A throw is a conformance failure, not a test crash: resolveVerdict and exitClassOf are total,
      // and the excuse recursion must terminate. An implementation that throws where the reference
      // returns has diverged.
      fail(id, `THREW ${error?.constructor?.name ?? 'Error'}: ${error?.message}`)
    }
  }

  return failures
}

/**
 * Integrity of the vendored copy against the checksum the implementation pins.
 * Call this from the same test, BEFORE runLadderConformance.
 *
 * @param {Buffer|string} fixtureBytes the raw bytes of the vendored verdict-conformance.json
 * @param {string} expectedSha256 the constant pinned in the implementation's source
 * @returns {string[]} failures
 */
export function assertFixtureIntegrity(fixtureBytes, expectedSha256) {
  const got = sha256(Buffer.isBuffer(fixtureBytes) ? fixtureBytes : Buffer.from(fixtureBytes, 'utf8'))
  if (got !== expectedSha256) {
    return [
      `vendored verdict-conformance.json sha256 ${got} != pinned ${expectedSha256}. ` +
      'Re-vendor from atlas/contracts/verdict-ladder/ and update the pinned constant together.'
    ]
  }
  return []
}
