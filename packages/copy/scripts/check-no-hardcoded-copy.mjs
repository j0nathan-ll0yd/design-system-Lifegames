#!/usr/bin/env node
/**
 * check-no-hardcoded-copy.mjs — @j0nathan-ll0yd/copy grep gate.
 *
 * Fails CI if a migrated copy VALUE reappears as a hardcoded quoted literal in
 * CONSUMER source — the highest-tier enforcement of "zero hardcoded
 * customer-facing text". Robustness rules baked in:
 *
 *   1. SCOPE to consumer source dirs only (CONSUMER_ROOTS). NEVER scans
 *      packages/copy/** (the authoring file legitimately holds every value and
 *      `_meta.usage` records old file:line refs that would self-match).
 *   2. EXCLUDE previews, tests, and fixtures (these may legitimately embed copy).
 *   3. Forbid only DISTINCTIVE values — multi-word phrases with no ICU
 *      placeholder. Short ambiguous tokens (BPM, km, RR, Cal, Status, Notes…)
 *      and interpolation templates ("{minutes} min …") are skipped to avoid
 *      false positives; templates are interpolated, never hardcoded verbatim.
 *   4. CASE-SENSITIVE exact-quoted match, so an out-of-scope all-caps variant
 *      (e.g. the OG-image "HEART RATE") does not collide with the canonical
 *      natural-case value ("Heart Rate").
 *
 * Pure Node (no ripgrep/grep dependency) so it runs anywhere CI does.
 * Extend NAMESPACES whenever a new namespace is migrated into @j0nathan-ll0yd/copy.
 */

import {readdirSync, readFileSync, statSync} from 'node:fs'
import {dirname, extname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = join(HERE, '..') // packages/copy
const DS_ROOT = join(PKG_ROOT, '..', '..') // design-system-Lifegames

/** Migrated namespaces whose values must not be hardcoded in consumers. */
const NAMESPACES = ['widgets', 'a11y', 'app', 'permissions', 'errors', 'llm']

/** Consumer source roots to scan (relative to DS_ROOT). Never packages/copy. */
const CONSUMER_ROOTS = [
  'packages/web/src/widgets',
  'packages/web/src/runtime',
  'Sources/LifegamesWidgets',
  'Sources/LifegamesComponentsCore'
]

const SCAN_EXTS = new Set(['.astro', '.ts', '.tsx', '.js', '.mjs', '.swift'])

/** A path segment match here excludes the file (previews/tests/fixtures). */
const EXCLUDE_RE = /(?:preview|\.test\.|\.spec\.|(^|\/)tests?(\/|$)|fixtures?)/i

function collectStrings(node, out) {
  if (typeof node === 'string') {
    out.push(node)
  } else if (Array.isArray(node)) {
    for (const n of node) {
      collectStrings(n, out)
    }
  } else if (node && typeof node === 'object') {
    for (const v of Object.values(node)) {
      collectStrings(v, out)
    }
  }
}

/** Distinctive = multi-word and not an ICU template. */
function isDistinctive(value) {
  return value.includes(' ') && !value.includes('{')
}

const forbidden = new Set()
for (const ns of NAMESPACES) {
  const flatPath = join(PKG_ROOT, 'dist', `${ns}.flat.json`)
  const flat = JSON.parse(readFileSync(flatPath, 'utf-8'))
  const values = []
  collectStrings(flat, values)
  for (const v of values) {
    if (isDistinctive(v)) {
      forbidden.add(v)
    }
  }
}

/** Quoted forms a consumer might hardcode (double / single / backtick). */
function quotedForms(value) {
  return [`"${value}"`, `'${value}'`, '`' + value + '`']
}

/**
 * Documented non-copy occurrences: a string that coincides with a widget label
 * but is actually a DATA-ROUTING key (the SystemStatus status-line keys are
 * data-derived, not copy — the widget title itself IS sourced from copy). Allowed
 * only in files whose path includes `pathIncludes`.
 */
const ALLOWLIST = [
  {value: 'Theatre Reviews', pathIncludes: 'SystemStatus'},
  // The web reading-feed STATUS_LABELS map is the WEB dashboard's own
  // reading-status display copy (next/in_progress/completed routing keys),
  // a separate surface from the iOS `app.bookshelf.statusUpNext` book-status
  // chip. It is not the same string instance as the iOS app namespace, so it
  // is not a hardcoded duplicate of migrated copy. Scoped to the runtime
  // constants file that owns the status map.
  {value: 'Up Next', pathIncludes: 'runtime/constants.ts'}
]

function isAllowed(value, relPath) {
  return ALLOWLIST.some((a) => a.value === value && relPath.includes(a.pathIncludes))
}

/**
 * 0-based line indices inside Swift `#Preview … { … }` blocks. Inline previews
 * live in regular view files, so the path-based EXCLUDE_RE misses them; preview
 * mock data is out of scope per the spec. Brace-matched from each `#Preview`.
 */
function swiftPreviewLines(lines) {
  const skip = new Set()
  for (let i = 0; i < lines.length; i++) {
    if (!/#Preview\b/.test(lines[i])) {
      continue
    }
    let depth = 0
    let started = false
    for (let j = i; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === '{') {
          depth++
          started = true
        } else if (ch === '}') {
          depth--
        }
      }
      skip.add(j)
      if (started && depth <= 0) {
        i = j
        break
      }
    }
  }
  return skip
}

function* walk(absDir) {
  let entries
  try {
    entries = readdirSync(absDir)
  } catch {
    return // root may not exist in a partial checkout — skip quietly.
  }
  for (const name of entries) {
    const abs = join(absDir, name)
    const rel = abs.slice(DS_ROOT.length + 1)
    if (EXCLUDE_RE.test(rel)) {
      continue
    }
    const st = statSync(abs)
    if (st.isDirectory()) {
      yield* walk(abs)
    } else if (SCAN_EXTS.has(extname(name))) {
      yield abs
    }
  }
}

const violations = []
for (const root of CONSUMER_ROOTS) {
  for (const file of walk(join(DS_ROOT, root))) {
    const relPath = file.slice(DS_ROOT.length + 1)
    const lines = readFileSync(file, 'utf-8').split('\n')
    const previewSkip = file.endsWith('.swift') ? swiftPreviewLines(lines) : new Set()
    lines.forEach((line, i) => {
      if (previewSkip.has(i)) {
        return
      }
      for (const value of forbidden) {
        if (isAllowed(value, relPath)) {
          continue
        }
        for (const q of quotedForms(value)) {
          if (line.includes(q)) {
            violations.push(`${relPath}:${i + 1}  hardcoded ${q}`)
          }
        }
      }
    })
  }
}

if (violations.length > 0) {
  console.error('copy:grep-gate — FAIL: migrated copy values found hardcoded in consumer source.')
  console.error('Replace each with the @j0nathan-ll0yd/copy reference (e.g. widgets.<group>.<key>).')
  console.error('')
  for (const v of violations) {
    console.error(`  ${v}`)
  }
  process.exit(1)
}

console.log(
  `copy:grep-gate — OK. ${forbidden.size} distinctive value(s) across [${NAMESPACES.join(', ')}] ` +
    `are not hardcoded in ${CONSUMER_ROOTS.length} consumer root(s).`
)
