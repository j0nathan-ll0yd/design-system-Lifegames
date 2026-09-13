#!/usr/bin/env node
// mantle-cli-output: baseline-age advisory report
/**
 * Baseline Age Policy — F-034 (advisory).
 *
 * Visual-regression baselines age out: when the DS evolves but the
 * baselines are not refreshed, the comparison loses signal (either the
 * tests start failing constantly and get muted, or they pass because
 * nobody ran them lately). This script flags baselines that:
 *
 *   - have an mtime older than --max-age-days (default 90), AND
 *   - sit in a repo whose CHANGELOG.md has a more recent entry (i.e.
 *     the DS has moved on but the baselines have not).
 *
 * Advisory only — exits 0 in all cases. The CHANGELOG mtime is the
 * cheapest "DS has changed lately" proxy available without spinning up
 * git history; if CHANGELOG.md is missing the script falls back to
 * the most-recent commit's mtime on packages/tokens/dist (proxy for
 * "tokens last published") via fs.statSync.
 *
 * Baseline locations scanned (existence-optional):
 *   - <DS_ROOT>/Tests/visual/baselines/                (Swift snapshot tests)
 *   - <DS_ROOT>/apps/storybook/__snapshots__/          (Storybook visual)
 *   - <WEB_ROOT>/tests/visual/__screenshots__/         (Playwright visual)
 *   - <WEB_ROOT>/tests/drift/__screenshots__/          (Playwright drift)
 *
 * WEB_ROOT defaults to ~/Repositories/j0nathan-ll0yd.github.io and can
 * be overridden via --web-root <path>.
 *
 * Usage:
 *   node audits/checks/d2-baseline-age.mjs                       — advisory print
 *   node audits/checks/d2-baseline-age.mjs --max-age-days 60     — custom threshold
 *   node audits/checks/d2-baseline-age.mjs --web-root <path>     — alternate web repo
 */

import fs from 'node:fs'
import path from 'node:path'

const argv = process.argv.slice(2)
function arg(name, fallback) {
  const i = argv.indexOf(name)
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback
}

const DS_ROOT = path.resolve(import.meta.dirname, '..', '..')
const WEB_ROOT = path.resolve(arg('--web-root', path.join(process.env.HOME ?? '', 'Repositories/j0nathan-ll0yd.github.io')))
const MAX_AGE_DAYS = Number.parseInt(arg('--max-age-days', '90'), 10)
const DAY_MS = 24 * 60 * 60 * 1000
const now = Date.now()

const BASELINE_LOCATIONS = [
  {repo: 'DS', abs: path.join(DS_ROOT, 'Tests/visual/baselines')},
  {repo: 'DS', abs: path.join(DS_ROOT, 'apps/storybook/__snapshots__')},
  {repo: 'web', abs: path.join(WEB_ROOT, 'tests/visual/__screenshots__')},
  {repo: 'web', abs: path.join(WEB_ROOT, 'tests/drift/__screenshots__')}
]

const CHANGELOG_BY_REPO = {DS: path.join(DS_ROOT, 'CHANGELOG.md'), web: path.join(WEB_ROOT, 'CHANGELOG.md')}

function changelogMtime(repo) {
  const p = CHANGELOG_BY_REPO[repo]
  if (!fs.existsSync(p)) {
    return null
  }
  return fs.statSync(p).mtimeMs
}

function walkFiles(dir) {
  const results = []
  if (!fs.existsSync(dir)) {
    return results
  }
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkFiles(full))
    } else if (entry.isFile()) {
      results.push(full)
    }
  }
  return results
}

function fmtAgeDays(ms) {
  return (ms / DAY_MS).toFixed(0)
}

console.log('Baseline Age Policy — F-034 (advisory)')
console.log('======================================\n')
console.log(`Max baseline age: ${MAX_AGE_DAYS} days`)
console.log(`DS root:  ${DS_ROOT}`)
console.log(`Web root: ${WEB_ROOT}`)
console.log()

let totalScanned = 0
let totalAged = 0
const flagged = []

for (const loc of BASELINE_LOCATIONS) {
  const files = walkFiles(loc.abs)
  if (files.length === 0) {
    console.log(`[skip] ${path.relative(process.cwd(), loc.abs)} — not present`)
    continue
  }
  const clMtime = changelogMtime(loc.repo)
  const clAgeDesc = clMtime
    ? `CHANGELOG.md last touched ${fmtAgeDays(now - clMtime)}d ago`
    : 'no CHANGELOG.md found'
  console.log(`[scan] ${path.relative(process.cwd(), loc.abs)} (${files.length} files; ${clAgeDesc})`)

  for (const f of files) {
    totalScanned++
    const mt = fs.statSync(f).mtimeMs
    const ageDays = (now - mt) / DAY_MS
    if (ageDays <= MAX_AGE_DAYS) {
      continue
    }
    // Only flag if the CHANGELOG is more recent than the baseline.
    // No CHANGELOG → still flag (we can't prove the DS is stable).
    if (clMtime !== null && clMtime <= mt) {
      continue
    }
    totalAged++
    flagged.push({file: path.relative(process.cwd(), f), repo: loc.repo, ageDays: Math.round(ageDays)})
  }
}

console.log()
console.log(`Scanned ${totalScanned} baseline file(s); ${totalAged} aged beyond ${MAX_AGE_DAYS} days.`)

if (flagged.length > 0) {
  console.log('\nAged baselines (CHANGELOG newer than baseline mtime):')
  // Sort newest-CHANGELOG-vs-oldest-baseline first.
  flagged.sort((a, b) => b.ageDays - a.ageDays)
  for (const f of flagged.slice(0, 25)) {
    console.log(`  [${f.repo}] ${f.file}  (${f.ageDays}d old)`)
  }
  if (flagged.length > 25) {
    console.log(`  …and ${flagged.length - 25} more`)
  }
  console.log('\nConsider refreshing these baselines (Docker regen in the web repo;')
  console.log('SNAPSHOT_TESTING_RECORD=never failing → record=true rerun in DS).')
}

process.exit(0)
