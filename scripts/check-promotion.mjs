#!/usr/bin/env node
// mantle-cli-output: governance promotion check report for stdout
/**
 * Promotion Check — P4 last-responsible-moment admission gate (GOVERNANCE.md §5).
 *
 * Reads both widget registries and evaluates each promoted widget against P4/P7:
 *   - consumers.length === 0 && !plannedSurface  → DEMOTE-OR-JUSTIFY finding
 *   - consumers.length === 1 && !plannedSurface  → advisory note (lower priority)
 *   - status === "Stable" && consumers.length < 2 → advisory (P7 Stable gate is >=2 surfaces)
 *
 * Registries:
 *   - Sources/LifegamesWidgets/Resources/production-widgets.json  (Swift + web, R7)
 *   - widget-consumers.json `widgets` array                       (web, R6)
 *
 * Usage:
 *   node scripts/check-promotion.mjs           — print summary table + counts
 *   node scripts/check-promotion.mjs --check   — same; exit code governed by BLOCKING flag
 *
 * Showcase / preview / watch-stub importers are excluded from the consumer count
 * upstream (the registries record only real product surfaces per the census).
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CHECK_MODE = process.argv.includes('--check');

// ── ADVISORY MODE TOGGLE ──────────────────────────────────────────────────────
// BLOCKING = false: print findings and exit 0 (advisory). This is the current
// posture while the demotion triage is pending. Flip to true ONLY after the
// 0-surface widgets have been demoted or given an explicit `plannedSurface`
// justification, so the gate does not break the build on day one.
const BLOCKING = false;

function readJSON(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
}

// ── load registries ───────────────────────────────────────────────────────────
const swiftRegistry = readJSON('Sources/LifegamesWidgets/Resources/production-widgets.json') ?? [];
const webManifest = readJSON('widget-consumers.json');
const webWidgets = (webManifest && Array.isArray(webManifest.widgets)) ? webManifest.widgets : [];

// Normalize both registries into a common shape for evaluation.
function normalize(entry, sourceLabel) {
  const platform = entry.platform || (sourceLabel === 'widget-consumers.json' ? 'web' : 'web');
  return {
    name: entry.name,
    platform,
    source: sourceLabel,
    consumers: Array.isArray(entry.consumers) ? entry.consumers : [],
    status: entry.status ?? null,
    plannedSurface: entry.plannedSurface ?? null,
  };
}

const entries = [
  ...swiftRegistry.map((e) => normalize(e, 'production-widgets.json')),
  ...webWidgets.map((e) => normalize(e, 'widget-consumers.json')),
];

// ── evaluate P4 / P7 ────────────────────────────────────────────────────────────
const demoteOrJustify = []; // 0 surfaces, no plannedSurface — highest priority
const oneSurfaceAdvisory = []; // 1 surface, no plannedSurface — lower priority
const stableAdvisory = []; // status Stable but < 2 surfaces

for (const e of entries) {
  const n = e.consumers.length;
  if (n === 0 && !e.plannedSurface) {
    demoteOrJustify.push(e);
  } else if (n === 1 && !e.plannedSurface) {
    oneSurfaceAdvisory.push(e);
  }
  if (e.status === 'Stable' && n < 2) {
    stableAdvisory.push(e);
  }
}

// ── report ──────────────────────────────────────────────────────────────────────
console.log('Promotion Check — P4 admission gate (advisory mode)');
console.log('===================================================\n');
console.log(`Mode: ${BLOCKING ? 'BLOCKING' : 'ADVISORY (exit 0)'}`);
console.log(`Registries: production-widgets.json (${swiftRegistry.length}), widget-consumers.json widgets[] (${webWidgets.length})`);
console.log(`Total promoted entries evaluated: ${entries.length}\n`);

const cols = ['Widget', 'Platform', 'Surfaces', 'Status', 'Finding'];
const widths = [30, 9, 9, 13, 18];
console.log(cols.map((c, i) => c.padEnd(widths[i])).join(' '));
console.log(cols.map((_, i) => '-'.repeat(widths[i])).join(' '));

function findingLabel(e) {
  const n = e.consumers.length;
  if (n === 0 && !e.plannedSurface) return 'DEMOTE-OR-JUSTIFY';
  if (n === 1 && !e.plannedSurface) return 'advisory (1 surf)';
  if (e.status === 'Stable' && n < 2) return 'advisory (stable)';
  return 'ok';
}

for (const e of entries) {
  console.log([
    e.name.padEnd(widths[0]),
    e.platform.padEnd(widths[1]),
    String(e.consumers.length).padEnd(widths[2]),
    String(e.status ?? '-').padEnd(widths[3]),
    findingLabel(e).padEnd(widths[4]),
  ].join(' '));
}

console.log('\nCounts');
console.log('------');
console.log(`DEMOTE-OR-JUSTIFY (0 surfaces, no plannedSurface): ${demoteOrJustify.length}`);
console.log(`Advisory (1 surface, no plannedSurface):           ${oneSurfaceAdvisory.length}`);
console.log(`Advisory (status Stable but < 2 surfaces):         ${stableAdvisory.length}`);

if (demoteOrJustify.length > 0) {
  console.log('\nDEMOTE-OR-JUSTIFY widgets:');
  for (const e of demoteOrJustify) {
    console.log(`  [${e.platform}] ${e.name} (${e.source})`);
  }
}

// ── exit code ─────────────────────────────────────────────────────────────────
if (CHECK_MODE && BLOCKING && demoteOrJustify.length > 0) {
  console.error(`\nERROR: ${demoteOrJustify.length} widget(s) have 0 product surfaces and no plannedSurface justification.`);
  process.exit(1);
}
// Advisory mode (or non-check): always exit 0.
process.exit(0);
