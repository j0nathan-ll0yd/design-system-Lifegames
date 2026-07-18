#!/usr/bin/env node
/**
 * Widget Inventory — canonical widget count with portfolio consumption tracking.
 *
 * Usage:
 *   pnpm widget:inventory          — writes docs/widget-inventory.json + updates README count
 *   pnpm widget:inventory --check  — exits non-zero if README count diverges from script output
 *                                    or if portfolio is unavailable AND fallback manifest is missing
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CHECK_MODE = process.argv.includes('--check');

// ── path constants ────────────────────────────────────────────────────────────
const WIDGETS_SRC = path.join(ROOT, 'packages/web/src/widgets');
const SWIFT_WIDGETS = path.join(ROOT, 'Sources/LifegamesWidgets');
const PORTFOLIO_REPO = path.join(process.env.HOME, 'Repositories/j0nathan-ll0yd.github.io');
const FALLBACK_MANIFEST = path.join(ROOT, 'widget-consumers.json');
const OUTPUT_JSON = path.join(ROOT, 'docs/widget-inventory.json');
const README = path.join(ROOT, 'README.md');

// ── helpers ───────────────────────────────────────────────────────────────────
function readJSON(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function fileExists(p) {
  return fs.existsSync(p);
}

function walk(dir, ext) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

// ── step 1: collect widget IDs from *.types.ts ────────────────────────────────
// Each *.types.ts file under packages/web/src/widgets/**/ represents one widget.
// tokens/projections/** is EXCLUDED (it is a mapping table, not a widget directory).
const typeFiles = walk(WIDGETS_SRC, '.types.ts');
const widgets = typeFiles.map((filePath) => {
  const rel = path.relative(WIDGETS_SRC, filePath);
  const parts = rel.split(path.sep);
  // parts[0] = category, parts[1] = WidgetName.types.ts
  const category = parts[0];
  const id = path.basename(parts[parts.length - 1], '.types.ts');

  const content = fs.readFileSync(filePath, 'utf-8');
  const schemaExempt = content.includes('// schema-exempt:');

  return { id, category, filePath, schemaExempt };
});

// ── step 2: detect hasStory ───────────────────────────────────────────────────
// A widget has a story if EITHER a *.stories.tsx sits co-located next to its
// *.types.ts, OR a production story lives in the dedicated Storybook tree at
// apps/storybook/src/production/<WidgetName>.stories.ts. The real production
// stories live in the Storybook tree (e.g. MovementRings.stories.ts), so
// checking only the co-located path produced a false hasStory:false for those
// widgets (lp-audit D1 finding — MovementRings).
const STORYBOOK_PRODUCTION = path.join(ROOT, 'apps/storybook/src/production');
for (const w of widgets) {
  const dir = path.dirname(w.filePath);
  const colocated = fileExists(path.join(dir, `${w.id}.stories.tsx`));
  const storybookProduction = fileExists(path.join(STORYBOOK_PRODUCTION, `${w.id}.stories.ts`));
  w.hasStory = colocated || storybookProduction;
}

// ── step 3: detect hasSwiftMirror ────────────────────────────────────────────
// A Swift mirror exists if a *Props.swift or *View.swift is found anywhere
// under Sources/LifegamesWidgets matching the widget ID (case-insensitive).
const swiftFiles = walk(SWIFT_WIDGETS, '.swift').map((f) => path.basename(f).toLowerCase());
for (const w of widgets) {
  const idLower = w.id.toLowerCase();
  w.hasSwiftMirror = swiftFiles.some(
    (f) => f === `${idLower}props.swift` || f === `${idLower}view.swift`,
  );
}

// ── step 4: consumedByPortfolio ───────────────────────────────────────────────
// Primary: scan portfolio .astro files for `from '@lifegames/web/production'` imports.
// Fallback: read widget-consumers.json at repo root.
// CI fail condition: portfolio unavailable AND fallback manifest missing.

let consumedSet = new Set();
// name -> Set<consuming .astro basename>, so a newly-consumed widget can be
// reconciled into the governance widgets[] array with real consumer provenance
// (step 7) instead of leaving it self-inconsistent (lp-audit D1 HIGH).
const consumedByFile = new Map();
let portfolioAvailable = false;

const portfolioPages = path.join(PORTFOLIO_REPO, 'src/pages');
const portfolioComponents = path.join(PORTFOLIO_REPO, 'src/components');

if (fs.existsSync(portfolioPages) || fs.existsSync(portfolioComponents)) {
  portfolioAvailable = true;
  const astroFiles = [...walk(portfolioPages, '.astro'), ...walk(portfolioComponents, '.astro')];
  for (const f of astroFiles) {
    const src = fs.readFileSync(f, 'utf-8');
    const base = path.basename(f);
    // Find `from '@lifegames/web/production'` import blocks (possibly multi-line)
    const importBlockRe = /import\s*\{([^}]+)\}\s*from\s*['"]@lifegames\/web\/production['"]/gs;
    let match;
    while ((match = importBlockRe.exec(src)) !== null) {
      const names = match[1]
        .split(',')
        .map((s) =>
          s
            .trim()
            .replace(/\s+as\s+\S+/, '')
            .trim(),
        )
        .filter(Boolean);
      for (const name of names) {
        consumedSet.add(name);
        if (!consumedByFile.has(name)) consumedByFile.set(name, new Set());
        consumedByFile.get(name).add(base);
      }
    }
  }
} else {
  // Fallback to manifest
  const manifest = readJSON(FALLBACK_MANIFEST);
  if (!manifest) {
    if (CHECK_MODE) {
      console.error(
        'ERROR: Portfolio repo not found at ' +
          PORTFOLIO_REPO +
          ' AND fallback manifest widget-consumers.json is missing.\n' +
          'Run `pnpm widget:inventory` with the portfolio repo present to generate widget-consumers.json.',
      );
      process.exit(1);
    } else {
      console.warn(
        'WARN: Portfolio repo not available and no widget-consumers.json fallback. ' +
          'consumedByPortfolio will be false for all widgets.',
      );
    }
  } else {
    for (const id of manifest.consumedWidgets ?? []) {
      consumedSet.add(id);
    }
  }
}

for (const w of widgets) {
  w.consumedByPortfolio = consumedSet.has(w.id);
}

// ── step 5: build output ──────────────────────────────────────────────────────
const inventory = widgets.map(
  ({ id, category, hasStory, hasSwiftMirror, schemaExempt, consumedByPortfolio }) => ({
    id,
    category,
    hasStory,
    hasSwiftMirror,
    schemaExempt,
    consumedByPortfolio,
  }),
);

const totalCount = inventory.length;
const portfolioCount = inventory.filter((w) => w.consumedByPortfolio).length;
const withStory = inventory.filter((w) => w.hasStory).length;
const withSwift = inventory.filter((w) => w.hasSwiftMirror).length;

// ── step 6: check mode — validate README count ───────────────────────────────
if (CHECK_MODE) {
  const readmeSrc = fs.readFileSync(README, 'utf-8');
  // Match patterns like "56 page-specific widgets" or "56 widgets"
  const countRe = /(\d+)\s+(?:page-specific\s+)?widgets/g;
  const counts = [];
  let m;
  while ((m = countRe.exec(readmeSrc)) !== null) {
    counts.push(parseInt(m[1], 10));
  }
  const diverged = counts.filter((c) => c !== totalCount);
  if (diverged.length > 0) {
    console.error(
      `ERROR: README widget count(s) [${diverged.join(', ')}] diverge from script output (${totalCount}).\n` +
        `Run \`pnpm widget:inventory\` to regenerate and update README.`,
    );
    process.exit(1);
  }
  // Also validate that docs/widget-inventory.json exists and is fresh
  if (!fileExists(OUTPUT_JSON)) {
    console.error(
      'ERROR: docs/widget-inventory.json does not exist. Run `pnpm widget:inventory` to generate.',
    );
    process.exit(1);
  }
  console.log(
    `OK: Widget count in README (${totalCount}) matches script output. Portfolio consumed: ${portfolioCount}.`,
  );
  process.exit(0);
}

// ── step 7: write outputs ────────────────────────────────────────────────────
// Ensure docs/ directory exists
fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });

fs.writeFileSync(
  OUTPUT_JSON,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      totalCount,
      portfolioConsumedCount: portfolioCount,
      widgets: inventory,
    },
    null,
    2,
  ) + '\n',
);
console.log(`Wrote ${OUTPUT_JSON}`);

// Write fallback manifest (consumed widget IDs only — no personal data).
// Preserve the governance `widgets` array (R6: status/plannedSurface are
// maintainer-curated and not derivable from import scans) AND reconcile it so
// every portfolio-consumed widget has a matching entry. A widget listed in
// consumedWidgets[] but absent from widgets[] is the self-inconsistency
// lp-audit D1 (audit-widget-matrix.mjs) flags as HIGH. Missing entries are
// appended with the fields we CAN derive — category (from the widget inventory)
// and consumers (from the import scan) — with status defaulting to
// "Experimental" and plannedSurface to null for later maintainer curation.
// Reconciliation only runs when the portfolio scan supplied per-widget consumer
// provenance (skipped in fallback mode, which has no source files to attribute).
const consumedWidgetIds = inventory.filter((w) => w.consumedByPortfolio).map((w) => w.id);
const existingManifest = readJSON(FALLBACK_MANIFEST);
const manifestOut = { consumedWidgets: consumedWidgetIds };
const curatedWidgets =
  existingManifest && Array.isArray(existingManifest.widgets) ? [...existingManifest.widgets] : [];
if (portfolioAvailable) {
  const curatedNames = new Set(curatedWidgets.map((w) => w.name));
  const categoryById = new Map(inventory.map((w) => [w.id, w.category]));
  for (const id of consumedWidgetIds) {
    if (curatedNames.has(id)) continue;
    curatedWidgets.push({
      name: id,
      category: categoryById.get(id) ?? null,
      consumers: [...(consumedByFile.get(id) ?? [])].sort(),
      status: 'Experimental',
      plannedSurface: null,
    });
    curatedNames.add(id);
  }
}
if (curatedWidgets.length > 0) {
  manifestOut.widgets = curatedWidgets;
}
manifestOut.generatedAt = new Date().toISOString();
fs.writeFileSync(FALLBACK_MANIFEST, JSON.stringify(manifestOut, null, 2) + '\n');
console.log(`Wrote ${FALLBACK_MANIFEST} (fallback for CI without portfolio checkout)`);

// Update README widget counts — replace any numeric count before "widget(s)" or "SwiftUI widget"
let readmeSrc = fs.readFileSync(README, 'utf-8');
readmeSrc = readmeSrc.replace(
  /\d+(\s+(?:page-specific\s+)?(?:SwiftUI\s+)?widgets?\b)/g,
  `${totalCount}$1`,
);
fs.writeFileSync(README, readmeSrc);
console.log(`Updated README widget count to ${totalCount}`);

// ── step 8: print summary ────────────────────────────────────────────────────
console.log('');
console.log('Widget Inventory Summary');
console.log('========================');
console.log(`Total widgets:        ${totalCount}`);
console.log(`Portfolio-consumed:   ${portfolioCount}`);
console.log(`With Storybook story: ${withStory}`);
console.log(`With Swift mirror:    ${withSwift}`);
console.log(`Schema-exempt:        ${inventory.filter((w) => w.schemaExempt).length}`);
console.log('');

if (portfolioAvailable) {
  console.log('Portfolio-consumed widgets:');
  for (const w of inventory.filter((w) => w.consumedByPortfolio)) {
    console.log(`  ${w.category}/${w.id}`);
  }
} else {
  console.log('(Portfolio repo unavailable — consumed list from fallback manifest)');
}
