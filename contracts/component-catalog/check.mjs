#!/usr/bin/env node
/**
 * THE GATE.
 *
 *   node contracts/component-catalog/check.mjs [--check]
 *
 * Four checks, in cost order. Each one is a distinct failure the others cannot see:
 *
 *   1. GRAMMAR CONFORMANCE — `runner.mjs`: the sha256 sidecar matches the vectors, the grammar's
 *      CATALOG_SPEC_VERSION matches the vectors' specVersion, every vector holds. Without this the
 *      other three checks are running an unverified validator.
 *   2. VALIDITY — every `catalog/*.contract.json` satisfies the grammar.
 *   3. COMPLETENESS — every pilot widget has an entry, and every entry resolves to files that exist.
 *      A contract naming a deleted view is worse than a missing contract: it reads as covered.
 *   4. IDEMPOTENCE — regenerate into a temp directory and compare bytes against what is committed.
 *      This is the check that makes the catalog a SPEC rather than a document: a hand-edit to a
 *      committed contract, or a source change nobody regenerated for, reds here.
 *
 * `--check` is accepted for parity with the sibling gates (`check-promotion.mjs --check`,
 * `check-swift-widget-purity.mjs --check`) and is a no-op: this gate never writes.
 */

import {existsSync, mkdtempSync, readFileSync, rmSync} from 'node:fs'
import {readdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {basename, join} from 'node:path'
import {fileURLToPath} from 'node:url'

import {CATALOG_DIR, generateAll, PILOT_WIDGETS, REPO_ROOT} from './generate.mjs'
import {runFromDisk} from './runner.mjs'
import {CATALOG_SPEC_VERSION, validateEntry} from './schema.mjs'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const SUFFIX = '.contract.json'

for (const arg of process.argv.slice(2)) {
  if (arg !== '--check') {
    process.stderr.write(`[component-catalog] unknown argument \`${arg}\`. Usage: node contracts/component-catalog/check.mjs [--check]\n`)
    process.exit(2)
  }
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
const completenessFailures = []

for (const widget of PILOT_WIDGETS) {
  if (!entries.has(widget)) {
    completenessFailures.push(`pilot widget \`${widget}\` has no entry — expected catalog/${widget}${SUFFIX}`)
  }
}

for (const [widget, entry] of [...entries].sort()) {
  // Every ref must resolve to a real file. `sources` values may be glob-shaped placeholders
  // (`<state>`, `[.<state>]`, `*`) which describe a filename family rather than one file, so only
  // the literal paths are stat-ed.
  const refs = [['propsRef', entry.propsRef], ['swiftPropsRef', entry.swiftPropsRef]]
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
record(`completeness (${PILOT_WIDGETS.length} pilot widgets, ${entries.size} entries)`, completenessFailures)

// ── 4. Idempotence ───────────────────────────────────────────────────────────
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
      idempotenceFailures.push(`${file}: committed, but the generator does not produce it — remove it or add the widget to PILOT in generate.mjs`)
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
