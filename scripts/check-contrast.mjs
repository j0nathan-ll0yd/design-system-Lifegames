#!/usr/bin/env node
// WCAG-AA contrast gate for Lifegames Design System tokens.
//
// Reads packages/tokens/dist/tokens.css, resolves overlay colors by
// alpha-compositing over surface-base, and asserts that each text/surface
// pairing meets the contrast threshold for its intended use.
//
// Exits non-zero on any violation so it can wire into CI as a hard gate.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parse, wcagContrast, blend, formatHex } from 'culori';

const CSS_PATH = path.resolve('packages/tokens/dist/tokens.css');

if (!fs.existsSync(CSS_PATH)) {
  console.error(`tokens.css not found at ${CSS_PATH}. Run 'pnpm build:tokens' first.`);
  process.exit(2);
}

const css = fs.readFileSync(CSS_PATH, 'utf8');

const tokens = {};
const DECL_RE = /^\s*(--lg-[\w-]+):\s*([^;]+);/gm;
let m;
while ((m = DECL_RE.exec(css))) {
  tokens[m[1]] = m[2].trim();
}

function resolveOnSurfaceBase(name) {
  const raw = tokens[name];
  if (!raw) throw new Error(`missing token: ${name}`);
  const c = parse(raw);
  if (!c) throw new Error(`culori cannot parse ${name}=${raw}`);
  const alpha = c.alpha ?? 1;
  if (alpha >= 1) return c;
  const base = parse(tokens['--lg-color-surface-base']);
  if (!base) throw new Error(`cannot parse --lg-color-surface-base`);
  return blend([base, c], 'normal');
}

function resolveOpaque(name) {
  const raw = tokens[name];
  if (!raw) throw new Error(`missing token: ${name}`);
  const c = parse(raw);
  if (!c) throw new Error(`culori cannot parse ${name}=${raw}`);
  return c;
}

// Pairings the DS commits to maintain. Each entry:
//   text token, surface token, minimum WCAG-AA ratio, label.
// 4.5:1 = body text; 3:1 = large text / non-text UI (headings).
const PAIRINGS = [
  ['--lg-color-text-title',   '--lg-color-surface-base',    3.0, 'large/heading'],
  ['--lg-color-text-title',   '--lg-color-surface-deep',    3.0, 'large/heading'],
  ['--lg-color-text-title',   '--lg-color-surface-raised',  3.0, 'large/heading'],
  ['--lg-color-text-primary', '--lg-color-surface-base',    4.5, 'body'],
  ['--lg-color-text-primary', '--lg-color-surface-deep',    4.5, 'body'],
  ['--lg-color-text-primary', '--lg-color-surface-raised',  4.5, 'body'],
  ['--lg-color-text-muted',   '--lg-color-surface-base',    4.5, 'body'],
  ['--lg-color-text-muted',   '--lg-color-surface-deep',    4.5, 'body'],
  ['--lg-color-text-muted',   '--lg-color-surface-raised',  4.5, 'body'],
];

const results = [];
const failures = [];

for (const [textName, surfName, min, kind] of PAIRINGS) {
  const text = resolveOpaque(textName);
  const surf = resolveOnSurfaceBase(surfName);
  const ratio = wcagContrast(text, surf);
  const pass = ratio >= min;
  results.push({ textName, surfName, ratio, min, kind, pass, surfHex: formatHex(surf) });
  if (!pass) failures.push({ textName, surfName, ratio, min });
}

const colW = Math.max(...PAIRINGS.map(([t]) => t.length));
const surW = Math.max(...PAIRINGS.map(([, s]) => s.length));

console.log('WCAG-AA contrast gate (packages/tokens/dist/tokens.css)');
console.log('─'.repeat(colW + surW + 36));
for (const r of results) {
  const mark = r.pass ? '✓' : '✗';
  console.log(
    `${mark} ${r.textName.padEnd(colW)}  on  ${r.surfName.padEnd(surW)} (${r.surfHex})  ${r.ratio.toFixed(2).padStart(5)}:1  (≥${r.min}:1 ${r.kind})`,
  );
}
console.log('─'.repeat(colW + surW + 36));

if (failures.length) {
  console.error(`\n${failures.length} violation(s) — fix the underlying tokens or adjust the gate intentionally.`);
  process.exit(1);
}

console.log(`All ${results.length} pairings pass WCAG-AA.`);
