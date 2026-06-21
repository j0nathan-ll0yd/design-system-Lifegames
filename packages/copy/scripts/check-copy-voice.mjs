#!/usr/bin/env node
/**
 * check-copy-voice.mjs — @lifegames/copy voice & mechanics gate.
 *
 * Enforces the mechanical, low-false-positive rules from packages/copy/VOICE.md
 * against the RICH authoring files (src/*.en-US.json) — the flat dist/ strips
 * _meta/usage, so the arbitration rule (which keys off _meta.usage[]) must read
 * src. Sibling to check-no-hardcoded-copy.mjs; pure Node, no deps.
 *
 * Rules (each high-confidence; expand cautiously to avoid false positives):
 *   MECH-ellipsis   literal "..." should be "…" (U+2026)
 *   MECH-emdash     spaced "--" should be an em dash "—"
 *   MECH-hype       banned hype/AI-slop terms
 *   MECH-please     "Please" as a sentence opener
 *   MECH-inclusive  whitelist/blacklist (use allowlist/blocklist)
 *   MECH-bang       2+ exclamation marks in one string
 *   ARB-machine     exclamation mark in a machine-surface string (usage[] match)
 *
 * Modes:
 *   (default)   list violations and exit 1 — use as the CI/pre-commit gate
 *   --report    list violations and exit 0 — advisory (used until the Phase-5
 *               reword brings the corpus into compliance)
 *
 * The register-enum + audience checks are enforced by the schema (Ajv) once the
 * Phase-5.1 atomic wave lands them in _meta; this lint covers what a schema can't.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', 'src');
const REPORT_ONLY = process.argv.includes('--report');

/** A copy leaf is { value, _meta } where value is string | string[]. */
function isLeaf(n) {
  return (
    n &&
    typeof n === 'object' &&
    !Array.isArray(n) &&
    Object.prototype.hasOwnProperty.call(n, 'value') &&
    Object.prototype.hasOwnProperty.call(n, '_meta')
  );
}

/** Walk the rich tree, invoking cb(keyPath, value, meta) per string value. */
function walk(node, path, cb) {
  if (isLeaf(node)) {
    const vals = Array.isArray(node.value) ? node.value : [node.value];
    for (const v of vals) if (typeof v === 'string') cb(path, v, node._meta || {});
    return;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k, cb);
  }
}

const MACHINE_SURFACE_RE = /llms-txt|llms-full|json-ld|\.txt|feed|<system>/i;
const HYPE_RE =
  /\b(revolutioni[sz]e|unleash|seamless(?:ly)?|cutting-edge|passionate about|click here|we're sorry|game-?changer|best-in-class|next-level)\b/i;

/** Returns an array of {rule, detail} violations for one value. */
function lintValue(value, meta) {
  const out = [];
  if (value.includes('...')) out.push({ rule: 'MECH-ellipsis', detail: 'literal "..." — use "…"' });
  if (/ -- /.test(value)) out.push({ rule: 'MECH-emdash', detail: 'spaced "--" — use "—"' });
  const hype = value.match(HYPE_RE);
  if (hype) out.push({ rule: 'MECH-hype', detail: `banned term "${hype[0]}"` });
  if (/^\s*Please\b/.test(value)) out.push({ rule: 'MECH-please', detail: '"Please" as opener' });
  if (/\b(whitelist|blacklist)\b/i.test(value))
    out.push({ rule: 'MECH-inclusive', detail: 'whitelist/blacklist — use allowlist/blocklist' });
  if ((value.match(/!/g) || []).length >= 2)
    out.push({ rule: 'MECH-bang', detail: '2+ exclamation marks' });

  const usage = Array.isArray(meta.usage) ? meta.usage.join(' ') : '';
  if (MACHINE_SURFACE_RE.test(usage) && value.includes('!'))
    out.push({ rule: 'ARB-machine', detail: 'exclamation in a machine surface' });

  return out;
}

const violations = [];
for (const file of readdirSync(SRC).filter((f) => f.endsWith('.en-US.json'))) {
  const tree = JSON.parse(readFileSync(join(SRC, file), 'utf-8'));
  const ns = file.replace('.en-US.json', '');
  walk(tree, '', (keyPath, value, meta) => {
    for (const v of lintValue(value, meta)) {
      violations.push(`  ${ns}:${keyPath}  [${v.rule}] ${v.detail}`);
    }
  });
}

if (violations.length > 0) {
  const verb = REPORT_ONLY ? 'ADVISORY' : 'FAIL';
  console.error(`copy:voice — ${verb}: ${violations.length} voice/mechanics violation(s).`);
  console.error('See packages/copy/VOICE.md for the rules.\n');
  for (const v of violations) console.error(v);
  if (!REPORT_ONLY) process.exit(1);
} else {
  console.log('copy:voice — OK. No voice/mechanics violations in src/*.en-US.json.');
}
