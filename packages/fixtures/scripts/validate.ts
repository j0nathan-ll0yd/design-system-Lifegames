#!/usr/bin/env tsx
// mantle-cli-output: fixture validation report for stdout
/**
 * validate.ts — @lifegames/fixtures Ajv validation gate.
 *
 * Validates the committed fixture output produced by generate.ts:
 *   - RAW: every src/generated/<dir>/*.json against its portal-contract raw export
 *     schema (resolved on disk from @lifegames/portal-contract/raw-schemas/).
 *   - POST-ADAPTER: every src/post-adapter/<domain>.*.json against the matching
 *     @lifegames/schemas authored/ or generated/ display schema (by title).
 *
 * Mapping comes from the package-local fixture-map.json (a deliberate, documented
 * decision NOT to overload @lifegames/schemas/fixture-map.json). starredRepos is an
 * AdaptedStarredRepo[] with no standalone post-adapter schema, so it is covered by
 * the package vitest rather than Ajv here.
 *
 * Strict-ish: schemas declare additionalProperties:false where authored, so unknown
 * fields fail. Exits non-zero on any failure; wired into `pnpm build` so a bad
 * fixture cannot be committed/published. Run after generate.ts.
 */
import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createRequire} from 'node:module'
import {Ajv, type ErrorObject} from 'ajv'
import addFormats from 'ajv-formats'

const HERE = dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = resolve(HERE, '..')
const GENERATED_DIR = join(PKG_ROOT, 'src', 'generated')
const POST_ADAPTER_DIR = join(PKG_ROOT, 'src', 'post-adapter')

const require = createRequire(import.meta.url)

// Raw export schemas ship inside @lifegames/portal-contract under raw-schemas/.
const RAW_SCHEMAS_DIR = dirname(require.resolve('@lifegames/portal-contract/raw-schemas/index.json'))

// @lifegames/schemas exposes only its '.' entry; derive the package root from it to
// reach the committed authored/ + generated/ display schemas.
const SCHEMAS_MAIN = require.resolve('@lifegames/schemas')
const SCHEMAS_ROOT = resolve(dirname(SCHEMAS_MAIN), '..', '..')
const SCHEMAS_AUTHORED = join(SCHEMAS_ROOT, 'authored')
const SCHEMAS_GENERATED = join(SCHEMAS_ROOT, 'generated')

interface FixtureMap {
  raw: Record<string, string>
  postAdapter: Record<string, string>
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf-8'))
}

const fixtureMap = readJson(join(PKG_ROOT, 'fixture-map.json')) as FixtureMap

const ajv = new Ajv({strict: false, allErrors: true, allowUnionTypes: true})
// ajv-formats is CJS with a callable default under tsx's esModuleInterop.
addFormats(ajv)

type ValidatorFn = ReturnType<Ajv['compile']>

const errors: Array<{fixture: string; schema: string; ajvErrors?: ErrorObject[] | null; error?: string}> = []
let total = 0

function validateFile(fixturePath: string, validate: ValidatorFn, schemaLabel: string): void {
  total++
  let data: unknown
  try {
    data = readJson(fixturePath)
  } catch (e) {
    errors.push({fixture: fixturePath, schema: schemaLabel, error: (e as Error).message})
    return
  }
  if (!validate(data)) {
    errors.push({fixture: fixturePath, schema: schemaLabel, ajvErrors: validate.errors})
  }
}

// ── RAW family ────────────────────────────────────────────────────────────────
for (const [dir, schemaFile] of Object.entries(fixtureMap.raw)) {
  if (dir.startsWith('_')) {
    continue
  }
  const schemaPath = join(RAW_SCHEMAS_DIR, schemaFile)
  const validate = ajv.compile(readJson(schemaPath) as object)
  const domainDir = join(GENERATED_DIR, dir)
  if (!existsSync(domainDir)) {
    errors.push({fixture: domainDir, schema: schemaFile, error: 'generated directory missing'})
    continue
  }
  for (const f of readdirSync(domainDir).filter((n) => n.endsWith('.json'))) {
    validateFile(join(domainDir, f), validate, schemaFile)
  }
}

// ── POST-ADAPTER family ─────────────────────────────────────────────────────────
function loadDisplaySchema(title: string): object {
  // Resolve by schema title across authored/ then generated/.
  for (const dir of [SCHEMAS_AUTHORED, SCHEMAS_GENERATED]) {
    if (!existsSync(dir)) {
      continue
    }
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.schema.json'))) {
      const schema = readJson(join(dir, f)) as {title?: string}
      if (schema.title === title) {
        return schema as object
      }
    }
  }
  throw new Error(`post-adapter schema titled "${title}" not found in authored/ or generated/`)
}

for (const [domain, title] of Object.entries(fixtureMap.postAdapter)) {
  if (domain.startsWith('_')) {
    continue
  }
  const validate = ajv.compile(loadDisplaySchema(title))
  const prefix = `${domain}.`
  const files = existsSync(POST_ADAPTER_DIR)
    ? readdirSync(POST_ADAPTER_DIR).filter((n) => n.startsWith(prefix) && n.endsWith('.json'))
    : []
  if (files.length === 0) {
    errors.push({fixture: `${POST_ADAPTER_DIR}/${prefix}*.json`, schema: title, error: 'no post-adapter fixtures found'})
    continue
  }
  for (const f of files) {
    validateFile(join(POST_ADAPTER_DIR, f), validate, title)
  }
}

// ── Report ──────────────────────────────────────────────────────────────────────
if (errors.length > 0) {
  process.stderr.write(`\n[fixtures:validate] FAIL: ${errors.length} of ${total} fixture(s) failed.\n\n`)
  for (const e of errors) {
    process.stderr.write(`  x ${e.fixture} (${e.schema})\n`)
    if (e.ajvErrors) {
      for (const err of e.ajvErrors.slice(0, 5)) {
        process.stderr.write(`    - ${err.instancePath || '(root)'}: ${err.keyword} — ${err.message}\n`)
      }
      if (e.ajvErrors.length > 5) {
        process.stderr.write(`    ... (+${e.ajvErrors.length - 5} more)\n`)
      }
    } else if (e.error) {
      process.stderr.write(`    - ${e.error}\n`)
    }
  }
  process.exit(1)
}

process.stdout.write(`[fixtures:validate] OK: ${total} fixture(s) validated successfully.\n`)
