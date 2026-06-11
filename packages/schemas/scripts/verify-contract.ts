#!/usr/bin/env tsx
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RAW_SCHEMAS_DIR } from './portal-contract-source.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');
const LOCK_FILE = join(PKG_ROOT, '.contract-lock.json');

const WARNING_MODE = process.env.CONTRACT_CHECK_MODE !== 'blocking';

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

if (!existsSync(LOCK_FILE)) {
  console.warn('[contract-check] No .contract-lock.json found — run `pnpm contract:generate` first');
  process.exit(WARNING_MODE ? 0 : 1);
}

const lock = JSON.parse(readFileSync(LOCK_FILE, 'utf-8'));
const expectedChecksums: Record<string, string> = lock.files ?? {};
const expectedAggregate: string = lock.generatedFrom?.checksum ?? '';

const schemaFiles = readdirSync(RAW_SCHEMAS_DIR)
  .filter(f => f.endsWith('.schema.json'))
  .sort();

let drifted = false;
const driftDetails: string[] = [];

for (const file of schemaFiles) {
  const content = readFileSync(join(RAW_SCHEMAS_DIR, file), 'utf-8');
  const actual = `sha256:${sha256(content)}`;
  const expected = expectedChecksums[file];

  if (!expected) {
    driftDetails.push(`  NEW: ${file} (not in lock file)`);
    drifted = true;
  } else if (actual !== expected) {
    driftDetails.push(`  CHANGED: ${file}`);
    driftDetails.push(`    expected: ${expected}`);
    driftDetails.push(`    actual:   ${actual}`);
    drifted = true;
  }
}

for (const file of Object.keys(expectedChecksums)) {
  if (!schemaFiles.includes(file)) {
    driftDetails.push(`  REMOVED: ${file} (in lock but not on disk)`);
    drifted = true;
  }
}

const combinedContent = schemaFiles
  .map(f => readFileSync(join(RAW_SCHEMAS_DIR, f), 'utf-8'))
  .join('');
const actualAggregate = `sha256:${sha256(combinedContent)}`;

if (actualAggregate !== expectedAggregate) {
  drifted = true;
}

if (drifted) {
  const prefix = WARNING_MODE ? 'WARNING' : 'ERROR';
  console.error(`[contract-check] ${prefix}: Schema contract drift detected!`);
  console.error(`  upstream: ${lock.generatedFrom?.repo ?? 'unknown'}`);
  console.error(`  lock generated at: ${lock.generatedAt ?? 'unknown'}`);
  console.error(`  lock SHA: ${lock.generatedFrom?.sha?.slice(0, 8) ?? 'unknown'}`);
  if (driftDetails.length > 0) {
    console.error('  Details:');
    for (const d of driftDetails) console.error(d);
  }
  console.error('');
  console.error('  To resolve: run `pnpm contract:generate` after syncing from upstream.');
  if (WARNING_MODE) {
    console.warn('[contract-check] Running in WARNING mode — not blocking merge.');
    process.exit(0);
  } else {
    console.error('[contract-check] Running in BLOCKING mode — merge blocked.');
    process.exit(1);
  }
} else {
  console.log('[contract-check] OK: Schema contract verified.');
  console.log(`  upstream: ${lock.generatedFrom?.repo ?? 'unknown'}@${lock.generatedFrom?.sha?.slice(0, 8) ?? 'unknown'}`);
  console.log(`  aggregate: ${actualAggregate}`);
}
