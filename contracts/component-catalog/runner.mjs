#!/usr/bin/env node
/**
 * THE CONFORMANCE RUNNER for the catalog grammar.
 *
 * Runs `component-catalog-conformance.json` against `schema.mjs`. Two layers, in this order:
 *
 *   1. INTEGRITY — the vectors file matches `component-catalog-conformance.sha256`. Editing the
 *      vectors without regenerating the sidecar reds here. This is the estate contracts/ discipline
 *      (see `@j0nathan-ll0yd/estate-contracts/package-digest/runner` and its sha256 sidecar),
 *      applied to a DS-local contract: the digest is what makes "the vectors did not change" a
 *      checkable claim rather than a promise.
 *   2. CASE ZERO — `CATALOG_SPEC_VERSION` equals the vectors' `specVersion`. This is the whole point
 *      of the number: the grammar this file loads must be the grammar the vectors describe. A
 *      mismatch aborts before any case runs, because the cases would be asserting a different
 *      grammar than the one under test.
 *
 * Then every case. `expectErrorContains` pins WHICH rule fired, so a validator that rejects
 * everything for the wrong reason does not pass by accident.
 *
 * Usable two ways: imported by `check.mjs` and by `schema.test.mjs`, or run directly
 * (`node contracts/component-catalog/runner.mjs`), which exits non-zero on any failure.
 */

import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {basename, join} from 'node:path'
import {fileURLToPath} from 'node:url'

import {CATALOG_SPEC_VERSION, validateEntry} from './schema.mjs'

const HERE = fileURLToPath(new URL('.', import.meta.url))
export const VECTORS_PATH = join(HERE, 'component-catalog-conformance.json')
export const SIDECAR_PATH = join(HERE, 'component-catalog-conformance.sha256')

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

/**
 * Layer 1. The sidecar is `shasum -a 256` format: `<hex>  <basename>`. Both halves are checked — a
 * sidecar naming a different file is not a pin on this one.
 *
 * @param {Buffer} vectorBytes
 * @param {string} sidecarText
 * @returns {string[]} failures
 */
export function assertVectorIntegrity(vectorBytes, sidecarText) {
  const failures = []
  const [line] = sidecarText.trim().split('\n')
  const match = /^([0-9a-f]{64})\s+(\S+)$/.exec(line ?? '')
  if (!match) {
    return [`sidecar: expected \`<sha256hex>  <filename>\`, got ${JSON.stringify(line ?? '')}`]
  }
  const [, expected, named] = match
  if (named !== basename(VECTORS_PATH)) {
    failures.push(`sidecar: pins \`${named}\`, expected \`${basename(VECTORS_PATH)}\``)
  }
  const got = sha256(vectorBytes)
  if (got !== expected) {
    failures.push(
      `sidecar: ${basename(VECTORS_PATH)} sha256 is ${got}, sidecar pins ${expected}. ` +
        'Edit the vectors and the sidecar in the same change: ' +
        '(cd contracts/component-catalog && shasum -a 256 component-catalog-conformance.json > component-catalog-conformance.sha256)'
    )
  }
  return failures
}

/**
 * Layer 2 plus every case.
 *
 * @param {{fixture: object, specVersion?: number, validate?: (entry: unknown) => {valid: boolean, errors: string[]}}} options
 * @returns {string[]} failures — empty means conforming
 */
export function runCatalogConformance({fixture, specVersion = CATALOG_SPEC_VERSION, validate = validateEntry}) {
  const failures = []
  const fail = (name, detail) => failures.push(`${name}: ${detail}`)

  // CASE ZERO. Abort rather than continue: the cases below describe a grammar this is not.
  if (specVersion !== fixture.specVersion) {
    fail('CATALOG_SPEC_VERSION', `implementation is ${specVersion}, vectors are ${fixture.specVersion}`)
    return failures
  }

  if (!Array.isArray(fixture.cases) || fixture.cases.length === 0) {
    fail('cases', 'the vectors file declares no cases')
    return failures
  }

  const seen = new Set()
  for (const testCase of fixture.cases) {
    const {name, entry, expectValid, expectErrorContains} = testCase
    if (typeof name !== 'string' || name.length === 0) {
      fail('<unnamed>', 'every case needs a name')
      continue
    }
    if (seen.has(name)) {
      fail(name, 'duplicate case name — a shadowed case is a case nobody runs')
    }
    seen.add(name)
    if (typeof expectValid !== 'boolean') {
      fail(name, `expectValid must be a boolean, got ${JSON.stringify(expectValid)}`)
      continue
    }

    let result
    try {
      result = validate(entry)
    } catch (error) {
      // A throw is a conformance failure, not a test crash. The grammar must reject malformed
      // input, never blow up on it — a gate that crashes on bad input reports nothing useful.
      fail(name, `THREW ${error?.constructor?.name ?? 'Error'}: ${error?.message}`)
      continue
    }

    if (typeof result?.valid !== 'boolean' || !Array.isArray(result?.errors)) {
      fail(name, `validateEntry must return {valid: boolean, errors: string[]}, got ${JSON.stringify(result)}`)
      continue
    }
    if (result.valid !== (result.errors.length === 0)) {
      fail(name, `valid=${result.valid} disagrees with ${result.errors.length} error(s) — the two must never diverge`)
    }
    if (result.valid !== expectValid) {
      fail(name, `expected valid=${expectValid}, got valid=${result.valid}${result.errors.length > 0 ? ` (${result.errors.join('; ')})` : ''}`)
      continue
    }
    if (expectErrorContains !== undefined) {
      if (expectValid) {
        fail(name, 'expectErrorContains is set on a case that expects a VALID entry')
        continue
      }
      if (!result.errors.some((message) => message.includes(expectErrorContains))) {
        fail(name, `no error contained ${JSON.stringify(expectErrorContains)} — got ${JSON.stringify(result.errors)}`)
      }
    }
  }

  return failures
}

/** Read the vectors and the sidecar from disk and run both layers. */
export function runFromDisk() {
  const vectorBytes = readFileSync(VECTORS_PATH)
  const integrity = assertVectorIntegrity(vectorBytes, readFileSync(SIDECAR_PATH, 'utf8'))
  if (integrity.length > 0) {
    return {failures: integrity, caseCount: 0}
  }
  const fixture = JSON.parse(vectorBytes.toString('utf8'))
  return {failures: runCatalogConformance({fixture}), caseCount: fixture.cases?.length ?? 0}
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const {failures, caseCount} = runFromDisk()
  if (failures.length > 0) {
    process.stderr.write(`[component-catalog:runner] FAIL — ${failures.length} conformance failure(s)\n`)
    for (const failure of failures) {
      process.stderr.write(`  x ${failure}\n`)
    }
    process.exit(1)
  }
  process.stdout.write(`[component-catalog:runner] PASS — ${caseCount} grammar vectors, specVersion ${CATALOG_SPEC_VERSION}, sidecar verified\n`)
}
