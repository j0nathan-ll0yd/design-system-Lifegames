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
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CHECK_MODE = process.argv.includes('--check');

const CSS_PATH = path.join(ROOT, 'packages/tokens/dist/tokens.css');
const XCASSETS = path.join(ROOT, 'Sources/LifegamesTokens/Resources/Colors.xcassets');
const EXCEPTIONS_PATH = path.join(ROOT, 'tokens/parity-exceptions.json');

// Role-family prefix that the parity gate cares about. Primitive (accent/neon)
// + semantic (surface/text/border/health/sleep/podium/status). Roles outside
// this set are excluded — they're either internal helpers or surface-level
// composites not yet promoted to cross-platform parity.
const ROLE_FAMILIES = 'accent|neon|surface|text|border|health|sleep|podium|status';
const ROLE_BODY = `(?:${ROLE_FAMILIES})-[a-z0-9-]+`;

// In-script skip-list (F-006 hardcoded gating). text-primary maps to zinc.300
// on one platform and zinc.200 on the other and the divergence is intentional
// per the audit decision pending ADR-0001. Once ADR-0001 lands, record this
// in parity-exceptions.json and remove the in-script skip.
const HARDCODED_SKIPS = new Set([
  // TODO(F-001): record in parity-exceptions.json once ADR-0001 lands
  'text-primary',
]);

// ── web: parse --lg-color-{role} hex from tokens.css ────────────────────────────
/** @returns {Map<string, string>} role (e.g. "accent-pink") → "#rrggbb" */
function loadWebAccentHex() {
  const map = new Map();
  if (!fs.existsSync(CSS_PATH)) return map;
  const css = fs.readFileSync(CSS_PATH, 'utf-8');
  const re = new RegExp(`--lg-color-(${ROLE_BODY})\\s*:\\s*(#[0-9a-fA-F]{3,8})\\s*;`, 'g');
  let m;
  while ((m = re.exec(css)) !== null) {
    map.set(m[1], normalizeHex(m[2]));
  }
  return map;
}

// ── swift: convert color-{role}.colorset sRGB components → hex ─────────────────
/** @returns {Map<string, string>} role (e.g. "accent-pink") → "#rrggbb" */
function loadSwiftAccentHex() {
  const map = new Map();
  if (!fs.existsSync(XCASSETS)) return map;
  const dirRe = new RegExp(`^color-(${ROLE_BODY})\\.colorset$`);
  for (const entry of fs.readdirSync(XCASSETS)) {
    // color-accent-pink.colorset → role "accent-pink"
    const m = dirRe.exec(entry);
    if (!m) continue;
    const role = m[1];
    const contents = path.join(XCASSETS, entry, 'Contents.json');
    if (!fs.existsSync(contents)) continue;
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(contents, 'utf-8'));
    } catch {
      continue;
    }
    const color = parsed?.colors?.[0]?.color;
    const comp = color?.components;
    if (!comp) continue;
    const hex = componentsToHex(comp);
    if (hex) map.set(role, hex);
  }
  return map;
}

// sRGB component may be a float string ("0.937..."), a 0-255 string, or "0xNN".
function channelToByte(v) {
  const s = String(v).trim();
  if (/^0x[0-9a-fA-F]{1,2}$/.test(s)) return parseInt(s, 16);
  const num = parseFloat(s);
  if (Number.isNaN(num)) return null;
  if (num <= 1) return Math.round(num * 255);
  return Math.round(num);
}

function componentsToHex(comp) {
  const r = channelToByte(comp.red);
  const g = channelToByte(comp.green);
  const b = channelToByte(comp.blue);
  if (r === null || g === null || b === null) return null;
  return (
    '#' + [r, g, b].map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')).join('')
  );
}

// Expand #rgb → #rrggbb, drop alpha, lowercase.
function normalizeHex(hex) {
  let h = hex.toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(h)) {
    h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  }
  if (/^#[0-9a-f]{8}$/.test(h)) h = h.slice(0, 7); // drop alpha
  if (/^#[0-9a-f]{4}$/.test(h)) {
    h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  }
  return h;
}

function loadExceptions() {
  if (!fs.existsSync(EXCEPTIONS_PATH)) return new Set();
  try {
    const parsed = JSON.parse(fs.readFileSync(EXCEPTIONS_PATH, 'utf-8'));
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((s) => typeof s === 'string'));
  } catch {
    return new Set();
  }
}

const web = loadWebAccentHex();
const swift = loadSwiftAccentHex();
const fileExceptions = loadExceptions();
const exceptions = new Set([...fileExceptions, ...HARDCODED_SKIPS]);

// ── compare roles present in both ───────────────────────────────────────────────
const allRoles = new Set([...web.keys(), ...swift.keys()]);
const sortedRoles = [...allRoles].sort();

const mismatches = [];
const exemptedMismatches = [];
const webOnly = [];
const swiftOnly = [];

console.log('Token Parity Check — P1 cross-platform contract (primitive + semantic tiers)');
console.log('===========================================================================\n');
console.log(`Role families: ${ROLE_FAMILIES}`);
console.log(`Web source:    packages/tokens/dist/tokens.css (${web.size} roles)`);
console.log(`Swift source:  Colors.xcassets color-*.colorset (${swift.size} roles)`);
console.log(
  `Exceptions:    ${exceptions.size} role(s) excluded from gating ` +
    `(${fileExceptions.size} from tokens/parity-exceptions.json + ` +
    `${HARDCODED_SKIPS.size} hardcoded)\n`,
);

const cols = ['Role', 'Web hex', 'Swift hex', 'Match'];
const widths = [22, 10, 11, 8];
console.log(cols.map((c, i) => c.padEnd(widths[i])).join(' '));
console.log(cols.map((_, i) => '-'.repeat(widths[i])).join(' '));

for (const role of sortedRoles) {
  const w = web.get(role);
  const s = swift.get(role);
  let match;
  if (w && s) {
    if (w === s) {
      match = 'YES';
    } else if (exceptions.has(role)) {
      match = 'EXEMPT';
      exemptedMismatches.push({ role, web: w, swift: s });
    } else {
      match = 'NO';
      mismatches.push({ role, web: w, swift: s });
    }
  } else if (w && !s) {
    match = 'web-only';
    webOnly.push(role);
  } else {
    match = 'swift-only';
    swiftOnly.push(role);
  }
  console.log(
    [
      role.padEnd(widths[0]),
      String(w ?? '-').padEnd(widths[1]),
      String(s ?? '-').padEnd(widths[2]),
      match.padEnd(widths[3]),
    ].join(' '),
  );
}

console.log('\nCounts');
console.log('------');
console.log(`Roles in both:      ${sortedRoles.length - webOnly.length - swiftOnly.length}`);
console.log(`Hex mismatches:     ${mismatches.length}`);
console.log(`Exempted mismatches:${exemptedMismatches.length}`);
console.log(
  `Web-only roles:     ${webOnly.length}${webOnly.length ? ' (' + webOnly.join(', ') + ')' : ''}`,
);
console.log(
  `Swift-only roles:   ${swiftOnly.length}${swiftOnly.length ? ' (' + swiftOnly.join(', ') + ')' : ''}`,
);

if (exemptedMismatches.length > 0) {
  console.log('\nExempted divergences (recorded in parity-exceptions.json or HARDCODED_SKIPS):');
  for (const m of exemptedMismatches) {
    console.log(`  ${m.role}: web ${m.web} != swift ${m.swift}  [allowed]`);
  }
}

if (mismatches.length > 0) {
  console.log('\nP1 PARITY VIOLATIONS (hex differs across platforms, not in exceptions):');
  for (const m of mismatches) {
    console.log(`  ${m.role}: web ${m.web} != swift ${m.swift}`);
  }
  console.log(
    '\nTo intentionally allow a role to diverge, add it to tokens/parity-exceptions.json',
  );
  console.log('with an ADR reference in the same PR.');
}

// ── exit code ─────────────────────────────────────────────────────────────────
// --check: exit 1 when non-exempted hex mismatches found (blocking gate).
// Without flag: exit 0.
process.exit(CHECK_MODE && mismatches.length > 0 ? 1 : 0);
