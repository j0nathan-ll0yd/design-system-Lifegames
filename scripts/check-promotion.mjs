#!/usr/bin/env node
// mantle-cli-output: governance promotion check report for stdout
/**
 * Promotion Check — P4 last-responsible-moment admission gate (GOVERNANCE.md §5).
 *
 * Reads both widget registries and evaluates each promoted widget against P4/P7:
 *   - consumers.length === 0 && !plannedSurface  → INCUBATING (valid, logged at INFO)
 *   - consumers.length === 1 && !plannedSurface  → advisory note (lower priority)
 *   - status === "Stable" && consumers.length < 2 → advisory (P7 Stable gate is >=2 surfaces)
 *
 * Incubating widgets (0 consumers, no plannedSurface) are a valid state — they are
 * actively developed but not yet wired to a product surface. They do NOT count as
 * violations. The gate only fails on structural inconsistency (--check + BLOCKING mode).
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
// BLOCKING = true: exit 1 when structural inconsistencies are found (--check mode).
// Incubating widgets (0 consumers, no plannedSurface) are valid — they do not
// count as violations. Only structural inconsistency triggers a non-zero exit.
const BLOCKING = true;

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
const incubating = []; // 0 surfaces, no plannedSurface — valid incubating state (INFO)
const oneSurfaceAdvisory = []; // 1 surface, no plannedSurface — lower priority
const stableAdvisory = []; // status Stable but < 2 surfaces

for (const e of entries) {
  const n = e.consumers.length;
  if (n === 0 && !e.plannedSurface) {
    incubating.push(e);
  } else if (n === 1 && !e.plannedSurface) {
    oneSurfaceAdvisory.push(e);
  }
  if (e.status === 'Stable' && n < 2) {
    stableAdvisory.push(e);
  }
}

// ── report ──────────────────────────────────────────────────────────────────────
console.log('Promotion Check — P4 admission gate');
console.log('====================================\n');
console.log(`Mode: ${BLOCKING ? 'BLOCKING' : 'ADVISORY (exit 0)'}`);
console.log(`Registries: production-widgets.json (${swiftRegistry.length}), widget-consumers.json widgets[] (${webWidgets.length})`);
console.log(`Total promoted entries evaluated: ${entries.length}\n`);

const cols = ['Widget', 'Platform', 'Surfaces', 'Status', 'Finding'];
const widths = [30, 9, 9, 13, 18];
console.log(cols.map((c, i) => c.padEnd(widths[i])).join(' '));
console.log(cols.map((_, i) => '-'.repeat(widths[i])).join(' '));

function findingLabel(e) {
  const n = e.consumers.length;
  if (n === 0 && !e.plannedSurface) return 'incubating';
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
console.log(`Incubating (0 surfaces, no plannedSurface — valid): ${incubating.length}`);
console.log(`Advisory (1 surface, no plannedSurface):            ${oneSurfaceAdvisory.length}`);
console.log(`Advisory (status Stable but < 2 surfaces):          ${stableAdvisory.length}`);

if (incubating.length > 0) {
  console.log('\nIncubating widgets (no violation — developing toward first surface):');
  for (const e of incubating) {
    console.log(`  [${e.platform}] ${e.name} (${e.source})`);
  }
}

// ── exit code ─────────────────────────────────────────────────────────────────
// Incubating widgets (0 consumers, no plannedSurface) are not a gate failure.
// stableAdvisory entries are genuine P7 violations (Stable but < 2 surfaces).
// BLOCKING + --check: exit 1 when P7 violations exist.
const hasViolations = stableAdvisory.length > 0;
process.exit(CHECK_MODE && BLOCKING && hasViolations ? 1 : 0);
