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
 *     readExportTargets,   // (manifestText: string|null) => {kind, targets, detail}   [spec version 3]
 *     surfaceDelta,        // (reference, candidate) => {required, removed, added, removedNames, addedNames}
 *     bumpBetween,         // (from, to) => 'none'|'patch'|'minor'|'major'|null
 *     evaluateSurface      // ({declared, referenceVersion, reference, candidate}) => outcome
 *   })
 *   assert.deepEqual(failures, [])
 *
 * TWO FIXTURES, TWO RUNNERS (decision 0028). `runSurfaceConformance` asserts the RULE against
 * `export-surface-conformance.json` (keyed by `SURFACE_SPEC_VERSION`); `runExtractConformance`
 * asserts the EXTRACTOR against `export-extract-conformance.json` (keyed by
 * `EXTRACT_SPEC_VERSION`, plus the exact `typescript` version). An implementation must run BOTH.
 * They are separate files so an extractor-only bump does not move the rule fixture's sha256 and
 * force a re-vendor of a rule that did not change.
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
export function runSurfaceConformance({fixture, specVersion, readExportSurface, readExportTargets, surfaceDelta, bumpBetween, evaluateSurface}) {
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

      if (kind === 'targets') {
        // Spec version 3. The extractor needs each subpath's RAW target value, and this reader is
        // what hands them over — held to the SAME subpath keys `readExportSurface` reports, so the
        // two sugar readers can never disagree about what a subpath is.
        const got = readExportTargets(testCase.input)
        if (got.kind !== testCase.expect.kind) {
          fail(id, `kind want ${testCase.expect.kind} got ${got.kind} — ${testCase.why}`)
        }
        if (!eq(got.targets, testCase.expect.targets)) {
          fail(id, `targets want ${JSON.stringify(testCase.expect.targets)} got ${JSON.stringify(got.targets)} — ${testCase.why}`)
        }
        if (!eq(Object.keys(got.targets).sort(), [...testCase.expect.subpaths].sort())) {
          fail(id,
            `SUGAR DISAGREEMENT: readExportTargets keys ${JSON.stringify(Object.keys(got.targets).sort())} != readExportSurface subpaths ${
              JSON.stringify(testCase.expect.subpaths)
            }`)
        }
        continue
      }

      if (kind === 'delta' || kind === 'named-delta') {
        // `delta` drives the rule from two MANIFEST TEXTS (Level 1); `named-delta` drives it from
        // two whole SURFACE OBJECTS, because a Level-2 surface is not derivable from a manifest —
        // its names come from the extractor over the packed file tree.
        const got = kind === 'delta'
          ? surfaceDelta(readExportSurface(testCase.reference), readExportSurface(testCase.candidate))
          : surfaceDelta(testCase.reference, testCase.candidate)
        for (const key of ['required', 'removed', 'added', 'removedNames', 'addedNames']) {
          if (!(key in testCase.expect)) {
            continue // a spec-version-2 fixture read by a spec-version-3 runner: case zero fires first
          }
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

      if (kind === 'outcome' || kind === 'named-outcome') {
        const got = evaluateSurface({
          declared: testCase.declared,
          referenceVersion: testCase.referenceVersion,
          reference: kind === 'outcome' ? readExportSurface(testCase.reference) : testCase.reference,
          candidate: kind === 'outcome' ? readExportSurface(testCase.candidate) : testCase.candidate,
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
          for (const key of ['removed', 'added', 'removedNames', 'addedNames']) {
            if (!(key in testCase.expect)) {
              continue
            }
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
 * The EXTRACTOR conformance run (spec: `export-extract-conformance.json`, decision 0028).
 *
 * Separate from the rule run because the two are versioned separately and change at different
 * rates. Its three case-zero checks are the toolchain guard the estate has to carry now that
 * `npm i typescript` installs the native 7.x port with NO `ts.createProgram`:
 *
 *   1. `EXTRACT_SPEC_VERSION === fixture.extractSpecVersion` — the usual "the code is the spec".
 *   2. `ts.version === fixture.expectedTypescriptVersion` — two engines on different 5.x patches
 *      can extract differently on a construct absent from these vectors, each pass their own
 *      conformance, and disagree on a REAL verdict. That is finding X3/X7 applied to a dependency.
 *   3. `typeof ts.createProgram === 'function'` — so a 7.x resolution fails with a sentence rather
 *      than a `TypeError` in the middle of a gate run.
 *
 * @param {object} options
 * @param {object} options.fixture parsed export-extract-conformance.json
 * @param {number} options.extractSpecVersion the implementation's EXTRACT_SPEC_VERSION constant
 * @param {string} options.tsVersion the RESOLVED `ts.version` (not the declared range)
 * @param {unknown} options.createProgram the resolved `ts.createProgram`, for the 7.x check
 * @param {Function} options.extractSurfaceNames ({files, manifestText, ts}) => {names}
 * @param {Function} options.acceptsCachedSurface (surface) => boolean
 * @param {object} options.ts the compiler module handed to the extractor
 * @returns {string[]} failures
 */
export function runExtractConformance({fixture, extractSpecVersion, tsVersion, createProgram, extractSurfaceNames, acceptsCachedSurface, ts}) {
  const failures = []
  const fail = (id, detail) => failures.push(`${id}: ${detail}`)

  if (extractSpecVersion !== fixture.extractSpecVersion) {
    fail('EXTRACT_SPEC_VERSION', `implementation is ${extractSpecVersion}, fixture is ${fixture.extractSpecVersion}`)
    return failures
  }
  if (typeof createProgram !== 'function') {
    fail('typescript',
      `the resolved typescript (${
        tsVersion ?? 'unknown version'
      }) exposes no createProgram — this is the native 7.x port, which has no JavaScript compiler API`)
    return failures
  }
  if (tsVersion !== fixture.expectedTypescriptVersion) {
    fail('typescript', `resolved typescript is ${tsVersion}, the fixture was generated against exactly ${fixture.expectedTypescriptVersion}`)
    return failures
  }

  for (const testCase of fixture.cases) {
    const {id, kind} = testCase
    try {
      if (kind === 'extract') {
        const got = extractSurfaceNames({files: testCase.files, manifestText: testCase.manifest, ts})
        const shaped = Object.fromEntries(
          Object.entries(got.names ?? {}).map((
            [subpath, entry]
          ) => [subpath, {classification: entry.classification, names: entry.names, target: entry.target}])
        )
        if (!eq(shaped, testCase.expect.names)) {
          fail(id, `want ${JSON.stringify(testCase.expect.names)} got ${JSON.stringify(shaped)} — ${testCase.why}`)
        }
        // KEY ORDER IS PART OF THE ANSWER: the subpath map is emitted in codepoint order, so a diff
        // of two runs can never show a reordering that is not a change.
        const keys = Object.keys(got.names ?? {})
        if (!eq(keys, [...keys].sort(codepointCompare))) {
          fail(id, `subpath keys are not in codepoint order: ${JSON.stringify(keys)}`)
        }
        // An INDETERMINATE subpath with no reason is unactionable; the prose itself is NOT pinned.
        for (const [subpath, entry] of Object.entries(got.names ?? {})) {
          if (entry.classification === 'INDETERMINATE' && !entry.detail) {
            fail(id, `${subpath} is INDETERMINATE with no reason`)
          }
        }
        continue
      }

      if (kind === 'reference-cache') {
        const got = acceptsCachedSurface(testCase.surface)
        if (got !== testCase.expect.accepted) {
          fail(id, `accepted want ${testCase.expect.accepted} got ${got} — ${testCase.why}`)
        }
        continue
      }

      fail(id, `unknown case kind ${kind} — the vendored runner is older than the fixture`)
    } catch (error) {
      // A throw is a conformance failure, not a test crash: an extractor that throws on a malformed
      // tree takes the whole gate down instead of reporting INDETERMINATE for one subpath.
      fail(id, `THREW ${error?.constructor?.name ?? 'Error'}: ${error?.message}`)
    }
  }

  return failures
}

/** Codepoint order — the same rule the extractor sorts by, restated here so the runner is standalone. */
function codepointCompare(left, right) {
  const a = [...String(left)]
  const b = [...String(right)]
  const shared = Math.min(a.length, b.length)
  for (let i = 0; i < shared; i++) {
    const x = a[i].codePointAt(0)
    const y = b[i].codePointAt(0)
    if (x !== y) {
      return x < y ? -1 : 1
    }
  }
  return a.length === b.length ? 0 : a.length < b.length ? -1 : 1
}

/**
 * Integrity of the vendored copy against the checksum the implementation pins.
 * Call this from the same test, BEFORE the matching conformance run.
 *
 * @param {Buffer|string} fixtureBytes raw bytes of the vendored fixture
 * @param {string} expectedSha256 the constant pinned in the implementation's source
 * @param {string} [file] which fixture — there are TWO, and a message naming the wrong one sends a
 *   maintainer to re-vendor a file that is already correct
 * @returns {string[]} failures
 */
export function assertFixtureIntegrity(fixtureBytes, expectedSha256, file = 'export-surface-conformance.json') {
  const got = createHash('sha256').update(Buffer.isBuffer(fixtureBytes) ? fixtureBytes : Buffer.from(fixtureBytes, 'utf8')).digest('hex')
  if (got !== expectedSha256) {
    return [
      `vendored ${file} sha256 ${got} != pinned ${expectedSha256}. ` +
      'Re-vendor from atlas/contracts/export-surface/ and update the pinned constant together.'
    ]
  }
  return []
}
