#!/usr/bin/env tsx
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');
const VENDORED_DIR = join(PKG_ROOT, 'vendored');
const LOCK_FILE = join(PKG_ROOT, '.contract-lock.json');

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

function getLpGitSha(): string | null {
  const manifestPath = join(VENDORED_DIR, '.lp-sync-manifest.json');
  if (!existsSync(manifestPath)) return null;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  return manifest.lpGitSha ?? null;
}

const schemaFiles = readdirSync(VENDORED_DIR)
  .filter(f => f.endsWith('.schema.json'))
  .sort();

const checksums: Record<string, string> = {};
for (const file of schemaFiles) {
  const content = readFileSync(join(VENDORED_DIR, file), 'utf-8');
  checksums[file] = `sha256:${sha256(content)}`;
}

const combinedContent = schemaFiles
  .map(f => readFileSync(join(VENDORED_DIR, f), 'utf-8'))
  .join('');
const aggregateChecksum = `sha256:${sha256(combinedContent)}`;

const lock = {
  generatedFrom: {
    repo: 'j0nathan-ll0yd/mantle-LifegamesPortal',
    sha: getLpGitSha(),
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
