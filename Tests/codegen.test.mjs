#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const goldenDir = path.join(__dirname, 'golden-mdx');

const goldenFiles = [
  { widget: 'streak-counter', file: 'github/streak-counter.mdx' },
  { widget: 'heart-rate', file: 'health/heart-rate.mdx' },
  { widget: 'place-leaderboard-v3', file: 'location/place-leaderboard-v3.mdx' },
];

function parseCodegenOutput(output) {
  const blocks = {};
  const parts = output.split(/^--- FILE: /m).filter(Boolean);
  for (const part of parts) {
    const newlineIdx = part.indexOf('\n');
    const header = part.slice(0, newlineIdx).replace(' ---', '').trim();
    const content = part.slice(newlineIdx + 1);
    blocks[header] = content;
  }
  return blocks;
}

let failures = 0;

for (const { widget, file } of goldenFiles) {
  const output = execSync(
    `node scripts/generate-widget-docs.mjs --dry-run --emit-stdout --widget=${widget}`,
    { cwd: ROOT, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
  );

  const blocks = parseCodegenOutput(output);
  const golden = fs.readFileSync(path.join(goldenDir, file), 'utf-8');
  const actual = blocks[file];

  if (!actual) {
    console.error(`FAIL: ${file} -- not found in codegen output`);
    console.error(`  Available keys: ${Object.keys(blocks).join(', ')}`);
    failures++;
  } else if (actual !== golden) {
    console.error(`FAIL: ${file} -- content differs from golden file`);
    const goldenLines = golden.split('\n');
    const actualLines = actual.split('\n');
    for (let i = 0; i < Math.max(goldenLines.length, actualLines.length); i++) {
      if (goldenLines[i] !== actualLines[i]) {
        console.error(`  First diff at line ${i + 1}:`);
        console.error(`    golden: ${JSON.stringify(goldenLines[i])}`);
        console.error(`    actual: ${JSON.stringify(actualLines[i])}`);
        break;
      }
    }
    failures++;
  } else {
    console.log(`PASS: ${file}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} golden-file test(s) failed`);
  process.exit(1);
} else {
  console.log(`\nAll ${goldenFiles.length} golden-file tests passed`);
}
