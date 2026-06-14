/// <reference types="vitest/config" />
import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, mkdtempSync, cpSync, existsSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..', '..');
const goldenRoot = join(__dirname, 'golden');

let tempBuildDir: string;
let didRebuild = false;
let rebuildError: Error | null = null;

beforeAll(() => {
  // Rebuild Style Dictionary into the current packages/tokens/dist + repo Sources/
  // (the SD config writes there directly). After the build, we byte-diff against goldens.
  // We use the live build location rather than a temp dir to avoid the cost of mirroring
  // the whole config; the build is idempotent and deterministic for fixed source.
  try {
    execFileSync('node', [join(repoRoot, 'style-dictionary.config.mjs')], {
      cwd: join(repoRoot, 'packages', 'tokens'),
      stdio: 'pipe',
    });
    didRebuild = true;
  } catch (err) {
    rebuildError = err as Error;
  }
});

function readIfExists(path: string): string | null {
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf-8');
}

describe('Style Dictionary build is byte-identical to golden snapshots', () => {
  it('rebuilds successfully', () => {
    if (rebuildError) throw rebuildError;
    expect(didRebuild).toBe(true);
  });

  describe('dist/ outputs', () => {
    const goldenDistDir = join(goldenRoot, 'dist');
    const liveDistDir = join(repoRoot, 'packages', 'tokens', 'dist');
    const distFiles = readdirSync(goldenDistDir);

    for (const file of distFiles) {
      it(`dist/${file} matches golden`, () => {
        const golden = readFileSync(join(goldenDistDir, file), 'utf-8');
        const live = readIfExists(join(liveDistDir, file));
        expect(live, `dist/${file} is missing from build output`).not.toBeNull();
        expect(live).toBe(golden);
      });
    }
  });

  describe('Sources/LifegamesTokens/ Swift outputs', () => {
    const goldenSwiftDir = join(goldenRoot, 'swift');
    const liveSwiftDir = join(repoRoot, 'Sources', 'LifegamesTokens');
    const swiftFiles = readdirSync(goldenSwiftDir);

    for (const file of swiftFiles) {
      it(`Sources/LifegamesTokens/${file} matches golden`, () => {
        const golden = readFileSync(join(goldenSwiftDir, file), 'utf-8');
        const live = readIfExists(join(liveSwiftDir, file));
        expect(live, `Sources/LifegamesTokens/${file} is missing from build output`).not.toBeNull();
        expect(live).toBe(golden);
      });
    }
  });

  describe('Sources/LifegamesTokens/Resources/Colors.xcassets/*.colorset/Contents.json outputs', () => {
    const goldenXcassetsDir = join(goldenRoot, 'xcassets');
    const liveXcassetsDir = join(
      repoRoot,
      'Sources',
      'LifegamesTokens',
      'Resources',
      'Colors.xcassets',
    );
    const goldenFiles = readdirSync(goldenXcassetsDir);

    for (const file of goldenFiles) {
      // Golden filename is e.g. "color-pink-500.colorset.json"; live path is
      // "<colorset>/Contents.json".
      const colorset = file.replace(/\.json$/, '');
      it(`xcassets/${colorset}/Contents.json matches golden`, () => {
        const golden = readFileSync(join(goldenXcassetsDir, file), 'utf-8');
        const livePath = join(liveXcassetsDir, colorset, 'Contents.json');
        const live = readIfExists(livePath);
        expect(live, `${livePath} is missing from build output`).not.toBeNull();
        expect(live).toBe(golden);
      });
    }
  });
});
