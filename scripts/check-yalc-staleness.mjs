#!/usr/bin/env node
// mantle-cli-output: yalc staleness check report for stdout
/**
 * Yalc Staleness Detector — F-020 supplementary.
 *
 * When the DS is published via yalc to downstream consumers (web, ios-staging
 * docs), there is no version bump to signal "the bytes you have are stale".
 * This script gives both sides a content fingerprint so drift is detectable:
 *
 *   DS-side (--write)
 *     Compute SHA-256 over the contents of packages/tokens/dist/ and write
 *     it to .yalc-content-hash at the repo root. Each `yalc:publish` (and
 *     each CI build) should write a fresh hash so the published bytes carry
 *     a known fingerprint.
 *
 *   Consumer-side (--check)
 *     Compute SHA-256 over the contents of .yalc/@lifegames/tokens/dist/
 *     inside the consumer repo and compare it to the .yalc-content-hash
 *     file shipped under that same yalc-linked package root. Mismatch =
 *     consumer has stale bytes; user should `yalc update`.
 *
 * Usage:
 *   node scripts/check-yalc-staleness.mjs --write    — write .yalc-content-hash
 *   node scripts/check-yalc-staleness.mjs            — print computed hash, exit 0
 *   node scripts/check-yalc-staleness.mjs --check    — exit 1 if hash file missing
 *                                                      or out-of-sync with current dist
 *   node scripts/check-yalc-staleness.mjs --consumer <consumerRoot>
 *     Same as --check but compares against the consumer's yalc copy at
 *     <consumerRoot>/.yalc/@lifegames/tokens/.yalc-content-hash. Useful as a
 *     postinstall hook in the consumer.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const MODE_WRITE = args.includes('--write');
const MODE_CHECK = args.includes('--check');
const CONSUMER_IDX = args.indexOf('--consumer');
const CONSUMER_ROOT = CONSUMER_IDX !== -1 ? args[CONSUMER_IDX + 1] : null;

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST_DIR = path.join(ROOT, 'packages/tokens/dist');
const HASH_FILE_NAME = '.yalc-content-hash';
// Repo-root hash — DS self-check on local dist drift.
const HASH_FILE = path.join(ROOT, HASH_FILE_NAME);
// Package-local hash — travels with yalc publish so consumers can verify
// the bytes they have match what the DS shipped.
const PACKAGE_HASH_FILE = path.join(ROOT, 'packages/tokens', HASH_FILE_NAME);

function walkFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results.sort();
}

function hashDir(dir) {
  const files = walkFiles(dir);
  const hasher = crypto.createHash('sha256');
  for (const f of files) {
    const rel = path.relative(dir, f);
    hasher.update(rel);
    hasher.update('\0');
    hasher.update(fs.readFileSync(f));
    hasher.update('\0');
  }
  return { sha: hasher.digest('hex'), fileCount: files.length };
}

function fmt(sha) {
  return sha.slice(0, 12);
}

// ── consumer mode: compare DS-shipped hash to consumer's local yalc dist ──────
if (CONSUMER_ROOT) {
  const yalcRoot = path.resolve(
    CONSUMER_ROOT,
    '.yalc/@lifegames/tokens'
  );
  const shippedHashFile = path.join(yalcRoot, HASH_FILE_NAME);
  const yalcDist = path.join(yalcRoot, 'dist');

  if (!fs.existsSync(yalcRoot)) {
    console.log(`No yalc linkage at ${yalcRoot} — skip.`);
    process.exit(0);
  }
  if (!fs.existsSync(shippedHashFile)) {
    console.log(
      `WARN: ${shippedHashFile} missing — the DS publish did not write a content hash. ` +
        `Run \`pnpm yalc:publish\` from the DS repo, then \`yalc update\` here.`
    );
    process.exit(MODE_CHECK ? 1 : 0);
  }
  const expected = fs.readFileSync(shippedHashFile, 'utf-8').trim();
  const { sha: actual, fileCount } = hashDir(yalcDist);

  if (expected === actual) {
    console.log(
      `Yalc OK — @lifegames/tokens consumer dist matches DS-published hash ${fmt(actual)} (${fileCount} files).`
    );
    process.exit(0);
  }
  console.log(
    `Yalc DRIFT — @lifegames/tokens consumer dist hash ${fmt(actual)} ` +
      `does not match DS-published hash ${fmt(expected)} (${fileCount} files).`
  );
  console.log('Run `yalc update` to refresh, or `pnpm yalc:publish` from the DS if you just rebuilt.');
  process.exit(MODE_CHECK ? 1 : 0);
}

// ── DS-side modes ─────────────────────────────────────────────────────────────
if (!fs.existsSync(DIST_DIR)) {
  console.error(
    `ERROR: ${DIST_DIR} does not exist. Run \`pnpm build:tokens\` first.`
  );
  process.exit(1);
}

const { sha: currentHash, fileCount } = hashDir(DIST_DIR);

if (MODE_WRITE) {
  fs.writeFileSync(HASH_FILE, currentHash + '\n');
  fs.writeFileSync(PACKAGE_HASH_FILE, currentHash + '\n');
  console.log(
    `Wrote ${HASH_FILE_NAME} = ${fmt(currentHash)} (${fileCount} files under packages/tokens/dist/).`
  );
  console.log(
    `Also wrote packages/tokens/${HASH_FILE_NAME} so the hash travels with yalc publish.`
  );
  process.exit(0);
}

if (MODE_CHECK) {
  if (!fs.existsSync(HASH_FILE)) {
    console.error(
      `ERROR: ${HASH_FILE_NAME} missing. Run \`node scripts/check-yalc-staleness.mjs --write\` ` +
        `(or pnpm yalc:publish, which should invoke it) to record the current hash.`
    );
    process.exit(1);
  }
  const stored = fs.readFileSync(HASH_FILE, 'utf-8').trim();
  if (stored === currentHash) {
    console.log(
      `${HASH_FILE_NAME} OK — ${fmt(currentHash)} (${fileCount} files).`
    );
    process.exit(0);
  }
  console.error(
    `STALE: ${HASH_FILE_NAME} = ${fmt(stored)} but current dist hashes to ${fmt(currentHash)} ` +
      `(${fileCount} files). Run \`node scripts/check-yalc-staleness.mjs --write\` after rebuild ` +
      `and re-publish via \`pnpm yalc:publish\`.`
  );
  process.exit(1);
}

// Default mode — print and exit 0.
console.log(
  `packages/tokens/dist/ sha256 = ${currentHash}  (${fileCount} files)`
);
process.exit(0);
