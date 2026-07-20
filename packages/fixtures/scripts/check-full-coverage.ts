// mantle-cli-output: full-variation coverage check
/**
 * check-full-coverage.ts — @lifegames/fixtures full-variation coverage oracle.
 *
 * For each raw domain in fixture-map.json (excluding WALKER_EXCEPTIONS), loads the
 * domain's raw-export schema and its full.json fixture, then runs a two-condition
 * recursive walker:
 *   (a) Optional-key presence: every property NOT in schema required[] must exist
 *       (not undefined) in the fixture.
 *   (b) Nullable-value non-nullness: every property IN schema required[] with an
 *       anyOf:[T, {type:'null'}] schema must carry a non-null value in the fixture.
 *
 * Fail-closed guard: every non-excepted domain must yield >=1 check. A domain that
 * produces zero checks indicates a silent no-op and exits non-zero.
 *
 * Expected: 9 domains checked (all raw domains except focus, which is WALKER_EXCEPTED).
 */
import {existsSync, readFileSync} from 'node:fs'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createRequire} from 'node:module'

import {WALKER_EXCEPTIONS} from '../src/reserved-variations.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = resolve(HERE, '..')
const GENERATED_DIR = join(PKG_ROOT, 'src', 'generated')

const require = createRequire(import.meta.url)

// Mirror validate.ts: resolve raw-schemas dir from portal-contract package.
const RAW_SCHEMAS_DIR = dirname(require.resolve('@lifegames/portal-contract/raw-schemas/index.json'))

interface FixtureMap {
  raw: Record<string, string>
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf-8'))
}

const fixtureMap = readJson(join(PKG_ROOT, 'fixture-map.json')) as FixtureMap

// ── Schema type helpers ───────────────────────────────────────────────────────

interface JsonSchema {
  type?: string | string[]
  properties?: Record<string, JsonSchema>
  required?: string[]
  additionalProperties?: boolean | JsonSchema
  items?: JsonSchema
  anyOf?: JsonSchema[]
  oneOf?: JsonSchema[]
  allOf?: JsonSchema[]
  const?: unknown
}

/**
 * Returns true when schema is exactly anyOf:[T, {type:'null'}] (the two-element
 * nullable pattern used throughout portal-contract raw-export schemas).
 */
function isNullableAnyOf(schema: JsonSchema): boolean {
  if (!Array.isArray(schema.anyOf) || schema.anyOf.length !== 2) {
    return false
  }
  return schema.anyOf.some((s) => s.type === 'null')
}

/**
 * Unwraps anyOf:[T, {type:'null'}] → T. Returns the schema unchanged for any
 * other pattern.
 */
function resolveNullableAnyOf(schema: JsonSchema): JsonSchema {
  if (!isNullableAnyOf(schema)) {
    return schema
  }
  const nonNull = schema.anyOf!.find((s) => s.type !== 'null')
  return nonNull ?? schema
}

// ── Check accumulator ─────────────────────────────────────────────────────────

interface Check {
  type: 'optional-key' | 'nullable-non-null'
  path: string
}

interface Failure {
  path: string
  domain: string
  reason: string
}

// ── Recursive walker ──────────────────────────────────────────────────────────

function walkSchema(schema: JsonSchema, fixture: unknown, path: string, domain: string, checks: Check[], failures: Failure[]): void {
  if (!schema.properties) {
    return // no named properties to enumerate
  }

  const required = new Set(schema.required ?? [])
  const fixtureObj = fixture as Record<string, unknown> | null | undefined

  for (const [key, propSchema] of Object.entries(schema.properties)) {
    const childPath = path ? `${path}.${key}` : key
    const exceptionKey = `${domain}.${childPath}`

    // Honor sub-path exceptions (e.g. health.quantities).
    if (Object.prototype.hasOwnProperty.call(WALKER_EXCEPTIONS, exceptionKey)) {
      // Intentionally not descending — exception explains why.
      continue
    }

    const fixtureValue = fixtureObj != null ? fixtureObj[key] : undefined

    // CONDITION (a): Optional-key presence
    // Key is in properties but NOT in required[] => truly optional key.
    if (!required.has(key)) {
      checks.push({type: 'optional-key', path: childPath})
      if (fixtureValue === undefined) {
        failures.push({path: childPath, domain, reason: `optional key "${key}" is missing (undefined) in full.json`})
      }
    }

    // CONDITION (b): Nullable-value non-nullness
    // Key IS in required[] but schema is anyOf:[T, {type:'null'}].
    if (required.has(key) && isNullableAnyOf(propSchema)) {
      checks.push({type: 'nullable-non-null', path: childPath})
      if (fixtureValue === null) {
        failures.push({path: childPath, domain, reason: `nullable-but-required field "${key}" is null in full.json`})
      }
    }

    // Recurse: unwrap nullable anyOf to reach the inner schema.
    const resolved = resolveNullableAnyOf(propSchema)

    // Warn and skip complex polymorphism (oneOf, allOf, or anyOf with >2 members
    // that is NOT the simple nullable pattern). These are not present in current
    // portal-contract raw schemas but the guard prevents silent breakage.
    const hasComplexPoly = resolved.oneOf !== undefined || resolved.allOf !== undefined || (resolved.anyOf !== undefined && !isNullableAnyOf(resolved))
    if (hasComplexPoly) {
      process.stderr.write(
        `[fixtures:check-full-coverage] WARN: ${domain}.${childPath} uses complex ` + `oneOf/allOf/anyOf — skipping (not a null-pattern)\n`
      )
      continue
    }

    // Recurse into nested objects.
    if (resolved.type === 'object' && resolved.properties) {
      walkSchema(resolved, fixtureValue, childPath, domain, checks, failures)
    }

    // Recurse into array items (iterate each element of the fixture array).
    if (resolved.type === 'array' && resolved.items?.properties) {
      const arr = fixtureValue
      if (Array.isArray(arr)) {
        for (let i = 0; i < arr.length; i++) {
          walkSchema(resolved.items!, arr[i], `${childPath}[]`, domain, checks, failures)
        }
      }
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const allFailures: Failure[] = []
let totalOptionalKey = 0
let totalNullableNonNull = 0
let domainsChecked = 0
const zeroDomains: string[] = []

for (const [dir, schemaFile] of Object.entries(fixtureMap.raw)) {
  if (dir.startsWith('_')) {
    continue
  }

  // Skip domain-level exceptions (e.g. focus).
  if (Object.prototype.hasOwnProperty.call(WALKER_EXCEPTIONS, dir)) {
    process.stdout.write(`[fixtures:check-full-coverage] SKIP ${dir} — ${WALKER_EXCEPTIONS[dir]}\n`)
    continue
  }

  const schemaPath = join(RAW_SCHEMAS_DIR, schemaFile)
  const fullPath = join(GENERATED_DIR, dir, 'full.json')

  if (!existsSync(schemaPath)) {
    process.stderr.write(`[fixtures:check-full-coverage] ERROR: schema not found: ${schemaPath}\n`)
    process.exit(1)
  }
  if (!existsSync(fullPath)) {
    process.stderr.write(`[fixtures:check-full-coverage] ERROR: full.json not found: ${fullPath}\n`)
    process.exit(1)
  }

  const schema = readJson(schemaPath) as JsonSchema
  const fixture = readJson(fullPath)

  const domainChecks: Check[] = []
  const domainFailures: Failure[] = []

  walkSchema(schema, fixture, '', dir, domainChecks, domainFailures)

  const optionalCount = domainChecks.filter((c) => c.type === 'optional-key').length
  const nullableCount = domainChecks.filter((c) => c.type === 'nullable-non-null').length

  process.stdout.write(
    `[fixtures:check-full-coverage] ${dir}: ${domainChecks.length} checks ` +
      `(${optionalCount} optional-key, ${nullableCount} nullable-non-null)` +
      (domainFailures.length > 0 ? ` — ${domainFailures.length} FAILURE(S)` : ' — OK') +
      '\n'
  )

  totalOptionalKey += optionalCount
  totalNullableNonNull += nullableCount
  domainsChecked++

  if (domainChecks.length === 0) {
    zeroDomains.push(dir)
  }

  allFailures.push(...domainFailures)
}

// ── Fail-closed guard: every non-excepted domain must yield >=1 check ─────────
if (zeroDomains.length > 0) {
  process.stderr.write(`\n[fixtures:check-full-coverage] FAIL: the following domain(s) produced zero ` + `checks — walker is a silent no-op for them:\n`)
  for (const d of zeroDomains) {
    process.stderr.write(`  x ${d}\n`)
  }
  process.exit(1)
}

// ── Report failures ───────────────────────────────────────────────────────────
if (allFailures.length > 0) {
  process.stderr.write(`\n[fixtures:check-full-coverage] FAIL: ${allFailures.length} coverage gap(s):\n\n`)
  for (const f of allFailures) {
    process.stderr.write(`  x [${f.domain}] ${f.path}: ${f.reason}\n`)
  }
  process.exit(1)
}

// ── Summary ───────────────────────────────────────────────────────────────────
const totalChecks = totalOptionalKey + totalNullableNonNull
process.stdout.write(
  `\n[fixtures:check-full-coverage] OK: ${domainsChecked} domains checked, ` +
    `${totalChecks} total checks ` +
    `(${totalOptionalKey} optional-key, ${totalNullableNonNull} nullable-non-null)\n`
)
