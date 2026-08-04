/**
 * The SHARED conformance runner. Vendored verbatim alongside the fixture into every repo that
 * implements the digest, so all three implementations assert the SAME things in the SAME order
 * against the SAME vectors. Only the small adapter differs per repo.
 *
 * Usage from a repo's test file:
 *
 *   import {runConformance} from './fixtures/drift-conformance-runner.mjs'
 *   import fixture from './fixtures/drift-conformance.json' with {type: 'json'}
 *   import {SPEC_VERSION, normalizeEntry, payloadDigests} from '../src/.../digest.js'
 *
 *   const failures = runConformance({
 *     fixture,
 *     specVersion: SPEC_VERSION,
 *     normalizeEntry: (path, bytes) => normalizeEntry(path, bytes),
 *     payloadDigests: (files, exclude) => {
 *       const r = payloadDigests(files, exclude)          // adapt names to the local engine
 *       return {strictDigest: r.strict, effectiveDigest: r.effective, deadMaps: r.unresolvableMaps}
 *     },
 *   })
 *   assert.deepEqual(failures, [])
 *
 * Returns an array of human-readable failure strings; empty means conforming.
 */

import {createHash} from 'node:crypto'

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

const toFiles = (spec) => new Map(Object.entries(spec).map(([path, text]) => [path, Buffer.from(text, 'utf8')]))

/**
 * @param {object} options
 * @param {object} options.fixture parsed drift-conformance.json
 * @param {number} options.specVersion the implementation's SPEC_VERSION constant
 * @param {(path: string, bytes: Buffer) => Buffer} options.normalizeEntry
 * @param {(files: Map<string, Buffer>, exclude: Set<string>) =>
 *   {strictDigest: string, effectiveDigest: string, deadMaps: string[]}} options.payloadDigests
 * @returns {string[]} failures
 */
export function runConformance({fixture, specVersion, normalizeEntry, payloadDigests}) {
  const failures = []
  const fail = (id, detail) => failures.push(`${id}: ${detail}`)

  // Case zero, and the whole point of the number: the scheme this binary implements must be the
  // scheme the fixture describes. This is what makes specVersion mean something (finding X7).
  if (specVersion !== fixture.specVersion) {
    fail('SPEC_VERSION', `implementation is ${specVersion}, fixture is ${fixture.specVersion}`)
    return failures
  }

  for (const testCase of fixture.cases) {
    const {id, kind} = testCase
    try {
      if (kind === 'manifest' || kind === 'entry') {
        const path = testCase.path ?? fixture.digest.manifestEntry
        const normalized = normalizeEntry(path, Buffer.from(testCase.input, 'utf8'))
        if (!Buffer.isBuffer(normalized)) {
          fail(id, 'normalizeEntry did not return a Buffer')
          continue
        }
        if (normalized.toString('utf8') !== testCase.expect.normalized) {
          fail(id, `normalized bytes\n  want ${JSON.stringify(testCase.expect.normalized)}\n  got  ${JSON.stringify(normalized.toString('utf8'))}`)
        }
        const got = sha256(normalized)
        if (got !== testCase.expect.sha256) {
          fail(id, `sha256 want ${testCase.expect.sha256} got ${got}`)
        }
        continue
      }

      if (kind === 'payload') {
        const got = payloadDigests(toFiles(testCase.files), new Set(testCase.exclude ?? []))
        for (const key of ['strictDigest', 'effectiveDigest']) {
          if (got[key] !== testCase.expect[key]) {
            fail(id, `${key} want ${testCase.expect[key]} got ${got[key]}`)
          }
        }
        const deadGot = JSON.stringify([...(got.deadMaps ?? [])].sort())
        const deadWant = JSON.stringify(testCase.expect.deadMaps)
        if (deadGot !== deadWant) {
          fail(id, `deadMaps want ${deadWant} got ${deadGot}`)
        }
        continue
      }

      if (kind === 'comparison') {
        const registry = payloadDigests(toFiles(testCase.registry), new Set())
        const head = payloadDigests(toFiles(testCase.head), new Set())
        const verdict = registry.effectiveDigest === head.effectiveDigest ? 'CLEAN' : 'DRIFT'
        if (verdict !== testCase.expect.verdict) {
          fail(id, `verdict want ${testCase.expect.verdict} got ${verdict} — ${testCase.why}`)
        }
        if (registry.effectiveDigest !== testCase.expect.registryEffectiveDigest) {
          fail(id, `registry effectiveDigest want ${testCase.expect.registryEffectiveDigest} got ${registry.effectiveDigest}`)
        }
        if (head.effectiveDigest !== testCase.expect.headEffectiveDigest) {
          fail(id, `head effectiveDigest want ${testCase.expect.headEffectiveDigest} got ${head.effectiveDigest}`)
        }
        continue
      }

      fail(id, `unknown case kind ${kind} — the vendored runner is older than the fixture`)
    } catch (error) {
      // A throw is a conformance failure, not a test crash: the manifest cases exist precisely
      // because one implementation threw where the others fell back to raw bytes.
      fail(id, `THREW ${error?.constructor?.name ?? 'Error'}: ${error?.message}`)
    }
  }

  return failures
}

/**
 * Integrity of the vendored copy against the checksum the implementation pins.
 * Call this from the same test, BEFORE runConformance.
 *
 * @param {Buffer|string} fixtureBytes the raw bytes of the vendored drift-conformance.json
 * @param {string} expectedSha256 the constant pinned in the implementation's source
 * @returns {string[]} failures
 */
export function assertFixtureIntegrity(fixtureBytes, expectedSha256) {
  const got = sha256(Buffer.isBuffer(fixtureBytes) ? fixtureBytes : Buffer.from(fixtureBytes, 'utf8'))
  if (got !== expectedSha256) {
    return [
      `vendored drift-conformance.json sha256 ${got} != pinned ${expectedSha256}. ` +
      'Re-vendor from atlas/contracts/package-digest/ and update the pinned constant together.'
    ]
  }
  return []
}
