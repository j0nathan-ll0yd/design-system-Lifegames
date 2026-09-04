#!/usr/bin/env node
// mantle-cli-output: watch exclusions check report for stdout
/**
 * Watch Exclusions Check — F-014 (GOVERNANCE.md P-Watch).
 *
 * The Watch target deliberately excludes heavyweight or sensor-dependent
 * widgets/components that have no business running on watchOS. Two classes
 * of widget are currently disallowed:
 *
 *   1. ECG       — the ECG view is sensor + chart-heavy; not appropriate on
 *                  watchOS where battery and real-estate are scarce.
 *   2. PulsingMapMarker — depends on MapKit and a coordinate stream; not
 *                  supported in the Watch DS surface.
 *
 * If a file lands under Sources/LifegamesComponentsWatch/ OR
 * Sources/LifegamesWidgetsWatch/ whose filename mentions either symbol,
 * OR a Swift source under those targets imports either symbol by name,
 * this script reports it as a violation.
 *
 * Usage:
 *   node audits/checks/d3-watch-exclusions.mjs          — print findings, exit 0
 *   node audits/checks/d3-watch-exclusions.mjs --check  — print findings, exit 1 on violations
 *
 * `scanWatchExclusions({root})` is exported so the known-answer suite
 * (check-watch-exclusions.test.mjs) can point the scan at a temp fixture tree.
 * The root is an explicit ARGUMENT, deliberately not an environment variable —
 * same reasoning as check-swift-widget-purity.mjs: a gate whose corpus can be
 * relocated from the environment can be aimed at an empty directory and told
 * to report success.
 *
 * MISSING CORPUS IS A VIOLATION, not silence. Both scan roots are directories in
 * this repo; when one is absent the gate has nothing to read and its previous
 * behaviour was to walk zero files and exit 0. Renaming or moving a Watch target
 * would therefore have retired this gate at exit 0, with no finding. A declared
 * root that does not resolve is now a blocking finding of its own.
 */

import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_ROOT = path.resolve(import.meta.dirname, '..', '..')

const WATCH_DIRS = ['Sources/LifegamesComponentsWatch', 'Sources/LifegamesWidgetsWatch']

const FORBIDDEN_SYMBOLS = ['ECG', 'PulsingMapMarker']

// Match the symbol as a whole identifier — avoid false hits on prefixes
// (e.g. "ECGEncoded" would match; "ECGV2" still matches; "GECG" would not).
// We intentionally allow suffixes because the exclusion is by family, not exact name.
const SYMBOL_REGEXES = FORBIDDEN_SYMBOLS.map((s) => ({symbol: s, re: new RegExp(`\\b${s}\\w*`, 'g')}))

function walk(dir, ext) {
  const results = []
  if (!fs.existsSync(dir)) {
    return results
  }
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walk(full, ext))
    } else if (entry.name.endsWith(ext)) {
      results.push(full)
    }
  }
  return results
}

/**
 * Scan the Watch targets for excluded symbols.
 *
 * @param {{root?: string}} [options]
 * @returns {{findings: Array<{kind: string, file: string, symbol: string, line: number | null, text: string}>, missingDirs: string[], scannedFileCount: number, dirs: string[]}}
 */
export function scanWatchExclusions({root = DEFAULT_ROOT} = {}) {
  const findings = []
  const missingDirs = []
  let scannedFileCount = 0

  for (const relDir of WATCH_DIRS) {
    const dir = path.join(root, relDir)
    if (!fs.existsSync(dir)) {
      missingDirs.push(relDir)
      findings.push({
        kind: 'missing-scan-root',
        file: relDir,
        symbol: '(corpus)',
        line: null,
        text: `declared Watch scan root ${relDir} does not exist — the gate would otherwise walk zero files and report clean`
      })
      continue
    }
    for (const file of walk(dir, '.swift')) {
      scannedFileCount++
      const rel = path.relative(root, file)
      const basename = path.basename(file)

      // Filename check
      for (const symbol of FORBIDDEN_SYMBOLS) {
        if (basename.includes(symbol)) {
          findings.push({kind: 'filename', file: rel, symbol, line: null, text: basename})
        }
      }

      // Source-content check (imports + symbol references)
      const src = fs.readFileSync(file, 'utf-8')
      const lines = src.split('\n')
      lines.forEach((text, idx) => {
        for (const {symbol, re} of SYMBOL_REGEXES) {
          re.lastIndex = 0
          if (re.test(text)) {
            findings.push({kind: 'reference', file: rel, symbol, line: idx + 1, text: text.trim()})
          }
        }
      })
    }
  }

  return {findings, missingDirs, scannedFileCount, dirs: [...WATCH_DIRS]}
}

// Importing this module for the known-answer suite must not print a report or
// call process.exit.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const checkMode = process.argv.includes('--check')
  const {findings, scannedFileCount} = scanWatchExclusions()

  console.log('Watch Exclusions Check — F-014')
  console.log('==============================\n')
  console.log(`Scanned dirs: ${WATCH_DIRS.join(', ')} (${scannedFileCount} Swift file(s))`)
  console.log(`Forbidden symbols: ${FORBIDDEN_SYMBOLS.join(', ')}\n`)

  if (findings.length === 0) {
    console.log('No Watch exclusion violations. ECG / PulsingMapMarker are absent from Watch targets.')
  } else {
    console.log(`WATCH EXCLUSION VIOLATIONS: ${findings.length} hit(s):\n`)
    for (const v of findings) {
      const loc = v.line ? `${v.file}:${v.line}` : v.file
      console.log(`  ${loc}  [${v.kind} / ${v.symbol}]`)
      console.log(`    ${v.text}`)
    }
    console.log('\nThese symbols are explicitly excluded from the Watch DS surface.')
    console.log('If a Watch-appropriate variant is needed, ship it under a new name.')
  }

  process.exit(checkMode && findings.length > 0 ? 1 : 0)
}
