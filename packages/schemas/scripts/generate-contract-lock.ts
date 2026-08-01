#!/usr/bin/env tsx
// mantle-cli-output: contract-lock generation report for stdout
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {existsSync, readdirSync, readFileSync, writeFileSync} from 'node:fs'
import {join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {RAW_SCHEMAS_DIR} from './portal-contract-source.mjs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const PKG_ROOT = resolve(__dirname, '..')
const LOCK_FILE = join(PKG_ROOT, '.contract-lock.json')

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex')
}

/**
 * Resolves the mantle-LifegamesPortal HEAD sha this lock was generated
 * against, so `generatedFrom.sha` is no longer permanently null (lp-audit
 * A3/Phase 4). Precedence:
 *   1. `--sha <sha>` CLI arg — explicit override, e.g. from a CI workflow
 *      that already knows the sha it wants pinned.
 *   2. `LP_DIR` env var pointing at a git checkout of the backend — set it
 *      in CI if a pinned upstream sha is wanted (portal-contract is now
 *      consumed from GitHub Packages, so nothing clones the backend by default).
 *   3. `/tmp/mantle-LifegamesPortal` — a conventional local clone target, if present.
 *   4. The monorepo hub sibling checkout (local dev only): both
 *      design-system-Lifegames and mantle-LifegamesPortal are symlinked
 *      siblings under ~/Repositories.
 * Returns null (never throws) if no candidate resolves — the lock file
 * remains generatable without a sha, matching prior behavior.
 */
function resolveUpstreamSha(): string | null {
  const shaArgIndex = process.argv.indexOf('--sha')
  const shaArg = process.argv[shaArgIndex + 1]
  if (shaArgIndex !== -1 && shaArg) {
    return shaArg
  }

  const candidates = [
    process.env.LP_DIR,
    '/tmp/mantle-LifegamesPortal',
    resolve(PKG_ROOT, '../../../mantle-LifegamesPortal')
  ].filter((p): p is string => Boolean(p))

  for (const dir of candidates) {
    if (!existsSync(join(dir, '.git'))) {
      continue
    }
    try {
      return execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], {encoding: 'utf-8'}).trim()
    } catch {
      // Candidate exists but isn't a usable git checkout (e.g. mid-clone) — try the next one.
      continue
    }
  }
  return null
}

const schemaFiles = readdirSync(RAW_SCHEMAS_DIR).filter((f) => f.endsWith('.schema.json')).sort()

const checksums: Record<string, string> = {}
for (const file of schemaFiles) {
  const content = readFileSync(join(RAW_SCHEMAS_DIR, file), 'utf-8')
  checksums[file] = `sha256:${sha256(content)}`
}

const combinedContent = schemaFiles.map((f) => readFileSync(join(RAW_SCHEMAS_DIR, f), 'utf-8')).join('')
const aggregateChecksum = `sha256:${sha256(combinedContent)}`

const lock = {
  generatedFrom: {repo: 'j0nathan-ll0yd/mantle-LifegamesPortal', sha: resolveUpstreamSha(), checksum: aggregateChecksum},
  generatedAt: new Date().toISOString(),
  generatorVersion: '1.0.0',
  files: checksums
}

writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2) + '\n')
console.log(`[contract-lock] Generated ${LOCK_FILE}`)
console.log(`  upstream: ${lock.generatedFrom.repo}@${lock.generatedFrom.sha?.slice(0, 8) ?? 'unknown'}`)
console.log(`  aggregate: ${aggregateChecksum}`)
console.log(`  files: ${schemaFiles.length}`)
