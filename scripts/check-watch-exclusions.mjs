#!/usr/bin/env node
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
 *   node scripts/check-watch-exclusions.mjs          — print findings, exit 0
 *   node scripts/check-watch-exclusions.mjs --check  — print findings, exit 1 on violations
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CHECK_MODE = process.argv.includes('--check');

const WATCH_DIRS = [
  path.join(ROOT, 'Sources/LifegamesComponentsWatch'),
  path.join(ROOT, 'Sources/LifegamesWidgetsWatch'),
];

const FORBIDDEN_SYMBOLS = ['ECG', 'PulsingMapMarker'];

// Match the symbol as a whole identifier — avoid false hits on prefixes
// (e.g. "ECGEncoded" would match; "ECGV2" still matches; "GECG" would not).
// We intentionally allow suffixes because the exclusion is by family, not exact name.
const SYMBOL_REGEXES = FORBIDDEN_SYMBOLS.map((s) => ({
  symbol: s,
  re: new RegExp(`\\b${s}\\w*`, 'g'),
}));

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

const findings = [];

for (const dir of WATCH_DIRS) {
  const swiftFiles = walk(dir, '.swift');
  for (const file of swiftFiles) {
    const rel = path.relative(ROOT, file);
    const basename = path.basename(file);

    // Filename check
    for (const symbol of FORBIDDEN_SYMBOLS) {
      if (basename.includes(symbol)) {
        findings.push({
          kind: 'filename',
          file: rel,
          symbol,
          line: null,
          text: basename,
        });
      }
    }

    // Source-content check (imports + symbol references)
    const src = fs.readFileSync(file, 'utf-8');
    const lines = src.split('\n');
    lines.forEach((text, idx) => {
      for (const { symbol, re } of SYMBOL_REGEXES) {
        re.lastIndex = 0;
        if (re.test(text)) {
          findings.push({
            kind: 'reference',
            file: rel,
            symbol,
            line: idx + 1,
            text: text.trim(),
          });
        }
      }
    });
  }
}

// ── report ──────────────────────────────────────────────────────────────────────
console.log('Watch Exclusions Check — F-014');
console.log('==============================\n');
console.log(`Scanned dirs: ${WATCH_DIRS.map((d) => path.relative(ROOT, d)).join(', ')}`);
console.log(`Forbidden symbols: ${FORBIDDEN_SYMBOLS.join(', ')}\n`);

if (findings.length === 0) {
  console.log(
    'No Watch exclusion violations. ECG / PulsingMapMarker are absent from Watch targets.',
  );
} else {
  console.log(`WATCH EXCLUSION VIOLATIONS: ${findings.length} hit(s):\n`);
  for (const v of findings) {
    const loc = v.line ? `${v.file}:${v.line}` : v.file;
    console.log(`  ${loc}  [${v.kind} / ${v.symbol}]`);
    console.log(`    ${v.text}`);
  }
  console.log('\nThese symbols are explicitly excluded from the Watch DS surface.');
  console.log('If a Watch-appropriate variant is needed, ship it under a new name.');
}

process.exit(CHECK_MODE && findings.length > 0 ? 1 : 0);
