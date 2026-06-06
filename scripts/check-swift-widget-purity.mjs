#!/usr/bin/env node
// mantle-cli-output: Swift widget purity check report for stdout
/**
 * Swift Widget Purity Check — P3 presentational-purity boundary (GOVERNANCE.md §5).
 *
 * Scans every Sources/LifegamesWidgets/**\/*.swift (and, for the F-015
 * color/UIKit detections, Sources/LifegamesComponents/**\/*.swift) for
 * presentational-purity violations.
 *
 * Detections
 * ──────────
 * 1. Forbidden module imports (widget scope only):
 *      import ComposableArchitecture | HealthKit | CoreLocation |
 *      APIClient | SharedModels
 *
 * 2. Raw color literals (F-015) — widgets + components:
 *      Color(hex: "#…")             — hardcoded hex color
 *      Color(red: …, green: …, blue: …)  — hardcoded sRGB triple
 *    Generated tokens under Sources/LifegamesTokens/ are exempt by location.
 *    Specific Color(hex:) sites whose value comes from runtime data may be
 *    listed in widget-purity-exceptions.json (top-level "colorHex" array of
 *    {file, line, reason}) — they are still reported but do not fail --check.
 *
 * 3. UIKit + SwiftUI co-import (F-015):
 *    A widget/component file that imports BOTH SwiftUI and UIKit. UIKit on
 *    its own is fine; mixing the two in a presentational widget is the
 *    smell — it almost always means the widget is reaching for a UIKit
 *    affordance instead of staying pure SwiftUI.
 *
 * Usage:
 *   node scripts/check-swift-widget-purity.mjs           — print findings, exit 0
 *   node scripts/check-swift-widget-purity.mjs --check   — exit 1 on un-exempted violations
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CHECK_MODE = process.argv.includes('--check');

const SWIFT_WIDGETS = path.join(ROOT, 'Sources/LifegamesWidgets');
const SWIFT_COMPONENTS = path.join(ROOT, 'Sources/LifegamesComponents');
const EXCEPTIONS_PATH = path.join(ROOT, 'widget-purity-exceptions.json');

// Forbidden imports. Each entry: { label, pattern } where pattern is matched
// against each source line. `import X` for modules; APIClient/SharedModels are
// matched as `import <Module>` only (a type reference alone is not an import).
const FORBIDDEN_IMPORTS = [
  { label: 'ComposableArchitecture (TCA)', re: /^\s*import\s+ComposableArchitecture\b/ },
  { label: 'HealthKit', re: /^\s*import\s+HealthKit\b/ },
  { label: 'CoreLocation', re: /^\s*import\s+CoreLocation\b/ },
  { label: 'APIClient', re: /^\s*import\s+APIClient\b/ },
  { label: 'SharedModels', re: /^\s*import\s+SharedModels\b/ },
];

// F-015 raw-color detections.
//
// COLOR_HEX_RE matches BOTH literal hex strings (Color(hex: "#abc")) AND
// variable/expression forms (Color(hex: someVar)). The literal form is the
// pure hardcoded violation. The variable form is the "runtime-data-driven"
// case — still surfaced because it bypasses tokens, and the allow-list lets
// us mark each legitimate site (one per data-driven swatch) so unreviewed
// sites still fail the gate.
const COLOR_HEX_RE = /\bColor\s*\(\s*hex\s*:/;
const COLOR_RGB_RE = /\bColor\s*\(\s*red\s*:.*green\s*:.*blue\s*:/;

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

// Allow-list: Set of "file:line" keys whose Color(hex:"#...") literal is
// intentional (runtime-data-driven). Read from widget-purity-exceptions.json
// at startup; missing/malformed file → empty Set.
function loadColorHexExceptions() {
  const set = new Set();
  if (!fs.existsSync(EXCEPTIONS_PATH)) return set;
  try {
    const parsed = JSON.parse(fs.readFileSync(EXCEPTIONS_PATH, 'utf-8'));
    const arr = Array.isArray(parsed?.colorHex) ? parsed.colorHex : [];
    for (const entry of arr) {
      if (typeof entry?.file === 'string' && Number.isInteger(entry?.line)) {
        set.add(`${entry.file}:${entry.line}`);
      }
    }
  } catch {
    /* swallow — empty Set means no allow-list */
  }
  return set;
}

const colorHexExceptions = loadColorHexExceptions();

const swiftWidgetFiles = walk(SWIFT_WIDGETS, '.swift');
const swiftComponentFiles = walk(SWIFT_COMPONENTS, '.swift');

/**
 * @type {{
 *   file: string;
 *   line: number;
 *   label: string;
 *   text: string;
 *   exempt?: boolean;
 *   blocking: boolean;
 * }[]}
 */
const findings = [];

// (1) Forbidden imports — widgets only (original behaviour).
for (const file of swiftWidgetFiles) {
  const src = fs.readFileSync(file, 'utf-8');
  const lines = src.split('\n');
  lines.forEach((text, idx) => {
    for (const f of FORBIDDEN_IMPORTS) {
      if (f.re.test(text)) {
        findings.push({
          file: path.relative(ROOT, file),
          line: idx + 1,
          label: f.label,
          text: text.trim(),
          blocking: true,
        });
      }
    }
  });
}

// (2) + (3) Color literals and UIKit/SwiftUI mix — widgets + components.
const colorCorpus = [...swiftWidgetFiles, ...swiftComponentFiles];

for (const file of colorCorpus) {
  const rel = path.relative(ROOT, file);
  const src = fs.readFileSync(file, 'utf-8');
  const lines = src.split('\n');
  const hasSwiftUI = /^\s*import\s+SwiftUI\b/m.test(src);
  const hasUIKit = /^\s*import\s+UIKit\b/m.test(src);

  lines.forEach((text, idx) => {
    const lineNo = idx + 1;
    const locKey = `${rel}:${lineNo}`;

    if (COLOR_HEX_RE.test(text)) {
      const exempt = colorHexExceptions.has(locKey);
      findings.push({
        file: rel,
        line: lineNo,
        label: exempt
          ? 'Color(hex:) [exempt: runtime data]'
          : 'Color(hex:) raw literal',
        text: text.trim(),
        exempt,
        blocking: !exempt,
      });
    }
    if (COLOR_RGB_RE.test(text)) {
      findings.push({
        file: rel,
        line: lineNo,
        label: 'Color(red:green:blue:) raw literal',
        text: text.trim(),
        blocking: true,
      });
    }
  });

  if (hasSwiftUI && hasUIKit) {
    const uikitLineIdx = lines.findIndex((t) => /^\s*import\s+UIKit\b/.test(t));
    findings.push({
      file: rel,
      line: uikitLineIdx + 1,
      label: 'import UIKit alongside import SwiftUI',
      text: 'import UIKit',
      blocking: true,
    });
  }
}

// ── report ──────────────────────────────────────────────────────────────────────
const blocking = findings.filter((f) => f.blocking);
const exempted = findings.filter((f) => f.exempt);

console.log('Swift Widget Purity Check — P3 + F-015');
console.log('======================================\n');
console.log(`Scanned widgets:    ${swiftWidgetFiles.length} .swift files under Sources/LifegamesWidgets/`);
console.log(`Scanned components: ${swiftComponentFiles.length} .swift files under Sources/LifegamesComponents/`);
console.log(`Forbidden imports:  ${FORBIDDEN_IMPORTS.map((f) => f.label).join(', ')}`);
console.log(`Color exceptions:   ${colorHexExceptions.size} site(s) in widget-purity-exceptions.json\n`);

if (findings.length === 0) {
  console.log('No purity findings. All widgets and components satisfy P3 + F-015.');
} else {
  console.log(`Findings: ${findings.length} (${blocking.length} blocking, ${exempted.length} exempted):\n`);
  for (const v of findings) {
    const tag = v.exempt ? ' [EXEMPT]' : v.blocking ? '' : ' [info]';
    console.log(`  ${v.file}:${v.line}  [${v.label}]${tag}`);
    console.log(`    ${v.text}`);
  }
  if (blocking.length > 0) {
    console.log('\nThese are genuine P3 / F-015 presentational-purity violations:');
    console.log('  - Forbidden imports → move the data dependency to the app layer.');
    console.log('  - Color(hex:) / Color(red:green:blue:) → reference a token in');
    console.log('    LifegamesTokens, or — if the value comes from runtime data —');
    console.log('    add the site to widget-purity-exceptions.json with a reason.');
    console.log('  - UIKit + SwiftUI co-import → drop UIKit and use the SwiftUI');
    console.log('    equivalent (or split the file into a SwiftUI wrapper around a');
    console.log('    pure UIKit type elsewhere).');
  }
}

// ── exit code ─────────────────────────────────────────────────────────────────
// --check: exit 1 when blocking violations found. Exempted findings are not
// blocking. Without --check, always exit 0.
process.exit(CHECK_MODE && blocking.length > 0 ? 1 : 0);
