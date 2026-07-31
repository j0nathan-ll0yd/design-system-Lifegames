#!/usr/bin/env tsx
// mantle-cli-output: fixture generation progress for stdout
/**
 * generate.ts — @lifegames/fixtures generation pipeline.
 *
 * Produces TWO committed fixture families from the package's TS factories:
 *
 *   1. RAW (pre-adapter) → src/generated/<kebab-domain>/<variation>.json
 *      LP-export-shaped fixtures (typed from @j0nathan-ll0yd/portal-contract/schemas).
 *      Consumed by the web's Playwright CloudFront route-interception layer, which
 *      reads these files by path. Domain dirs use the kebab DIRECTORY_MAP form
 *      (githubEvents → github-events) to match the web's historical layout.
 *
 *   2. POST-ADAPTER (display) → src/post-adapter/<domain>.<variation>.json
 *      Display shapes the web's loadDashboardData consumes for the SSR shell.
 *      starredRepos is the one domain mechanically derived by running the real
 *      adaptStarredRepos with a STABLE injected clock (see post-adapter/starredRepos.ts);
 *      every other post-adapter domain is authored directly.
 *
 * Determinism: object key order is fixed by the factory source, the factory clock is
 * anchored to a stable instant (see src/factories/helpers.ts), and output is
 * prettier-formatted (idempotent). Re-running yields byte-identical files, so the
 * freshness git-diff gate stays green and the repo-wide format:check gate passes.
 */
import {existsSync, mkdirSync, readdirSync, rmSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import * as prettier from 'prettier'
import {rawFixtures} from '../src/raw'
import {fixtures} from '../src/post-adapter'

const HERE = dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = join(HERE, '..')
const GENERATED_DIR = join(PKG_ROOT, 'src', 'generated')
const POST_ADAPTER_DIR = join(PKG_ROOT, 'src', 'post-adapter')

/** camelCase raw domain key → kebab-case on-disk directory (matches the web layout). */
const DIRECTORY_MAP: Record<keyof typeof rawFixtures, string> = {
  health: 'health',
  sleep: 'sleep',
  workouts: 'workouts',
  books: 'books',
  location: 'location',
  githubEvents: 'github-events',
  starredRepos: 'github-starred-repos',
  articles: 'articles',
  focus: 'focus',
  theatreReviews: 'theatre-reviews'
}

// Format with prettier's resolved config so committed output passes the repo-wide
// `format:check` CI gate AND stays deterministic (prettier is idempotent; key order
// is fixed by the factory source). Mirrors the @lifegames/copy build.
async function writeJson(path: string, value: unknown): Promise<void> {
  const cfg = await prettier.resolveConfig(path)
  const formatted = await prettier.format(JSON.stringify(value), {...cfg, parser: 'json', filepath: path})
  writeFileSync(path, formatted, 'utf-8')
}

// ── RAW family ────────────────────────────────────────────────────────────────
// Clean the generated tree first so deleted variations don't linger (determinism).
if (existsSync(GENERATED_DIR)) {
  rmSync(GENERATED_DIR, {recursive: true, force: true})
}
mkdirSync(GENERATED_DIR, {recursive: true})

let rawCount = 0
for (const [domain, directory] of Object.entries(DIRECTORY_MAP)) {
  const variations = rawFixtures[domain as keyof typeof rawFixtures] as Record<string, unknown>
  const dir = join(GENERATED_DIR, directory)
  mkdirSync(dir, {recursive: true})
  for (const [variation, value] of Object.entries(variations)) {
    await writeJson(join(dir, `${variation}.json`), value)
    rawCount++
  }
  console.log(`fixtures:generate — raw ${domain} → generated/${directory}/ (${Object.keys(variations).length})`)
}

// ── POST-ADAPTER family ─────────────────────────────────────────────────────────
// Remove any previously generated post-adapter JSON (the .ts factories stay).
mkdirSync(POST_ADAPTER_DIR, {recursive: true})
for (const f of readdirSync(POST_ADAPTER_DIR).filter((n) => n.endsWith('.json'))) {
  rmSync(join(POST_ADAPTER_DIR, f), {force: true})
}

let postCount = 0
for (const [domain, variations] of Object.entries(fixtures)) {
  for (const [variation, value] of Object.entries(variations)) {
    await writeJson(join(POST_ADAPTER_DIR, `${domain}.${variation}.json`), value)
    postCount++
  }
  console.log(`fixtures:generate — post-adapter ${domain} → post-adapter/${domain}.*.json (${Object.keys(variations).length})`)
}

console.log(`fixtures:generate — done: ${rawCount} raw + ${postCount} post-adapter file(s).`)
