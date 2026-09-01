#!/usr/bin/env node
/**
 * THE GATE.
 *
 *   node contracts/component-catalog/check.mjs [--check | --update-baseline]
 *
 * Six checks, in cost order. Each one is a distinct failure the others cannot see:
 *
 *   1. GRAMMAR CONFORMANCE — `runner.mjs`: the sha256 sidecar matches the vectors, the grammar's
 *      CATALOG_SPEC_VERSION matches the vectors' specVersion, every vector holds. Without this the
 *      other four checks are running an unverified validator.
 *   2. VALIDITY — every `catalog/*.contract.json` satisfies the grammar.
 *   3. COMPLETENESS — every widget in the UNION of the Swift and web widget trees has exactly one
 *      entry, no entry exists outside that union, and every non-null ref resolves to a file that
 *      exists. A contract naming a deleted view is worse than a missing contract: it reads as covered.
 *   4. CONFORMANCE RATCHET — `ratchet.mjs`: a widget with a null `conformance.behavioralTest` or a
 *      null `a11y.voiceOverLabel` must be grandfathered in `conformance-baseline.json`. Checks 1–3
 *      prove the catalog WRITES its gaps; this one is what stops the pile from growing. It runs
 *      after validity so it never reads an entry that failed the grammar, and before idempotence
 *      because it is far cheaper.
 *   5. BASELINE FREEZE — `ratchet.mjs` again, but reading the baseline against ITS OWN prior state
 *      rather than against the catalog. Check 4 is satisfied by anything the baseline lists, so a PR
 *      that added an untested widget and ran `--update-baseline` passed it: the new gap was absorbed
 *      and the pile grew, green. Under CI (or `CATALOG_BASELINE_FROZEN=1`) this check compares the
 *      committed baseline with the one at the merge base and FAILS on any id that was added, unless
 *      a `Baseline-Raise:` trailer names that exact axis and id and says why.
 *   6. IDEMPOTENCE — regenerate into a temp directory and compare bytes against what is committed.
 *      This is the check that makes the catalog a SPEC rather than a document: a hand-edit to a
 *      committed contract, or a source change nobody regenerated for, reds here.
 *
 * `--check` is accepted for parity with the sibling gates (`check-promotion.mjs --check`,
 * `check-swift-widget-purity.mjs --check`) and is a no-op: in check mode this gate never writes.
 *
 * `--update-baseline` is the ONE writing mode: it re-records `conformance-baseline.json` from the
 * current catalog. It runs checks 1–3 first and refuses to write if any of them fails, because a
 * baseline recorded from an invalid or incomplete catalog grandfathers garbage. It stays available
 * while frozen on purpose — check 5 judges the RESULT, so it catches a hand-edit and a re-record
 * alike, and it catches them in CI rather than only on the machine that ran the writer.
 */

import {existsSync, mkdtempSync, readFileSync, rmSync} from 'node:fs'
import {readdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {basename, join} from 'node:path'
import {fileURLToPath} from 'node:url'

import {CATALOG_DIR, catalogWidgets, generateAll, REPO_ROOT} from './generate.mjs'
import {BASELINE_REL, BaselineError, evaluateRatchet, FreezeError, RAISE_KEY, readBaseline, runFreezeCheck, writeBaseline} from './ratchet.mjs'
import {runFromDisk} from './runner.mjs'
import {CATALOG_SPEC_VERSION, validateEntry} from './schema.mjs'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const SUFFIX = '.contract.json'
const USAGE = 'Usage: node contracts/component-catalog/check.mjs [--check | --update-baseline]'

let updateBaseline = false
for (const arg of process.argv.slice(2)) {
  if (arg === '--update-baseline') {
    updateBaseline = true
  } else if (arg !== '--check') {
    process.stderr.write(`[component-catalog] unknown argument \`${arg}\`. ${USAGE}\n`)
    process.exit(2)
  }
}

/** Fatal, RED, immediately. A baseline nobody can read must never resolve to "nothing to report". */
function abortRed(message) {
  process.stderr.write(`\n[component-catalog] ABORT RED — ${message}\n`)
  process.exit(1)
}

const results = []
const record = (name, failures) => {
  results.push({name, failures})
  return failures.length === 0
}

// ── 1. Grammar conformance ───────────────────────────────────────────────────
const conformance = runFromDisk()
record(`grammar conformance (${conformance.caseCount} vectors, specVersion ${CATALOG_SPEC_VERSION})`, conformance.failures)

// ── 2. Validity ──────────────────────────────────────────────────────────────
const contractFiles = (await readdir(CATALOG_DIR)).filter((file) => file.endsWith(SUFFIX)).sort()
const entries = new Map()
const validityFailures = []

if (contractFiles.length === 0) {
  validityFailures.push(`no ${SUFFIX} files in contracts/component-catalog/catalog/ — run \`node contracts/component-catalog/generate.mjs\``)
}

for (const file of contractFiles) {
  const path = join(CATALOG_DIR, file)
  let entry
  try {
    entry = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    validityFailures.push(`${file}: not parseable JSON — ${error.message}`)
    continue
  }
  const {valid, errors} = validateEntry(entry)
  if (!valid) {
    for (const message of errors) {
      validityFailures.push(`${file}: ${message}`)
    }
    continue
  }
  // The filename is part of the contract: the gate resolves entries by slug, so a file named for
  // one widget holding another's entry would make both lookups lie.
  const expectedFile = `${entry.widget}${SUFFIX}`
  if (file !== expectedFile) {
    validityFailures.push(`${file}: entry declares widget \`${entry.widget}\`, so the file must be named ${expectedFile}`)
    continue
  }
  entries.set(entry.widget, entry)
}
record(`entry validity (${contractFiles.length} contract file(s))`, validityFailures)

// ── 3. Completeness ──────────────────────────────────────────────────────────
//
// At v3 the covered set is the UNION of the Swift widget tree and the web widget tree, discovered on
// every run rather than hand-listed. Both directions are checked: a union widget with no entry is an
// uncovered widget, and an entry outside the union is a PHANTOM — a contract for something that no
// longer exists, which reads as coverage and is the more dangerous of the two.
const completenessFailures = []
const union = catalogWidgets()
const unionSet = new Set(union)

for (const widget of union) {
  if (!entries.has(widget)) {
    completenessFailures.push(`widget \`${widget}\` is in the Swift/web union but has no entry — expected catalog/${widget}${SUFFIX}`)
  }
}

for (const [widget, entry] of [...entries].sort()) {
  if (!unionSet.has(widget)) {
    completenessFailures.push(`${widget}: has an entry but is in neither the Swift nor the web widget tree — remove the phantom contract`)
    continue
  }

  // Every ref must resolve to a real file. A `null` ref is a WRITTEN GAP (a partial entry: no web
  // types file, or no dedicated Swift props file) and is skipped rather than treated as a miss.
  // `sources` values may be glob-shaped placeholders (`<state>`, `[.<state>]`, `*`) which describe a
  // filename family rather than one file, so only the literal paths are stat-ed.
  const refs = [['propsRef', entry.propsRef], ['swiftPropsRef', entry.swiftPropsRef]].filter(([, value]) => value !== null)

  // A partial entry still has to point at something real on the platform it claims. An entry whose
  // every file ref is null describes a widget nobody can locate.
  if (refs.length === 0) {
    completenessFailures.push(`${widget}: both propsRef and swiftPropsRef are null — the entry resolves to no widget on either platform`)
  }

  if (entry.a11y.ref !== null) {
    refs.push(['a11y.ref', entry.a11y.ref.replace(/:\d+$/, '')])
  }
  for (const [axis, value] of Object.entries(entry.sources ?? {})) {
    for (const path of Array.isArray(value) ? value : [value]) {
      if (!/[*<\[]/.test(path)) {
        refs.push([`sources.${axis}`, path])
      }
    }
  }
  for (const [field, rel] of refs) {
    if (!existsSync(join(REPO_ROOT, rel))) {
      completenessFailures.push(`${widget}: ${field} points at ${rel}, which does not exist`)
    }
  }
}
record(`completeness (${union.length} widgets in the Swift/web union, ${entries.size} entries)`, completenessFailures)

const catalogEntries = [...entries.values()]

// ── `--update-baseline` ──────────────────────────────────────────────────────
//
// The only writing path. It re-records the baseline from the catalog on disk — but ONLY once checks
// 1-3 are green. Recording from an invalid catalog would grandfather ids the grammar rejects; from
// an incomplete one it would silently omit a widget whose entry is missing, which the ratchet would
// then never ask about again.
if (updateBaseline) {
  const blocking = results.filter(({failures}) => failures.length > 0)
  if (blocking.length > 0) {
    for (const {name, failures} of blocking) {
      process.stderr.write(` FAIL  ${name}\n`)
      for (const failure of failures) {
        process.stderr.write(`        x ${failure}\n`)
      }
    }
    abortRed('refusing to record a baseline from a catalog that fails grammar, validity or completeness. Fix the above, then re-run.')
  }
  const {behavioralGap, a11yGap} = await writeBaseline(catalogEntries)
  process.stdout.write(
    `[component-catalog] Wrote ${BASELINE_REL} grandfathering ${behavioralGap.length} widget(s) with no behavioral ` +
      `conformance test and ${a11yGap.length} with no recorded a11y label, out of ${catalogEntries.length} total.\n` +
      `[component-catalog] The baseline is FROZEN. If this re-record ADDED an id, check 5 will block it in CI until a ` +
      `\`${RAISE_KEY}: <axis>:<widget-id> <reason>\` trailer on a commit in this branch justifies the raise. ` +
      'Pruning ids, which is what closing a gap does, needs nothing.\n'
  )
  process.exit(0)
}

// ── 4. Conformance ratchet ───────────────────────────────────────────────────
//
// Checks 1-3 prove the catalog WRITES its conformance gaps. That made the debt countable and
// permanent. This check is the ratchet: a null field is tolerated only while its id sits in the
// committed baseline, so a NEW widget with no coverage and a REGRESSION that drops coverage both
// red, while the 31/29 already-known gaps stay quiet until someone graduates them.
const ratchetFailures = []
let prunable = []
let baselineSizes = '0/0'
let baseline
try {
  baseline = readBaseline()
  baselineSizes = `${baseline.behavioralGap.size}/${baseline.a11yGap.size}`
  const outcome = evaluateRatchet({entries: catalogEntries, baseline})
  ratchetFailures.push(...outcome.failures)
  prunable = outcome.prunable
} catch (error) {
  if (error instanceof BaselineError) {
    abortRed(error.message)
  }
  throw error
}
record(`conformance ratchet (${baselineSizes} grandfathered behavioral/a11y gaps in ${BASELINE_REL})`, ratchetFailures)

// ── 5. Baseline freeze ───────────────────────────────────────────────────────
//
// Check 4 asks whether the catalog's gaps are grandfathered. It cannot ask whether the
// GRANDFATHERING itself grew, so `--update-baseline` could absorb a new gap and leave every check
// green — the hole atlas decision 0102 move 1b closes. This check compares the committed baseline
// against the one at the merge base and blocks an id that was added without a named, justified
// raise. It runs only when frozen (CI, or CATALOG_BASELINE_FROZEN=1), because off a branch point
// there is nothing to compare against.
let freeze
try {
  freeze = runFreezeCheck({baseline})
} catch (error) {
  if (error instanceof FreezeError || error instanceof BaselineError) {
    abortRed(error.message)
  }
  throw error
}
record(`baseline freeze (${freeze.describe})`, freeze.failures)

// ── 6. Idempotence ───────────────────────────────────────────────────────────
const idempotenceFailures = []
const scratch = mkdtempSync(join(tmpdir(), 'component-catalog-'))
try {
  const regenerated = await generateAll({outDir: scratch})
  const expected = new Set(regenerated.map(({file}) => file))

  for (const {file, bytes} of regenerated) {
    const committedPath = join(CATALOG_DIR, file)
    if (!existsSync(committedPath)) {
      idempotenceFailures.push(`${file}: the generator produces it, but it is not committed`)
      continue
    }
    const committed = readFileSync(committedPath, 'utf8')
    if (committed !== bytes) {
      idempotenceFailures.push(`${file}: committed bytes differ from a fresh generation.\n${firstDiff(committed, bytes)}`)
    }
  }
  for (const file of contractFiles) {
    if (!expected.has(file)) {
      idempotenceFailures.push(`${file}: committed, but the generator does not produce it — the widget left the union, so remove the contract`)
    }
  }
} finally {
  rmSync(scratch, {recursive: true, force: true})
}
record('idempotence (regenerate and diff)', idempotenceFailures)

/** Report the first differing line with both sides, so a byte drift is actionable without a diff tool. */
function firstDiff(committed, fresh) {
  const a = committed.split('\n')
  const b = fresh.split('\n')
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if (a[i] !== b[i]) {
      return `      line ${i + 1}\n        committed: ${JSON.stringify(a[i] ?? '<end of file>')}\n        generated: ${
        JSON.stringify(b[i] ?? '<end of file>')
      }`
    }
  }
  return '      files differ only in trailing bytes'
}

// ── Summary ──────────────────────────────────────────────────────────────────
const failed = results.filter(({failures}) => failures.length > 0)

for (const {name, failures} of results) {
  process.stdout.write(`${failures.length === 0 ? '  ok  ' : ' FAIL '} ${name}\n`)
  for (const failure of failures) {
    process.stdout.write(`        x ${failure}\n`)
  }
}

// Non-blocking on its own: a field went from null to populated, so its grandfathering is now dead
// weight. Blocking it would red the very PR that closes a gap. Reporting it is what makes "prune in
// the same PR" an instruction someone actually receives.
// The freeze's notes are the same kind of thing from the other side: a justified raise that was
// honoured, a gap set that shrank, a trailer left behind after the gap it justified was closed.
// None of them blocks, and all of them belong in the log the reviewer reads.
for (const notice of [...prunable, ...freeze.notes]) {
  process.stdout.write(`  note  ${notice}\n`)
}

if (failed.length > 0) {
  const total = failed.reduce((sum, {failures}) => sum + failures.length, 0)
  process.stdout.write(
    `\n[component-catalog] FAIL — ${total} problem(s) across ${failed.length} of ${results.length} checks.\n` +
      '  Regenerate with: node contracts/component-catalog/generate.mjs\n' +
      `  Grammar and discipline: ${join(basename(HERE), 'README.md')}\n`
  )
  process.exit(1)
}

process.stdout.write(`\n[component-catalog] PASS — ${results.length}/${results.length} checks green.\n`)
