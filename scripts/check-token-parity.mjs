#!/usr/bin/env node
// mantle-cli-output: token parity check report for stdout
/**
 * Token Parity Check — P1 cross-platform token contract (GOVERNANCE.md §5).
 *
 * Verifies that neon/accent color hex values resolve IDENTICALLY across the two
 * platform token outputs (P1 token rule: "neon colors MUST resolve to identical
 * hex values across web and iOS").
 *
 *   Web:   packages/tokens/dist/tokens.css  — `--lg-color-accent-*: #rrggbb;`
 *   Swift: Sources/LifegamesTokens/Resources/Colors.xcassets/color-accent-*.colorset/Contents.json
 *          (sRGB float components → hex)
 *
 * Comparison key: the accent/neon color role (e.g. `accent-pink`). For each role
 * present in both outputs, the resolved hex must match.
 *
 * Usage:
 *   node scripts/check-token-parity.mjs           — print parity table
 *   node scripts/check-token-parity.mjs --check   — advisory: print, exit 0
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CHECK_MODE = process.argv.includes('--check');

const CSS_PATH = path.join(ROOT, 'packages/tokens/dist/tokens.css');
const XCASSETS = path.join(ROOT, 'Sources/LifegamesTokens/Resources/Colors.xcassets');

// ── web: parse --lg-color-accent-* / neon hex from tokens.css ───────────────────
/** @returns {Map<string, string>} role (e.g. "accent-pink") → "#rrggbb" */
function loadWebAccentHex() {
  const map = new Map();
  if (!fs.existsSync(CSS_PATH)) return map;
  const css = fs.readFileSync(CSS_PATH, 'utf-8');
  // Match `--lg-color-accent-pink: #ff006e;` (and neon if present in color form)
  const re = /--lg-color-(accent-[a-z0-9-]+|neon-[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    map.set(m[1], normalizeHex(m[2]));
  }
  return map;
}

// ── swift: convert color-accent-*.colorset sRGB components → hex ────────────────
/** @returns {Map<string, string>} role (e.g. "accent-pink") → "#rrggbb" */
function loadSwiftAccentHex() {
  const map = new Map();
  if (!fs.existsSync(XCASSETS)) return map;
  for (const entry of fs.readdirSync(XCASSETS)) {
    // color-accent-pink.colorset → role "accent-pink"
    const m = /^color-((?:accent|neon)-[a-z0-9-]+)\.colorset$/.exec(entry);
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
    '#' +
    [r, g, b]
      .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0'))
      .join('')
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

const web = loadWebAccentHex();
const swift = loadSwiftAccentHex();

// ── compare roles present in both ───────────────────────────────────────────────
const allRoles = new Set([...web.keys(), ...swift.keys()]);
const sortedRoles = [...allRoles].sort();

const mismatches = [];
const webOnly = [];
const swiftOnly = [];

console.log('Token Parity Check — P1 neon/accent cross-platform contract (advisory mode)');
console.log('===========================================================================\n');
console.log(`Web source:   packages/tokens/dist/tokens.css (${web.size} accent/neon roles)`);
console.log(`Swift source: Colors.xcassets color-accent-*.colorset (${swift.size} accent/neon roles)\n`);

const cols = ['Role', 'Web hex', 'Swift hex', 'Match'];
const widths = [22, 10, 11, 8];
console.log(cols.map((c, i) => c.padEnd(widths[i])).join(' '));
console.log(cols.map((_, i) => '-'.repeat(widths[i])).join(' '));

for (const role of sortedRoles) {
  const w = web.get(role);
  const s = swift.get(role);
  let match;
  if (w && s) {
    match = w === s ? 'YES' : 'NO';
    if (w !== s) mismatches.push({ role, web: w, swift: s });
  } else if (w && !s) {
    match = 'web-only';
    webOnly.push(role);
  } else {
    match = 'swift-only';
    swiftOnly.push(role);
  }
  console.log([
    role.padEnd(widths[0]),
    String(w ?? '-').padEnd(widths[1]),
    String(s ?? '-').padEnd(widths[2]),
    match.padEnd(widths[3]),
  ].join(' '));
}

console.log('\nCounts');
console.log('------');
console.log(`Roles in both:    ${sortedRoles.length - webOnly.length - swiftOnly.length}`);
console.log(`Hex mismatches:   ${mismatches.length}`);
console.log(`Web-only roles:   ${webOnly.length}${webOnly.length ? ' (' + webOnly.join(', ') + ')' : ''}`);
console.log(`Swift-only roles: ${swiftOnly.length}${swiftOnly.length ? ' (' + swiftOnly.join(', ') + ')' : ''}`);

if (mismatches.length > 0) {
  console.log('\nP1 PARITY VIOLATIONS (neon/accent hex differs across platforms):');
  for (const m of mismatches) {
    console.log(`  ${m.role}: web ${m.web} != swift ${m.swift}`);
  }
}

// ── exit code ─────────────────────────────────────────────────────────────────
// Advisory: always exit 0.
void CHECK_MODE;
process.exit(0);
