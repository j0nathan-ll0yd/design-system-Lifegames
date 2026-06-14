/**
 * Visual parity: apps/portfolio (in-DS preview) vs the frozen live-site baseline.
 *
 * What this does:
 *   1. Starts a preview server for apps/portfolio (assumes it has been built).
 *   2. Captures full-page screenshots at the 4 baseline viewports.
 *   3. For each viewport, diffs against apps/portfolio/tests/visual/baselines-live/
 *      using ImageMagick `compare -metric AE`.
 *   4. Reports per-viewport pixel-diff counts; exits non-zero if any viewport
 *      exceeds the threshold.
 *
 * Why:
 *   apps/portfolio is the in-monorepo preview of the production portfolio site.
 *   The baselines-live/ PNGs are pinned to j0nathan-ll0yd.github.io@56da36cc
 *   (see baselines-live/README.md). This script answers: "does the in-DS
 *   preview still match the production look after a DS package change?"
 *
 * Usage:
 *   pnpm --filter @lifegames/portfolio build  # ensure apps/portfolio/dist exists
 *   node scripts/compare-portfolio-baseline.mjs
 *
 * Replaces the older cross-repo script (compare-portfolio-production.mjs) that
 * spun up both apps/portfolio AND the github.io repo. With the cross-repo
 * consumption model, github.io now CONSUMES the DS packages, so the parity
 * oracle is the frozen baseline rather than a live cross-repo build.
 */
import { chromium } from '@playwright/test';
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DS_ROOT = path.resolve(__dirname, '..');
const PORTFOLIO_DIST = path.join(DS_ROOT, 'apps/portfolio/dist');
const BASELINES_DIR = path.join(DS_ROOT, 'apps/portfolio/tests/visual/baselines-live');
const STABILIZATION_CSS = path.join(DS_ROOT, 'apps/portfolio/tests/visual/screenshot.css');
const OUTPUT_DIR = path.join(DS_ROOT, '.omc/research/parity-screenshots');
const PORT = 4500;
const BASE_URL = `http://localhost:${PORT}`;
const MAX_DIFF_PIXEL_RATIO = 0.025;

const VIEWPORTS = [
  { name: 'desktop-1400', width: 1400, height: 900 },
  { name: 'tablet-1100', width: 1100, height: 800 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'mobile-600', width: 600, height: 900 },
];

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  process.stdout.write(`[${ts}] ${msg}\n`);
}

function preflight() {
  if (!existsSync(PORTFOLIO_DIST)) {
    log(`ERROR: ${PORTFOLIO_DIST} does not exist.`);
    log(`Run: pnpm --filter @lifegames/portfolio build`);
    process.exit(2);
  }
  if (!existsSync(BASELINES_DIR)) {
    log(`ERROR: baselines directory not found: ${BASELINES_DIR}`);
    process.exit(2);
  }
  for (const vp of VIEWPORTS) {
    const baseline = path.join(BASELINES_DIR, `dashboard-${vp.name}.png`);
    if (!existsSync(baseline)) {
      log(`ERROR: missing baseline ${baseline}`);
      process.exit(2);
    }
  }
}

async function startPreview() {
  log(`Starting apps/portfolio preview on :${PORT}…`);
  const proc = spawn('npx', ['astro', 'preview', '--port', String(PORT)], {
    cwd: path.join(DS_ROOT, 'apps/portfolio'),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // Wait for "Local" line in stdout, or 30s timeout
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('preview start timeout')), 30_000);
    proc.stdout.on('data', (chunk) => {
      if (chunk.toString().includes(`localhost:${PORT}`)) {
        clearTimeout(timeout);
        resolve();
      }
    });
    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
  log(`Preview ready.`);
  return proc;
}

async function captureScreenshots() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const stylesheet = readFileSync(STABILIZATION_CSS, 'utf-8');
  const browser = await chromium.launch({ args: ['--force-device-scale-factor=1'] });
  const captured = [];
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      serviceWorkers: 'block',
      reducedMotion: 'reduce',
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    log(`[${vp.name}] navigating…`);
    await page.goto(BASE_URL + '/', { waitUntil: 'load', timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);
    try {
      await page.waitForFunction(() => document.querySelectorAll('.is-loading').length === 0, {
        timeout: 10_000,
      });
    } catch {
      /* fixture-less; skeletons may persist — OK for parity smoke */
    }
    await page.addStyleTag({ content: stylesheet });
    await page
      .waitForFunction(
        () => {
          const h = document.documentElement.scrollHeight;
          return new Promise((r) =>
            setTimeout(() => r(document.documentElement.scrollHeight === h), 200),
          );
        },
        { timeout: 5_000 },
      )
      .catch(() => {});
    const out = path.join(OUTPUT_DIR, `portfolio-${vp.name}.png`);
    await page.screenshot({
      path: out,
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    });
    captured.push({ viewport: vp, capture: out });
    await ctx.close();
  }
  await browser.close();
  return captured;
}

function diffPixels(actual, expected) {
  // ImageMagick `compare -metric AE` returns the absolute count of differing pixels.
  // Writes the diff visualization to outDiff. Returns { diffPixels, totalPixels }.
  const outDiff = actual.replace(/\.png$/, '.diff.png');
  let diffPixels = 0;
  try {
    execFileSync('magick', ['compare', '-metric', 'AE', actual, expected, outDiff], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    // magick exits 1 when images differ but the metric is still on stderr
    const msg = e.stderr?.toString() ?? '';
    const m = msg.match(/^(\d+(?:\.\d+)?(?:e[+-]?\d+)?)/);
    if (m) diffPixels = parseFloat(m[1]);
    else throw e;
  }
  // Total pixels = baseline width * height
  const { width, height } = pngSize(expected);
  return { diffPixels, totalPixels: width * height, outDiff };
}

function pngSize(file) {
  // Minimal PNG header parser: bytes 16-23 contain width and height (big-endian uint32 each).
  const buf = readFileSync(file);
  if (!buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    throw new Error(`not a PNG: ${file}`);
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

async function main() {
  preflight();
  const preview = await startPreview();
  let captured;
  try {
    captured = await captureScreenshots();
  } finally {
    preview.kill();
  }

  log('--- Parity report ---');
  let anyFail = false;
  for (const { viewport, capture } of captured) {
    const baseline = path.join(BASELINES_DIR, `dashboard-${viewport.name}.png`);
    const { diffPixels, totalPixels, outDiff } = diffPixels$wrap(capture, baseline);
    const ratio = diffPixels / totalPixels;
    const verdict = ratio <= MAX_DIFF_PIXEL_RATIO ? 'PASS' : 'FAIL';
    if (verdict === 'FAIL') anyFail = true;
    log(
      `${verdict} ${viewport.name}: ${diffPixels.toLocaleString()}/${totalPixels.toLocaleString()} px (${(ratio * 100).toFixed(2)}%) | diff: ${outDiff}`,
    );
  }

  if (anyFail) {
    log(
      `Threshold: ${(MAX_DIFF_PIXEL_RATIO * 100).toFixed(1)}%. Some viewports exceeded threshold.`,
    );
    log(
      `Note: apps/portfolio uses skeleton states by default; diff vs LIVE production may be expected.`,
    );
    log(
      `Inspect diff PNGs in ${OUTPUT_DIR} to determine whether differences are structural or data-driven.`,
    );
    process.exit(1);
  }
  log('All viewports within threshold.');
}

// Workaround: ESM doesn't allow function declarations with the same name as a variable.
const diffPixels$wrap = diffPixels;

main().catch((err) => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
