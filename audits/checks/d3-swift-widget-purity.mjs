#!/usr/bin/env node
// mantle-cli-output: Swift widget purity check report for stdout
/**
 * Swift Widget Purity Check — P3 presentational-purity boundary (GOVERNANCE.md §5).
 *
 * Scans every Sources/LifegamesWidgets/**\/*.swift (and, for the F-015
 * color/UIKit detections, Sources/LifegamesComponents/**\/*.swift and
 * Sources/LifegamesComponentsCore/**\/*.swift) for presentational-purity
 * violations.
 *
 * Detections
 * ──────────
 * 1. Forbidden module imports — widgets + components:
 *      import ComposableArchitecture | HealthKit | CoreLocation |
 *      APIClient | SharedModels
 *    GOVERNANCE.md §5 P3 draws this boundary around "a DS component", not
 *    around the widget tree alone, and the scan now matches: it walks the same
 *    corpus the color detections already walked.
 *
 * 2. Raw color literals (F-015) — widgets + components:
 *      Color(hex: "#…")             — hardcoded hex color
 *      Color(red: …, green: …, blue: …)  — hardcoded sRGB triple
 *    Generated tokens under Sources/LifegamesTokens/ are exempt by location.
 *    Specific Color(hex:) sites whose value comes from runtime data may be
 *    listed in widget-purity-exceptions.json (top-level "colorHex" array of
 *    {file, line, reason}) — they are still reported but do not fail --check.
 *    The `reason` is REQUIRED and must be non-empty: the exceptions file has
 *    always told its authors "Reason MUST explain why the raw color is
 *    required", and the gate now holds them to it. An entry with a missing or
 *    blank reason does not exempt anything and is itself a blocking finding —
 *    an unexplained exemption is a suppression wearing a record's clothes.
 *
 * 3. UIKit + SwiftUI co-import (F-015):
 *    A widget/component file that imports BOTH SwiftUI and UIKit. UIKit on
 *    its own is fine; mixing the two in a presentational widget is the
 *    smell — it almost always means the widget is reaching for a UIKit
 *    affordance instead of staying pure SwiftUI.
 *
 * Usage:
 *   node audits/checks/d3-swift-widget-purity.mjs           — print findings, exit 0
 *   node audits/checks/d3-swift-widget-purity.mjs --check   — exit 1 on un-exempted violations
 *
 * `scanPurity({root})` is exported so the known-answer suite
 * (d3-swift-widget-purity.test.mjs) can point the scan at a temp fixture
 * tree. The root is an explicit ARGUMENT, deliberately not an environment
 * variable: an env var that relocates a gate's corpus is a thaw switch, and a
 * gate pointed at an empty directory reports "no findings" and exits 0.
 */

import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_ROOT = path.resolve(import.meta.dirname, '..', '..')

// Forbidden imports. Each entry: { label, pattern } where pattern is matched
// against each source line. `import X` for modules; APIClient/SharedModels are
// matched as `import <Module>` only (a type reference alone is not an import).
const FORBIDDEN_IMPORTS = [
  {label: 'ComposableArchitecture (TCA)', re: /^\s*import\s+ComposableArchitecture\b/},
  {label: 'HealthKit', re: /^\s*import\s+HealthKit\b/},
  {label: 'CoreLocation', re: /^\s*import\s+CoreLocation\b/},
  {label: 'APIClient', re: /^\s*import\s+APIClient\b/},
  {label: 'SharedModels', re: /^\s*import\s+SharedModels\b/}
]

// F-015 raw-color detections.
//
// COLOR_HEX_RE matches BOTH literal hex strings (Color(hex: "#abc")) AND
// variable/expression forms (Color(hex: someVar)). The literal form is the
// pure hardcoded violation. The variable form is the "runtime-data-driven"
// case — still surfaced because it bypasses tokens, and the allow-list lets
// us mark each legitimate site (one per data-driven swatch) so unreviewed
// sites still fail the gate.
const COLOR_HEX_RE = /\bColor\s*\(\s*hex\s*:/
const COLOR_RGB_RE = /\bColor\s*\(\s*red\s*:.*green\s*:.*blue\s*:/

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

// Allow-list: Set of "file:line" keys whose Color(hex:"#...") literal is
// intentional (runtime-data-driven). Read from widget-purity-exceptions.json;
// a missing file → empty Set.
//
// An entry exempts a site ONLY when it carries a non-empty `reason` (F10). The
// exceptions file's own $comment has always said "Reason MUST explain why the
// raw color is required" and nothing checked it, so an entry could suppress a
// finding while explaining nothing. Entries that fail the shape are returned
// as `malformed` and become blocking findings of their own — dropping them
// silently would turn a bad exemption into a green build the moment its
// Color(hex:) site also went unreported.
function loadColorHexExceptions(exceptionsPath) {
  const set = new Set()
  /** @type {{index: number; problem: string}[]} */
  const malformed = []
  if (!fs.existsSync(exceptionsPath)) {
    return {set, malformed, parseError: null}
  }
  let parsed
  try {
    parsed = JSON.parse(fs.readFileSync(exceptionsPath, 'utf-8'))
  } catch (err) {
    // An unparseable allow-list is RED, never an empty Set that passes: a
    // truncated or mis-edited file would otherwise disarm every exemption and
    // read as a clean scan.
    return {set, malformed, parseError: err.message}
  }
  const arr = Array.isArray(parsed?.colorHex) ? parsed.colorHex : []
  arr.forEach((entry, index) => {
    if (typeof entry?.file !== 'string' || !Number.isInteger(entry?.line)) {
      malformed.push({index, problem: 'entry needs a string "file" and an integer "line"'})
      return
    }
    if (typeof entry.reason !== 'string' || entry.reason.trim() === '') {
      malformed.push({index, problem: `${entry.file}:${entry.line} has no non-empty "reason"`})
      return
    }
    set.add(`${entry.file}:${entry.line}`)
  })
  return {set, malformed, parseError: null}
}

/**
 * Scan a repo tree for P3 + F-015 purity violations.
 *
 * @param {{root?: string}} [options]
 * @returns {{
 *   findings: {file: string; line: number; label: string; text: string; exempt?: boolean; blocking: boolean}[];
 *   blocking: {file: string; line: number; label: string; text: string; exempt?: boolean; blocking: boolean}[];
 *   exempted: {file: string; line: number; label: string; text: string; exempt?: boolean; blocking: boolean}[];
 *   widgetFileCount: number;
 *   componentFileCount: number;
 *   exceptionCount: number;
 * }}
 */
export function scanPurity({root = DEFAULT_ROOT} = {}) {
  const swiftWidgetFiles = walk(path.join(root, 'Sources/LifegamesWidgets'), '.swift')
  const swiftComponentFiles = [
    ...walk(path.join(root, 'Sources/LifegamesComponents'), '.swift'),
    ...walk(path.join(root, 'Sources/LifegamesComponentsCore'), '.swift')
  ]

  const {set: colorHexExceptions, malformed, parseError} = loadColorHexExceptions(path.join(root, 'widget-purity-exceptions.json'))

  const findings = []

  if (parseError) {
    findings.push({file: 'widget-purity-exceptions.json', line: 1, label: 'unparseable exceptions file', text: parseError, blocking: true})
  }
  for (const bad of malformed) {
    findings.push({
      file: 'widget-purity-exceptions.json',
      line: 1,
      label: `exemption ${bad.index} is not a usable record`,
      text: bad.problem,
      blocking: true
    })
  }

  // All three detections walk ONE corpus. GOVERNANCE.md §5 P3 says "A DS
  // component must satisfy all of the following: … no imports of app-only
  // modules"; scanning only the widget tree let a component import HealthKit
  // and pass. The color detections already walked this corpus, so widening
  // costs nothing but the loop it now shares.
  const corpus = [...swiftWidgetFiles, ...swiftComponentFiles]

  for (const file of corpus) {
    const rel = path.relative(root, file)
    const src = fs.readFileSync(file, 'utf-8')
    const lines = src.split('\n')
    const hasSwiftUI = /^\s*import\s+SwiftUI\b/m.test(src)
    const hasUIKit = /^\s*import\s+UIKit\b/m.test(src)

    lines.forEach((text, idx) => {
      const lineNo = idx + 1
      const locKey = `${rel}:${lineNo}`

      for (const f of FORBIDDEN_IMPORTS) {
        if (f.re.test(text)) {
          findings.push({file: rel, line: lineNo, label: f.label, text: text.trim(), blocking: true})
        }
      }

      if (COLOR_HEX_RE.test(text)) {
        const exempt = colorHexExceptions.has(locKey)
        findings.push({
          file: rel,
          line: lineNo,
          label: exempt ? 'Color(hex:) [exempt: runtime data]' : 'Color(hex:) raw literal',
          text: text.trim(),
          exempt,
          blocking: !exempt
        })
      }
      if (COLOR_RGB_RE.test(text)) {
        findings.push({file: rel, line: lineNo, label: 'Color(red:green:blue:) raw literal', text: text.trim(), blocking: true})
      }
    })

    if (hasSwiftUI && hasUIKit) {
      const uikitLineIdx = lines.findIndex((t) => /^\s*import\s+UIKit\b/.test(t))
      findings.push({file: rel, line: uikitLineIdx + 1, label: 'import UIKit alongside import SwiftUI', text: 'import UIKit', blocking: true})
    }
  }

  return {
    findings,
    blocking: findings.filter((f) => f.blocking),
    exempted: findings.filter((f) => f.exempt),
    widgetFileCount: swiftWidgetFiles.length,
    componentFileCount: swiftComponentFiles.length,
    exceptionCount: colorHexExceptions.size
  }
}

// ── CLI ─────────────────────────────────────────────────────────────────────────
// Only when run directly. Importing this module for the known-answer suite must
// not print a report or call process.exit.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const checkMode = process.argv.includes('--check')
  const {findings, blocking, exempted, widgetFileCount, componentFileCount, exceptionCount} = scanPurity()

  console.log('Swift Widget Purity Check — P3 + F-015')
  console.log('======================================\n')
  console.log(`Scanned widgets:    ${widgetFileCount} .swift files under Sources/LifegamesWidgets/`)
  console.log(`Scanned components: ${componentFileCount} .swift files under Sources/LifegamesComponents{,Core}/`)
  console.log(`Forbidden imports:  ${FORBIDDEN_IMPORTS.map((f) => f.label).join(', ')} (widgets AND components)`)
  console.log(`Color exceptions:   ${exceptionCount} site(s) in widget-purity-exceptions.json\n`)

  if (findings.length === 0) {
    console.log('No purity findings. All widgets and components satisfy P3 + F-015.')
  } else {
    console.log(`Findings: ${findings.length} (${blocking.length} blocking, ${exempted.length} exempted):\n`)
    for (const v of findings) {
      const tag = v.exempt ? ' [EXEMPT]' : v.blocking ? '' : ' [info]'
      console.log(`  ${v.file}:${v.line}  [${v.label}]${tag}`)
      console.log(`    ${v.text}`)
    }
    if (blocking.length > 0) {
      console.log('\nThese are genuine P3 / F-015 presentational-purity violations:')
      console.log('  - Forbidden imports → move the data dependency to the app layer.')
      console.log('  - Color(hex:) / Color(red:green:blue:) → reference a token in')
      console.log('    LifegamesTokens, or — if the value comes from runtime data —')
      console.log('    add the site to widget-purity-exceptions.json with a reason.')
      console.log('  - UIKit + SwiftUI co-import → drop UIKit and use the SwiftUI')
      console.log('    equivalent (or split the file into a SwiftUI wrapper around a')
      console.log('    pure UIKit type elsewhere).')
      console.log('  - An exemption with no non-empty "reason" is itself a finding →')
      console.log('    state why the raw color is required, or remove the entry.')
    }
  }

  // --check: exit 1 when blocking violations found. Exempted findings are not
  // blocking. Without --check, always exit 0.
  process.exit(checkMode && blocking.length > 0 ? 1 : 0)
}
