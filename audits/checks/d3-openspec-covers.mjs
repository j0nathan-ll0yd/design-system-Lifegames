#!/usr/bin/env node
// mantle-cli-output: openspec covers-conformance gate report for stdout
//
// The openspec-covers gate. The rule itself is NOT in this repo: it arrives as
// `@j0nathan-ll0yd/estate-contracts/openspec-covers`, exact-pinned in package.json and resolved
// from the lockfile (atlas decisions 0079 item 4 wave 2b, 0080). This wrapper is adapted from
// `j0nathan-ll0yd.github.io/scripts/openspec-covers.mjs` and keeps its integrity check verbatim in
// substance: a corrupted or partial install (bytes vs sidecar), a sidecar rewritten to a bare hash
// (format), and a contract release that moved the RULE without this repo moving with it
// (EXPECTED_COVERS_SPEC_VERSION) all fail loudly here.
//
// TWO THINGS ARE DIFFERENT HERE, AND BOTH ARE THIS REPO'S TEST CORPUS, NOT THE RULE.
//
// 1. LANGUAGES. The contract's DEFAULT_LANGUAGES table speaks `**/*.test.ts`, `**/*.tftest.hcl` and
//    `**/*Tests.swift`. This repo's gate suites are `node --test` files ending `.test.mjs`
//    (`pnpm test:scripts`) and ESLint RuleTester suites ending `.test.js`
//    (`eslint-local-rules/__tests__/`). Scanning only the default three would leave the widget
//    contract's own enforcement invisible to the tether, which is the worst outcome: a green gate
//    over a corpus it cannot see. `options.languages` is the contract's documented consumer knob
//    (`checkCoversDetailed` JSDoc) and passing a wider table is a SCAN-SURFACE choice, not a rule
//    change -- COVERS_SPEC_VERSION does not move. The table's own invariant, "language globs MUST be
//    disjoint", is asserted at startup rather than assumed.
//
// 2. A BASELINE. Three requirements in openspec/specs/widget-contract/spec.md describe rules this
//    repo enforces with a blocking gate that has NO known-answer test. They are recorded by identity
//    in openspec/covers-baseline.json. Only `uncovered-requirement` is baseline-eligible; every other
//    finding type blocks unconditionally, and a baseline id naming no live requirement blocks too --
//    a stale grandfathering reads as covered, which is the failure the baseline exists to prevent.

import {createHash} from 'node:crypto'
import {readFileSync, writeFileSync} from 'node:fs'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {
  checkCoversDetailed,
  COVERS_SPEC_VERSION,
  DEFAULT_LANGUAGES,
  DEFAULT_SPEC_GLOB,
  DEFAULT_SPEC_IGNORE,
  globSync,
  parseRequirements,
  STRICT_TS_COVERS
} from '@j0nathan-ll0yd/estate-contracts/openspec-covers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
export const REPO_ROOT = resolve(__dirname, '..', '..')

/**
 * The covers spec version this repo's openspec/ tree was written against.
 *
 * v4 added `requirement-without-scenario`: every `### Requirement:` must carry at least one
 * `#### Scenario:`. Moving this number means the rule changed under us -- read the tier README,
 * bring openspec/ into line with the new rule, and move the constant in the same change.
 */
export const EXPECTED_COVERS_SPEC_VERSION = 4

/** The tier's reference module URL. Sidecars sit beside it; the layout is flat and stable. */
const REFERENCE_URL = new URL(import.meta.resolve('@j0nathan-ll0yd/estate-contracts/openspec-covers'))

export const BASELINE_REL = 'openspec/covers-baseline.json'
export const BASELINE_PATH = join(REPO_ROOT, BASELINE_REL)

/** The one finding type a baseline entry may grandfather. Everything else blocks unconditionally. */
export const BASELINE_ELIGIBLE_TYPE = 'uncovered-requirement'

/**
 * The two test-file shapes this repo speaks that the contract's default table does not. Both are
 * `//`-comment languages, so both reuse STRICT_TS_COVERS and both run near-miss detection -- a
 * `covers:` written as a trailing comment reads as a tether to a human and is invisible to the
 * reconcile, and that is exactly as bad in a `.test.mjs` as in a `.test.ts`.
 */
export const EXTRA_LANGUAGES = Object.freeze([
  Object.freeze({id: 'mjs', glob: '**/*.test.mjs', commentRegex: STRICT_TS_COVERS, nearMiss: true}),
  Object.freeze({id: 'cjs', glob: '**/*.test.js', commentRegex: STRICT_TS_COVERS, nearMiss: true})
])

export const DS_LANGUAGES = Object.freeze([...DEFAULT_LANGUAGES, ...EXTRA_LANGUAGES])

/** Raised when the baseline cannot be read as the shape this gate requires. Never degrades to a pass. */
export class BaselineError extends Error {}

/**
 * The contract's own invariant: "Language globs MUST be disjoint. A file matched by two entries is
 * scanned twice and counted twice." Asserted rather than assumed, because the failure is silent --
 * if a future contract release adds `**\/*.test.mjs` to DEFAULT_LANGUAGES, every DS tether would be
 * counted twice and the near-miss pass would run twice over the same bytes.
 *
 * @param {readonly {id: string, glob: string}[]} languages
 */
export function assertLanguagesDisjoint(languages) {
  const seenGlobs = new Map()
  const seenIds = new Set()
  for (const language of languages) {
    if (seenGlobs.has(language.glob)) {
      throw new Error(
        `openspec-covers language table is not disjoint: '${language.glob}' is claimed by both ` +
          `'${seenGlobs.get(language.glob)}' and '${language.id}'. A file matched twice is counted twice. ` +
          "Reconcile audits/checks/d3-openspec-covers.mjs with the contract's DEFAULT_LANGUAGES."
      )
    }
    if (seenIds.has(language.id)) {
      throw new Error(`openspec-covers language table repeats the id '${language.id}'.`)
    }
    seenGlobs.set(language.glob, language.id)
    seenIds.add(language.id)
  }
  return true
}

export function checkCoversIntegrity() {
  const referenceBytes = readFileSync(REFERENCE_URL)

  // `<sha256>  <filename>` -- TWO whitespace-separated fields, not a bare hash. An
  // `awk '{print $1}'` one-liner rewrote one of these to a bare hash once and silently broke the
  // format for every consumer, so the FORMAT is asserted, not merely parsed past.
  const fields = readFileSync(new URL('reference.mjs.sha256', REFERENCE_URL), 'utf8').trim().split(/\s+/)
  if (fields.length !== 2 || fields[1] !== 'reference.mjs') {
    throw new Error(`openspec-covers sidecar is not the two-field <sha256>  reference.mjs format: got ${JSON.stringify(fields)}`)
  }

  const actualSha = createHash('sha256').update(referenceBytes).digest('hex')
  if (actualSha !== fields[0]) {
    throw new Error(
      `openspec-covers sha256 mismatch! The shipped rule disagrees with the sidecar shipped beside it. ` +
        `Expected ${fields[0]}, got ${actualSha}. Reinstall: pnpm install --frozen-lockfile`
    )
  }

  if (COVERS_SPEC_VERSION !== EXPECTED_COVERS_SPEC_VERSION) {
    throw new Error(
      `openspec-covers spec version ${COVERS_SPEC_VERSION} is not the ${EXPECTED_COVERS_SPEC_VERSION} this repo was written against. ` +
        'A rule change landed in @j0nathan-ll0yd/estate-contracts; reconcile openspec/ and move EXPECTED_COVERS_SPEC_VERSION together.'
    )
  }

  assertLanguagesDisjoint(DS_LANGUAGES)

  return true
}

/** `capability#Requirement name` -- the key the tether, the finding and the baseline all speak. */
export function requirementKey(capability, requirementName) {
  return `${capability}#${requirementName}`
}

/**
 * Every `### Requirement:` in the tree, keyed. Read through the contract's own walker and parser so
 * the key set cannot disagree with the one `checkCoversDetailed` built from the same bytes.
 *
 * @param {string} cwd scan root
 * @returns {Set<string>}
 */
export function liveRequirementKeys(cwd = REPO_ROOT) {
  const keys = new Set()
  for (const specFile of globSync(DEFAULT_SPEC_GLOB, {cwd, ignore: DEFAULT_SPEC_IGNORE})) {
    const capability = specFile.split('/').at(-2)
    const content = readFileSync(join(cwd, specFile), 'utf-8')
    for (const requirement of parseRequirements(content, specFile, capability)) {
      keys.add(requirementKey(requirement.capability, requirement.requirementName))
    }
  }
  return keys
}

/**
 * Read the grandfathered set. A file that is absent yields an EMPTY set, which grandfathers nothing
 * and is therefore strictly STRICTER than the committed file -- deleting the baseline cannot buy a
 * pass, it can only cost one. A file that exists but cannot be read as `{uncovered: string[]}` throws:
 * a malformed baseline that degraded to an empty set would look identical to a deliberate deletion,
 * and only one of those is someone's intent.
 *
 * @param {string} path
 * @returns {{ids: Set<string>, present: boolean, raw: object|null}}
 */
export function readBaseline(path = BASELINE_PATH) {
  let text
  try {
    text = readFileSync(path, 'utf-8')
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {ids: new Set(), present: false, raw: null}
    }
    throw new BaselineError(`covers baseline at ${path} could not be read: ${error.message}`)
  }

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new BaselineError(`covers baseline at ${path} is not valid JSON: ${error.message}`)
  }

  if (parsed === null || typeof parsed !== 'object' || !Array.isArray(parsed.uncovered)) {
    throw new BaselineError(`covers baseline at ${path} has no 'uncovered' array. Re-record it with --update-baseline.`)
  }
  for (const id of parsed.uncovered) {
    if (typeof id !== 'string' || !id.includes('#')) {
      throw new BaselineError(`covers baseline at ${path} holds a non-key entry: ${JSON.stringify(id)}. Each entry is 'capability#Requirement name'.`)
    }
  }

  return {ids: new Set(parsed.uncovered), present: true, raw: parsed}
}

const BASELINE_DESCRIPTION = 'Requirements in openspec/specs/**/spec.md that describe an ENFORCED rule with no known-answer test to tether. ' +
  'Each entry is a recorded GAP, not a pass. When a requirement gains a covering test, prune its id here in the SAME change. ' +
  'Only uncovered-requirement findings are eligible; every other covers finding blocks unconditionally.'

/**
 * Write the grandfathered set. Sorted and terminated with a newline, so two runs over the same tree
 * produce byte-identical output and the file is a diff, not a churn.
 */
export function writeBaseline(uncoveredKeys, path = BASELINE_PATH) {
  const body = {
    description: BASELINE_DESCRIPTION,
    generatedBy: 'node audits/checks/d3-openspec-covers.mjs --update-baseline',
    uncovered: [...uncoveredKeys].sort()
  }
  writeFileSync(path, `${JSON.stringify(body, null, 2)}\n`)
  return body
}

/**
 * Split a run's findings into what blocks, what is grandfathered, and what the baseline should no
 * longer be carrying.
 *
 *   - a finding whose type is not `uncovered-requirement`  -> BLOCKING, always
 *   - an uncovered requirement absent from the baseline    -> BLOCKING
 *   - an uncovered requirement named in the baseline       -> grandfathered, silent
 *   - a baseline id naming no live requirement             -> BLOCKING (stale grandfathering)
 *   - a baseline id whose requirement is now covered       -> prunable, never blocks
 *
 * The last two mirror contracts/component-catalog/ratchet.mjs, which this repo already runs: a stale
 * id fails there too, and a graduated id is reported prunable and does not block.
 *
 * @param {{findings: object[], baselineIds: Set<string>, requirementKeys: Set<string>}} input
 */
export function partitionFindings({findings, baselineIds, requirementKeys}) {
  const blocking = []
  const grandfathered = []
  const uncoveredKeys = new Set()

  for (const finding of findings) {
    if (finding.type !== BASELINE_ELIGIBLE_TYPE) {
      blocking.push(finding)
      continue
    }
    const key = requirementKey(finding.capability, finding.requirementName)
    uncoveredKeys.add(key)
    if (baselineIds.has(key)) {
      grandfathered.push({...finding, key})
    } else {
      blocking.push(finding)
    }
  }

  const stale = []
  const prunable = []
  for (const id of [...baselineIds].sort()) {
    if (!requirementKeys.has(id)) {
      stale.push(id)
    } else if (!uncoveredKeys.has(id)) {
      prunable.push(id)
    }
  }

  return {blocking, grandfathered, prunable, stale, uncoveredKeys}
}

/** One run of the rule over a tree, partitioned. Exported so the gate's own tests can drive it. */
export function runGate({cwd = REPO_ROOT, baselinePath = BASELINE_PATH} = {}) {
  const result = checkCoversDetailed({cwd, languages: DS_LANGUAGES, annotateLanguage: true})
  const {ids: baselineIds, present: baselinePresent} = readBaseline(baselinePath)
  const requirementKeys = liveRequirementKeys(cwd)
  const partition = partitionFindings({findings: result.findings, baselineIds, requirementKeys})
  return {...result, ...partition, baselinePresent, requirementKeys}
}

function main() {
  const isBlocking = process.argv.includes('--blocking')
  const isJson = process.argv.includes('--json')
  const isUpdate = process.argv.includes('--update-baseline')

  checkCoversIntegrity()

  const gate = runGate()

  if (isUpdate) {
    const written = writeBaseline(gate.uncoveredKeys)
    console.log(`Re-recorded ${BASELINE_REL} with ${written.uncovered.length} grandfathered requirement(s).`)
    for (const id of written.uncovered) {
      console.log(`  ${id}`)
    }
    return
  }

  if (isJson) {
    console.log(
      JSON.stringify({
        specVersion: COVERS_SPEC_VERSION,
        specsScanned: gate.specsScanned,
        testFilesScanned: gate.testFilesScanned,
        requirementsFound: gate.requirementsFound,
        coversAnnotationsFound: gate.coversAnnotationsFound,
        blocking: gate.blocking,
        grandfathered: gate.grandfathered,
        prunable: gate.prunable,
        stale: gate.stale
      }, null, 2)
    )
  } else {
    console.log(
      `openspec-covers (spec version ${COVERS_SPEC_VERSION}): ${gate.specsScanned} spec file(s), ` +
        `${gate.requirementsFound} requirement(s), ${gate.testFilesScanned} test file(s), ` +
        `${gate.coversAnnotationsFound} covers: annotation(s)`
    )
    console.log(`languages: ${DS_LANGUAGES.map((language) => `${language.id}=${language.glob}`).join(' ')}`)
    console.log(gate.baselinePresent
      ? `baseline: ${BASELINE_REL} grandfathers ${gate.grandfathered.length} untethered requirement(s)`
      : `baseline: ${BASELINE_REL} is absent -- nothing is grandfathered`)

    for (const id of gate.grandfathered.map((finding) => finding.key).sort()) {
      console.log(`  [grandfathered] ${id} — recorded gap, not a pass`)
    }
    for (const id of gate.prunable) {
      console.log(`  [prunable] ${id} — now covered; prune it from ${BASELINE_REL} in this change`)
    }

    if (gate.blocking.length === 0 && gate.stale.length === 0) {
      console.log('')
      console.log('OK: every requirement is tethered or grandfathered, and every covers: annotation resolves.')
    } else {
      console.log('')
      for (const finding of gate.blocking) {
        console.log(`[${finding.type}] ${finding.file}:${finding.line} — ${finding.message}`)
      }
      for (const id of gate.stale) {
        console.log(`[stale-baseline-id] ${BASELINE_REL} — '${id}' names no requirement in openspec/specs/. A stale grandfathering reads as covered.`)
      }
      console.log('')
      const total = gate.blocking.length + gate.stale.length
      console.log(isBlocking
        ? `FAIL: ${total} blocking covers finding(s).`
        : `${total} blocking covers finding(s) (report-only; pass --blocking to gate).`)
    }
  }

  if (isBlocking && gate.blocking.length + gate.stale.length > 0) {
    process.exit(1)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main()
}
