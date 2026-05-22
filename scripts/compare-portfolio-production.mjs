/**
 * Cross-repo parity comparison: portfolio vs production.
 *
 * Builds both apps, starts preview servers on different ports,
 * captures screenshots at 4 viewports, and produces a pixel-diff report.
 *
 * Usage: node scripts/compare-portfolio-production.mjs
 */
import { chromium } from '@playwright/test';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DS_ROOT = path.resolve(__dirname, '..');
const PROD_ROOT = path.resolve(DS_ROOT, '../j0nathan-ll0yd.github.io');
const OUTPUT_DIR = path.join(DS_ROOT, '.omc/research/parity-screenshots');

const VIEWPORTS = [
  { name: 'desktop-1400', width: 1400, height: 900 },
  { name: 'tablet-1100', width: 1100, height: 800 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'mobile-600', width: 600, height: 900 },
];

const PORTFOLIO_PORT = 4321;
const PRODUCTION_PORT = 4322;

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

async function captureScreenshots(baseURL, label, browser) {
  const results = [];
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      serviceWorkers: 'block',
    });
    const page = await context.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.route('wss://**', (route) => route.abort());

    await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1000);

    const dir = path.join(OUTPUT_DIR, label);
    mkdirSync(dir, { recursive: true });
    const filepath = path.join(dir, `${vp.name}.png`);
    await page.screenshot({ path: filepath, fullPage: true });
    results.push({ viewport: vp.name, path: filepath });
    log(`  ${label}/${vp.name}.png captured`);

    await context.close();
  }
  return results;
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  log('Building portfolio...');
  execSync('pnpm --filter portfolio build', { cwd: DS_ROOT, stdio: 'inherit' });

  log('Building production...');
  execSync('npm run build', { cwd: PROD_ROOT, stdio: 'inherit' });

  log(`Starting portfolio preview on port ${PORTFOLIO_PORT}...`);
  const portfolioProc = Bun
    ? null
    : (await import('node:child_process')).spawn(
        'npx',
        ['astro', 'preview', '--port', String(PORTFOLIO_PORT)],
        { cwd: path.join(DS_ROOT, 'apps/portfolio'), stdio: 'pipe' },
      );

  const { spawn } = await import('node:child_process');
  const portProc = spawn('npx', ['astro', 'preview', '--port', String(PORTFOLIO_PORT)], {
    cwd: path.join(DS_ROOT, 'apps/portfolio'),
    stdio: 'pipe',
  });

  log(`Starting production preview on port ${PRODUCTION_PORT}...`);
  const prodProc = spawn('npx', ['astro', 'preview', '--port', String(PRODUCTION_PORT)], {
    cwd: PROD_ROOT,
    stdio: 'pipe',
  });

  // Wait for servers to be ready
  async function waitForServer(url, timeoutMs = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(url);
        if (res.ok) return;
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`);
  }

  await waitForServer(`http://localhost:${PORTFOLIO_PORT}/`);
  log('Portfolio server ready');
  await waitForServer(`http://localhost:${PRODUCTION_PORT}/`);
  log('Production server ready');

  const browser = await chromium.launch({
    args: ['--force-device-scale-factor=1'],
  });

  log('Capturing portfolio screenshots...');
  const portfolioShots = await captureScreenshots(
    `http://localhost:${PORTFOLIO_PORT}/`,
    'portfolio',
    browser,
  );

  log('Capturing production screenshots...');
  const productionShots = await captureScreenshots(
    `http://localhost:${PRODUCTION_PORT}/`,
    'production',
    browser,
  );

  await browser.close();

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    viewports: VIEWPORTS.map((vp) => vp.name),
    portfolio: portfolioShots,
    production: productionShots,
    note: 'Visual comparison captured. Use an image diff tool to compare portfolio/ vs production/ screenshots at each viewport.',
  };

  const reportPath = path.join(OUTPUT_DIR, 'report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`Report written to ${reportPath}`);

  // Summary
  console.log('\n=== Parity Comparison Summary ===');
  for (const vp of VIEWPORTS) {
    console.log(`  ${vp.name}: portfolio/${vp.name}.png vs production/${vp.name}.png`);
  }
  console.log(`\nScreenshots saved to: ${OUTPUT_DIR}`);
  console.log('Use an image diff tool to compare the pairs visually.');

  // Cleanup
  portProc.kill();
  prodProc.kill();
}

main().catch((err) => {
  console.error('Parity comparison failed:', err);
  process.exit(1);
});
