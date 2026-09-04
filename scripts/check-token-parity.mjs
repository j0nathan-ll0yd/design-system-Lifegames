#!/usr/bin/env node
// mantle-cli-output: token parity check report for stdout
/**
 * Token Parity Check — P1 cross-platform token contract (GOVERNANCE.md §5).
 *
 * Verifies that color hex values resolve IDENTICALLY across the two
 * platform token outputs for both primitive-tier (accent-*, neon-*) and
 * semantic-tier roles (surface-*, text-*, border-*, health-*, sleep-*,
 * podium-*, status-*). Per F-006, semantic-tier roles are first-class
 * parity citizens — they are the surface the consumer actually paints
 * with.
 *
 *   Web:   packages/tokens/dist/tokens.css  — `--lg-color-{role}: #rrggbb;`
 *   Swift: Sources/LifegamesTokens/Resources/Colors.xcassets/color-{role}.colorset/Contents.json
 *          (sRGB float components → hex)
 *
 * Comparison key: the color role (e.g. `surface-base`, `accent-pink`).
 * For each role present in both outputs, the resolved hex must match.
 *
 * Allow-list mechanism (F-006):
 *   tokens/parity-exceptions.json — JSON array of role strings whose
 *   cross-platform divergence is intentional (e.g. platform-specific
 *   semantic mapping). Listed roles are EXCLUDED from mismatch failures
 *   but still printed in the parity table for visibility.
 *
 * Usage:
 *   node scripts/check-token-parity.mjs           — print parity table, exit 0
 *   node scripts/check-token-parity.mjs --check   — print parity table, exit 1 on mismatches
 *
 * `compareTokenParity({root})` is exported so the known-answer suite
 * (check-token-parity.test.mjs) can point the comparison at a temp fixture tree.
 * The root is an explicit ARGUMENT, deliberately not an environment variable —
 * same reasoning as check-swift-widget-purity.mjs.
 *
 * AN EMPTY SIDE IS A VIOLATION, not a clean run. `tokens.css` is a BUILD ARTIFACT
 * — governance-gates downloads it from the `token-dist` artifact rather than
 * building it — and both loaders returned an empty Map when their source was
 * missing or unparseable. Zero roles on either side then produced zero
 * comparisons, zero mismatches and exit 0, so a build that emitted nothing, an
 * artifact that failed to download, or a renamed xcassets directory retired the
 * cross-platform contract at green. An empty side is now a blocking finding.
 */

import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_ROOT = path.resolve(import.meta.dirname, '..')

const CSS_REL = 'packages/tokens/dist/tokens.css'
const XCASSETS_REL = 'Sources/LifegamesTokens/Resources/Colors.xcassets'
const EXCEPTIONS_REL = 'tokens/parity-exceptions.json'

// Role-family prefix that the parity gate cares about. Primitive (accent/neon)
// + semantic (surface/text/border/health/sleep/podium/status). Roles outside
// this set are excluded — they're either internal helpers or surface-level
// composites not yet promoted to cross-platform parity.
const ROLE_FAMILIES = 'accent|neon|surface|text|border|health|sleep|podium|status'
const ROLE_BODY = `(?:${ROLE_FAMILIES})-[a-z0-9-]+`

// In-script skip-list (F-006 hardcoded gating) — now empty. text-primary was the
// sole entry, guarding a historical web(zinc.300)/Swift(zinc.200) divergence. That
// divergence is resolved: the semantic token resolves to zinc.300 (#f0f0f0)
// identically across the web CSS, the Swift `color-text-primary` xcasset, and
// `LGColor.textPrimary`, so the gate passes on its own. The dead skip is removed
// rather than moved to parity-exceptions.json — that file is for ACTIVE divergences,
// and exempting a matching role would silently mask a future real regression. See
// docs/adr/0006-text-primary-token-parity.md. New intentional divergences go in
// tokens/parity-exceptions.json with an ADR reference.
const HARDCODED_SKIPS = new Set([])

// ── web: parse --lg-color-{role} hex from tokens.css ────────────────────────────
/** @returns {Map<string, string>} role (e.g. "accent-pink") → "#rrggbb" */
function loadWebAccentHex(cssPath) {
  const map = new Map()
  if (!fs.existsSync(cssPath)) {
    return map
  }
  const css = fs.readFileSync(cssPath, 'utf-8')
  const re = new RegExp(`--lg-color-(${ROLE_BODY})\\s*:\\s*(#[0-9a-fA-F]{3,8})\\s*;`, 'g')
  let m
  while ((m = re.exec(css)) !== null) {
    map.set(m[1], normalizeHex(m[2]))
  }
  return map
}

// ── swift: convert color-{role}.colorset sRGB components → hex ─────────────────
/** @returns {Map<string, string>} role (e.g. "accent-pink") → "#rrggbb" */
function loadSwiftAccentHex(xcassets) {
  const map = new Map()
  if (!fs.existsSync(xcassets)) {
    return map
  }
  const dirRe = new RegExp(`^color-(${ROLE_BODY})\\.colorset$`)
  for (const entry of fs.readdirSync(xcassets)) {
    // color-accent-pink.colorset → role "accent-pink"
    const m = dirRe.exec(entry)
    if (!m) {
      continue
    }
    const role = m[1]
    const contents = path.join(xcassets, entry, 'Contents.json')
    if (!fs.existsSync(contents)) {
      continue
    }
    let parsed
    try {
      parsed = JSON.parse(fs.readFileSync(contents, 'utf-8'))
    } catch {
      continue
    }
    const color = parsed?.colors?.[0]?.color
    const comp = color?.components
    if (!comp) {
      continue
    }
    const hex = componentsToHex(comp)
    if (hex) {
      map.set(role, hex)
    }
  }
  return map
}

// sRGB component may be a float string ("0.937..."), a 0-255 string, or "0xNN".
function channelToByte(v) {
  const s = String(v).trim()
  if (/^0x[0-9a-fA-F]{1,2}$/.test(s)) {
    return parseInt(s, 16)
  }
  const num = parseFloat(s)
  if (Number.isNaN(num)) {
    return null
  }
  if (num <= 1) {
    return Math.round(num * 255)
  }
  return Math.round(num)
}

function componentsToHex(comp) {
  const r = channelToByte(comp.red)
  const g = channelToByte(comp.green)
  const b = channelToByte(comp.blue)
  if (r === null || g === null || b === null) {
    return null
  }
  return (
    '#' + [r, g, b].map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')).join('')
  )
}

// Expand #rgb → #rrggbb, drop alpha, lowercase.
function normalizeHex(hex) {
  let h = hex.toLowerCase()
  if (/^#[0-9a-f]{3}$/.test(h)) {
    h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]
  }
  if (/^#[0-9a-f]{8}$/.test(h)) {
    h = h.slice(0, 7) // drop alpha
  }
  if (/^#[0-9a-f]{4}$/.test(h)) {
    h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]
  }
  return h
}

function loadExceptions(exceptionsPath) {
  if (!fs.existsSync(exceptionsPath)) {
    return new Set()
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(exceptionsPath, 'utf-8'))
    if (!Array.isArray(parsed)) {
      return new Set()
    }
    return new Set(parsed.filter((s) => typeof s === 'string'))
  } catch {
    return new Set()
  }
}

/**
 * Compare the web and Swift color outputs role by role.
 *
 * @param {{root?: string}} [options]
 * @returns {{web: Map<string, string>, swift: Map<string, string>, sortedRoles: string[], mismatches: object[], exemptedMismatches: object[], webOnly: string[], swiftOnly: string[], exceptions: Set<string>, fileExceptions: Set<string>, emptySources: string[], violations: string[]}}
 */
export function compareTokenParity({root = DEFAULT_ROOT} = {}) {
  const web = loadWebAccentHex(path.join(root, CSS_REL))
  const swift = loadSwiftAccentHex(path.join(root, XCASSETS_REL))
  const fileExceptions = loadExceptions(path.join(root, EXCEPTIONS_REL))
  const exceptions = new Set([...fileExceptions, ...HARDCODED_SKIPS])

  // A side with zero roles cannot disagree with anything. Report it rather than
  // letting the comparison loop run zero times and call that parity.
  const emptySources = []
  if (web.size === 0) {
    emptySources.push(CSS_REL)
  }
  if (swift.size === 0) {
    emptySources.push(XCASSETS_REL)
  }

  const allRoles = new Set([...web.keys(), ...swift.keys()])
  const sortedRoles = [...allRoles].sort()

  const mismatches = []
  const exemptedMismatches = []
  const webOnly = []
  const swiftOnly = []

  for (const role of sortedRoles) {
    const w = web.get(role)
    const s = swift.get(role)
    if (w && s) {
      if (w === s) {
        continue
      }
      if (exceptions.has(role)) {
        exemptedMismatches.push({role, web: w, swift: s})
      } else {
        mismatches.push({role, web: w, swift: s})
      }
    } else if (w && !s) {
      webOnly.push(role)
    } else {
      swiftOnly.push(role)
    }
  }

  const violations = [
    ...emptySources.map((rel) => `empty-parity-source: ${rel} yielded zero color roles — the comparison would otherwise run zero times and report parity`),
    ...mismatches.map((m) => `p1-hex-divergence: ${m.role} web ${m.web} != swift ${m.swift}`)
  ]

  return {web, swift, sortedRoles, mismatches, exemptedMismatches, webOnly, swiftOnly, exceptions, fileExceptions, emptySources, violations}
}

/** The per-role verdict rendered in the parity table. */
function matchLabel(result, role) {
  const w = result.web.get(role)
  const s = result.swift.get(role)
  if (w && s) {
    if (w === s) {
      return 'YES'
    }
    return result.exceptions.has(role) ? 'EXEMPT' : 'NO'
  }
  return w ? 'web-only' : 'swift-only'
}

// Importing this module for the known-answer suite must not print a report or
// call process.exit.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const checkMode = process.argv.includes('--check')
  const result = compareTokenParity()
  const {web, swift, sortedRoles, mismatches, exemptedMismatches, webOnly, swiftOnly, exceptions, fileExceptions} = result

  console.log('Token Parity Check — P1 cross-platform contract (primitive + semantic tiers)')
  console.log('===========================================================================\n')
  console.log(`Role families: ${ROLE_FAMILIES}`)
  console.log(`Web source:    ${CSS_REL} (${web.size} roles)`)
  console.log(`Swift source:  Colors.xcassets color-*.colorset (${swift.size} roles)`)
  console.log(
    `Exceptions:    ${exceptions.size} role(s) excluded from gating ` +
      `(${fileExceptions.size} from ${EXCEPTIONS_REL} + ` +
      `${HARDCODED_SKIPS.size} hardcoded)\n`
  )

  const cols = ['Role', 'Web hex', 'Swift hex', 'Match']
  const widths = [22, 10, 11, 8]
  console.log(cols.map((c, i) => c.padEnd(widths[i])).join(' '))
  console.log(cols.map((_, i) => '-'.repeat(widths[i])).join(' '))

  for (const role of sortedRoles) {
    console.log([
      role.padEnd(widths[0]),
      String(web.get(role) ?? '-').padEnd(widths[1]),
      String(swift.get(role) ?? '-').padEnd(widths[2]),
      matchLabel(result, role).padEnd(widths[3])
    ].join(' '))
  }

  console.log('\nCounts')
  console.log('------')
  console.log(`Roles in both:      ${sortedRoles.length - webOnly.length - swiftOnly.length}`)
  console.log(`Hex mismatches:     ${mismatches.length}`)
  console.log(`Exempted mismatches:${exemptedMismatches.length}`)
  console.log(`Web-only roles:     ${webOnly.length}${webOnly.length ? ' (' + webOnly.join(', ') + ')' : ''}`)
  console.log(`Swift-only roles:   ${swiftOnly.length}${swiftOnly.length ? ' (' + swiftOnly.join(', ') + ')' : ''}`)

  if (exemptedMismatches.length > 0) {
    console.log('\nExempted divergences (recorded in parity-exceptions.json or HARDCODED_SKIPS):')
    for (const m of exemptedMismatches) {
      console.log(`  ${m.role}: web ${m.web} != swift ${m.swift}  [allowed]`)
    }
  }

  if (result.violations.length > 0) {
    console.error(`\nP1 PARITY VIOLATIONS: ${result.violations.length}`)
    for (const v of result.violations) {
      console.error(`  ✗ ${v}`)
    }
    console.error('\nTo intentionally allow a role to diverge, add it to tokens/parity-exceptions.json')
    console.error('with an ADR reference in the same PR.')
  }

  // ── exit code ───────────────────────────────────────────────────────────────
  // --check: exit 1 on a non-exempted hex mismatch OR an empty side (blocking
  // gate). Without the flag: exit 0.
  process.exit(checkMode && result.violations.length > 0 ? 1 : 0)
}
