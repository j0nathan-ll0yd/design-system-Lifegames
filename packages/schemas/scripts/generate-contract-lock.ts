#!/usr/bin/env tsx
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RAW_SCHEMAS_DIR } from './portal-contract-source.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');
const LOCK_FILE = join(PKG_ROOT, '.contract-lock.json');

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

const schemaFiles = readdirSync(RAW_SCHEMAS_DIR)
  .filter(f => f.endsWith('.schema.json'))
  .sort();

const checksums: Record<string, string> = {};
for (const file of schemaFiles) {
  const content = readFileSync(join(RAW_SCHEMAS_DIR, file), 'utf-8');
  checksums[file] = `sha256:${sha256(content)}`;
}

const combinedContent = schemaFiles
  .map(f => readFileSync(join(RAW_SCHEMAS_DIR, f), 'utf-8'))
  .join('');
const aggregateChecksum = `sha256:${sha256(combinedContent)}`;

const lock = {
  generatedFrom: {
    repo: 'j0nathan-ll0yd/mantle-LifegamesPortal',
    sha: null,
    checksum: aggregateChecksum,
  },
  generatedAt: new Date().toISOString(),
  generatorVersion: '1.0.0',
  files: checksums,
};

writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2) + '\n');
console.log(`[contract-lock] Generated ${LOCK_FILE}`);
console.log(`  upstream: ${lock.generatedFrom.repo}@${lock.generatedFrom.sha?.slice(0, 8) ?? 'unknown'}`);
console.log(`  aggregate: ${aggregateChecksum}`);
console.log(`  files: ${schemaFiles.length}`);
