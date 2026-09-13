#!/usr/bin/env node
// mantle-cli-output: governance promotion check report for stdout
/**
 * Promotion Check — P4 last-responsible-moment admission gate (GOVERNANCE.md §5).
 *
 * Reads both widget registries and evaluates each promoted widget against P4/P7:
 *   - consumers.length === 0 && !plannedSurface  → INCUBATING (valid, logged at INFO)
 *   - consumers.length === 1 && !plannedSurface  → advisory note (lower priority)
 *   - status === "Stable" && consumers.length < 2 → BLOCKING (P7 Stable gate is >=2 surfaces)
 *
 * Incubating widgets (0 consumers, no plannedSurface) are a valid state — they are
 * actively developed but not yet wired to a product surface. They do NOT count as
 * violations. The gate fails on P7 violations only (--check + BLOCKING mode).
 *
 * Registries:
 *   - Sources/LifegamesWidgets/Resources/production-widgets.json  (Swift + web, R7)
 *   - widget-consumers.json `widgets` array                       (web, R6)
 *
 * Usage:
 *   node audits/checks/d3-promotion.mjs           — print summary table + counts
 *   node audits/checks/d3-promotion.mjs --check   — same; exit code governed by BLOCKING flag
 *
 * Showcase / preview / watch-stub importers are excluded from the consumer count
 * upstream (the registries record only real product surfaces per the census).
 *
 * `evaluatePromotion({root})` is exported so the known-answer suite
 * (check-promotion.test.mjs) can point the evaluation at a temp fixture tree. The
 * root is an explicit ARGUMENT, deliberately not an environment variable — same
 * reasoning as check-swift-widget-purity.mjs.
 *
 * AN ABSENT REGISTRY IS A VIOLATION, not an empty corpus. Both registry paths used
 * to degrade to `[]` when the file was missing, so a rename, a move, or a build that
 * failed to emit one left the gate evaluating ZERO entries and exiting 0 — the P7
 * admission gate can be retired by deleting the thing it reads. A registry that does
 * not resolve is now a blocking finding of its own.
 */

import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_ROOT = path.resolve(import.meta.dirname, '..', '..')

// ── ADVISORY MODE TOGGLE ──────────────────────────────────────────────────────
// BLOCKING = true: exit 1 when P7 violations are found (--check mode).
// Incubating widgets (0 consumers, no plannedSurface) are valid — they do not
// count as violations.
const BLOCKING = true

const SWIFT_REGISTRY = 'Sources/LifegamesWidgets/Resources/production-widgets.json'
const WEB_REGISTRY = 'widget-consumers.json'

function readJSON(root, relativePath) {
  const fullPath = path.join(root, relativePath)
  if (!fs.existsSync(fullPath)) {
    return null
  }
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8'))
}

// Normalize both registries into a common shape for evaluation.
function normalize(entry, sourceLabel) {
  const platform = entry.platform || (sourceLabel === WEB_REGISTRY ? 'web' : 'web')
  return {
    name: entry.name,
    platform,
    source: sourceLabel,
    consumers: Array.isArray(entry.consumers) ? entry.consumers : [],
    status: entry.status ?? null,
    plannedSurface: entry.plannedSurface ?? null
  }
}

/**
 * Evaluate P4/P7 admission over both widget registries.
 *
 * @param {{root?: string}} [options]
 * @returns {{entries: object[], incubating: object[], oneSurfaceAdvisory: object[], stableAdvisory: object[], missingRegistries: string[], swiftCount: number, webCount: number, violations: string[]}}
 */
export function evaluatePromotion({root = DEFAULT_ROOT} = {}) {
  const missingRegistries = []

  const swiftRaw = readJSON(root, SWIFT_REGISTRY)
  if (swiftRaw === null) {
    missingRegistries.push(SWIFT_REGISTRY)
  }
  const webRaw = readJSON(root, WEB_REGISTRY)
  if (webRaw === null) {
    missingRegistries.push(WEB_REGISTRY)
  }

  const swiftRegistry = Array.isArray(swiftRaw) ? swiftRaw : []
  const webWidgets = webRaw && Array.isArray(webRaw.widgets) ? webRaw.widgets : []

  const entries = [
    ...swiftRegistry.map((e) => normalize(e, SWIFT_REGISTRY)),
    ...webWidgets.map((e) => normalize(e, WEB_REGISTRY))
  ]

  const incubating = [] // 0 surfaces, no plannedSurface — valid incubating state (INFO)
  const oneSurfaceAdvisory = [] // 1 surface, no plannedSurface — lower priority
  const stableAdvisory = [] // status Stable but < 2 surfaces — P7 violation

  for (const e of entries) {
    const n = e.consumers.length
    if (n === 0 && !e.plannedSurface) {
      incubating.push(e)
    } else if (n === 1 && !e.plannedSurface) {
      oneSurfaceAdvisory.push(e)
    }
    if (e.status === 'Stable' && n < 2) {
      stableAdvisory.push(e)
    }
  }

  const violations = [
    ...missingRegistries.map((rel) => `missing-registry: ${rel} does not exist — the gate would otherwise evaluate zero entries and report clean`),
    ...stableAdvisory.map((e) => `p7-stable-under-two-surfaces: [${e.platform}] ${e.name} (${e.source}) is Stable with ${e.consumers.length} surface(s)`)
  ]

  return {
    entries,
    incubating,
    oneSurfaceAdvisory,
    stableAdvisory,
    missingRegistries,
    swiftCount: swiftRegistry.length,
    webCount: webWidgets.length,
    violations
  }
}

function findingLabel(e) {
  const n = e.consumers.length
  if (n === 0 && !e.plannedSurface) {
    return 'incubating'
  }
  if (n === 1 && !e.plannedSurface) {
    return 'advisory (1 surf)'
  }
  if (e.status === 'Stable' && n < 2) {
    return 'advisory (stable)'
  }
  return 'ok'
}

// Importing this module for the known-answer suite must not print a report or
// call process.exit.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const checkMode = process.argv.includes('--check')
  const result = evaluatePromotion()

  console.log('Promotion Check — P4 admission gate')
  console.log('====================================\n')
  console.log(`Mode: ${BLOCKING ? 'BLOCKING' : 'ADVISORY (exit 0)'}`)
  console.log(`Registries: production-widgets.json (${result.swiftCount}), widget-consumers.json widgets[] (${result.webCount})`)
  console.log(`Total promoted entries evaluated: ${result.entries.length}\n`)

  const cols = ['Widget', 'Platform', 'Surfaces', 'Status', 'Finding']
  const widths = [30, 9, 9, 13, 18]
  console.log(cols.map((c, i) => c.padEnd(widths[i])).join(' '))
  console.log(cols.map((_, i) => '-'.repeat(widths[i])).join(' '))

  for (const e of result.entries) {
    console.log([
      e.name.padEnd(widths[0]),
      e.platform.padEnd(widths[1]),
      String(e.consumers.length).padEnd(widths[2]),
      String(e.status ?? '-').padEnd(widths[3]),
      findingLabel(e).padEnd(widths[4])
    ].join(' '))
  }

  console.log('\nCounts')
  console.log('------')
  console.log(`Incubating (0 surfaces, no plannedSurface — valid): ${result.incubating.length}`)
  console.log(`Advisory (1 surface, no plannedSurface):            ${result.oneSurfaceAdvisory.length}`)
  console.log(`Advisory (status Stable but < 2 surfaces):          ${result.stableAdvisory.length}`)

  if (result.incubating.length > 0) {
    console.log('\nIncubating widgets (no violation — developing toward first surface):')
    for (const e of result.incubating) {
      console.log(`  [${e.platform}] ${e.name} (${e.source})`)
    }
  }

  if (result.violations.length > 0) {
    console.error(`\nPROMOTION VIOLATIONS: ${result.violations.length}`)
    for (const v of result.violations) {
      console.error(`  ✗ ${v}`)
    }
  }

  // ── exit code ───────────────────────────────────────────────────────────────
  // Incubating widgets (0 consumers, no plannedSurface) are not a gate failure.
  // A P7 violation and an unreadable registry both are.
  process.exit(checkMode && BLOCKING && result.violations.length > 0 ? 1 : 0)
}
