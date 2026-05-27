#!/usr/bin/env node
// Opens claude.ai/design and reveals the generated DESIGN.md in Finder so the
// user can drag-and-drop it into the design system upload panel.
//
// Sync is intentionally manual: Claude Design has no public import API, so the
// best we can do is make the upload ritual one command + one drag.

import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(__filename), '..');
const designMd = resolve(repoRoot, 'packages/tokens/dist/DESIGN.md');
const tokensCss = resolve(repoRoot, 'packages/tokens/dist/tokens.css');

const CLAUDE_DESIGN_URL = 'https://claude.ai/design/p/b34ba66c-2605-4126-9c75-ab6cdafd5734';

if (!existsSync(designMd)) {
  console.error('DESIGN.md not found. Run `pnpm build:tokens` first.');
  console.error(`  Expected at: ${designMd}`);
  process.exit(1);
}

console.log('Lifegames Design System → Claude Design sync');
console.log('');
console.log('Artifacts to upload:');
console.log(`  1. ${designMd}`);
console.log(`  2. ${tokensCss}  (optional — gives Claude the resolved CSS variables)`);
console.log('');
console.log('Ritual:');
console.log('  1. Browser opens to the Lifegames design system in claude.ai/design.');
console.log('  2. Finder reveals DESIGN.md.');
console.log('  3. Drag DESIGN.md into the design system "Add assets" / chat panel.');
console.log('  4. Prompt: "Update the design system from this DESIGN.md."');
console.log('  5. Toggle Published once Claude finishes ingesting.');
console.log('');

if (process.platform === 'darwin') {
  spawnSync('open', [CLAUDE_DESIGN_URL]);
  spawnSync('open', ['-R', designMd]);
  console.log('Opened browser and Finder.');
} else {
  console.log(`Open manually: ${CLAUDE_DESIGN_URL}`);
}
