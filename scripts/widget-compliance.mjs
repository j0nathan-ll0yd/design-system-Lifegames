#!/usr/bin/env node
// mantle-cli-output: compliance matrix report for stdout
/**
 * Widget Compliance Matrix — Design System Edition
 *
 * Reads production-widgets.json as the authoritative registry and checks
 * each widget against the codebase (astro files, fixtures, manifest).
 *
 * Usage: node scripts/widget-compliance.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

function readJSON(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

const registry = readJSON('Sources/LifegamesWidgets/Resources/production-widgets.json');
if (!registry) {
  console.error('ERROR: production-widgets.json not found');
  process.exit(1);
}

const manifest = readJSON('Sources/LifegamesWidgets/Resources/widgets/widget-manifest.json');
const manifestByName = new Map();
if (manifest) {
  for (const w of manifest.widgets) {
    manifestByName.set(w.name, w);
  }
}
// Also index by the V3-suffixed names used in production-widgets.json
// since manifest uses shorter names (e.g. "PlaceLeaderboard" vs "PlaceLeaderboardV3")
const MANIFEST_ALIASES = {
  PlaceLeaderboardV3: 'PlaceLeaderboard',
  ExplorationOdometerV3: 'ExplorationOdometer',
};

console.log('Widget Compliance Matrix (Design System)');
console.log('========================================\n');

const cols = ['Widget', 'Status', 'Astro', 'Fixture', 'Manifest'];
const widths = [28, 10, 7, 9, 10];

console.log(cols.map((c, i) => c.padEnd(widths[i])).join(' '));
console.log(cols.map((_, i) => '-'.repeat(widths[i])).join(' '));

let gaps = 0;

registry.forEach(widget => {
  const astroExists = fileExists(`packages/web/src/widgets/${widget.fileRelativeToWidgets}`);
  const manifestKey = MANIFEST_ALIASES[widget.name] || widget.name;
  const manifestEntry = manifestByName.get(manifestKey);
  const inManifest = !!manifestEntry;

  let hasFixture = false;
  if (manifestEntry) {
    hasFixture = fileExists(`Sources/LifegamesWidgets/Resources/widgets/${manifestEntry.fixturePath}`);
  } else {
    const category = widget.fileRelativeToWidgets.split('/')[0];
    const kebabName = widget.name.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/V(\d)/g, '-v$1').toLowerCase();
    hasFixture = fileExists(`Sources/LifegamesWidgets/Resources/widgets/${category}/${kebabName}.json`);
  }

  if (!astroExists || !hasFixture || !inManifest) gaps++;

  console.log([
    widget.name.padEnd(widths[0]),
    widget.status.padEnd(widths[1]),
    (astroExists ? 'YES' : 'NO').padEnd(widths[2]),
    (hasFixture ? 'YES' : 'NO').padEnd(widths[3]),
    (inManifest ? 'YES' : 'NO').padEnd(widths[4]),
  ].join(' '));
});

console.log(`\nTotal: ${registry.length} widgets (${registry.filter(w => w.status === 'shipped').length} shipped, ${registry.filter(w => w.status === 'dev-only').length} dev-only)`);

if (gaps > 0) {
  console.log(`\n${gaps} widget(s) have compliance gaps.`);
  process.exit(1);
}

console.log('\nAll widgets compliant.');
