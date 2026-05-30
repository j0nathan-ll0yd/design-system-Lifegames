#!/usr/bin/env node
// mantle-cli-output: Swift widget purity check report for stdout
/**
 * Swift Widget Purity Check — P3 presentational-purity boundary (GOVERNANCE.md §5).
 *
 * Scans every Sources/LifegamesWidgets/**\/*.swift file for forbidden app/domain
 * imports that violate the presentational-purity boundary. A DS widget must be a
 * pure function of its props — no TCA, no HealthKit, no CoreLocation, no app
 * networking/model modules.
 *
 * Forbidden module imports (P3):
 *   - import ComposableArchitecture  (TCA — app state/navigation)
 *   - import HealthKit               (health data fetching)
 *   - import CoreLocation            (location data fetching)
 *   - import APIClient               (network layer)
 *   - import SharedModels            (app domain models)
 *
 * Usage:
 *   node scripts/check-swift-widget-purity.mjs           — print findings
 *   node scripts/check-swift-widget-purity.mjs --check   — advisory: print, exit 0
 *
 * Any hit is a genuine P3 violation and is reported clearly even in advisory mode.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CHECK_MODE = process.argv.includes('--check');
const SWIFT_WIDGETS = path.join(ROOT, 'Sources/LifegamesWidgets');

// Forbidden imports. Each entry: { label, pattern } where pattern is matched
// against each source line. `import X` for modules; APIClient/SharedModels are
// matched as `import <Module>` only (a type reference alone is not an import).
const FORBIDDEN = [
  { label: 'ComposableArchitecture (TCA)', re: /^\s*import\s+ComposableArchitecture\b/ },
  { label: 'HealthKit', re: /^\s*import\s+HealthKit\b/ },
  { label: 'CoreLocation', re: /^\s*import\s+CoreLocation\b/ },
  { label: 'APIClient', re: /^\s*import\s+APIClient\b/ },
  { label: 'SharedModels', re: /^\s*import\s+SharedModels\b/ },
];

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

const swiftFiles = walk(SWIFT_WIDGETS, '.swift');

/** @type {{ file: string, line: number, label: string, text: string }[]} */
const findings = [];

for (const file of swiftFiles) {
  const src = fs.readFileSync(file, 'utf-8');
  const lines = src.split('\n');
  lines.forEach((text, idx) => {
    for (const f of FORBIDDEN) {
      if (f.re.test(text)) {
        findings.push({
          file: path.relative(ROOT, file),
          line: idx + 1,
          label: f.label,
          text: text.trim(),
        });
      }
    }
  });
}

// ── report ──────────────────────────────────────────────────────────────────────
console.log('Swift Widget Purity Check — P3 (advisory mode)');
console.log('==============================================\n');
console.log(`Scanned: ${swiftFiles.length} .swift files under Sources/LifegamesWidgets/`);
console.log(`Forbidden imports: ${FORBIDDEN.map((f) => f.label).join(', ')}\n`);

if (findings.length === 0) {
  console.log('No forbidden imports found. All Swift widgets satisfy the P3 import boundary.');
} else {
  console.log(`P3 VIOLATIONS: ${findings.length} forbidden import(s) found:\n`);
  for (const v of findings) {
    console.log(`  ${v.file}:${v.line}  [${v.label}]`);
    console.log(`    ${v.text}`);
  }
  console.log('\nThese are genuine P3 presentational-purity violations. A DS widget must');
  console.log('not import app/domain modules — move the data dependency to the app layer.');
}

// ── exit code ─────────────────────────────────────────────────────────────────
// Advisory: always exit 0, even when violations are found.
void CHECK_MODE;
process.exit(0);
