#!/usr/bin/env tsx
// B4 production validator — reads fixture-map.json and validates every
// listed fixture against its schema. Strict mode (additionalProperties: false).
// Used by the DS build (`pnpm -F <schemas> build`, CWD = repo root).
//
// Fails closed: a mapped fixture that does not exist is an error naming the
// path and the bucket, and a run that validates 0 fixtures fails. Fixture
// paths resolve against LIFEGAMES_VALIDATE_CWD (default: process.cwd()).
// Flags: --bucket=<name> checks one bucket; --map=<path> reads another map
// (a relative --map resolves against process.cwd(), not LIFEGAMES_VALIDATE_CWD).

import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {isAbsolute, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {Ajv, type ErrorObject} from 'ajv'
import addFormats from 'ajv-formats'
import {RAW_SCHEMAS_DIR} from './portal-contract-source.mjs'
import {schemaUrn} from './schema-urn.mjs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const PKG_ROOT = resolve(__dirname, '..')

// Resolve the working directory: in DS build this is the DS root. Fixture
// paths in fixture-map are relative to it.
const INVOKER_CWD = process.env.LIFEGAMES_VALIDATE_CWD || process.cwd()

// Load AJV — Draft-07 is what all our schemas declare
const ajv = new Ajv({strict: false, allErrors: true, allowUnionTypes: true})
// ajv-formats is pure CJS (`module.exports = formatsPlugin`). At runtime
// tsx synthesizes a callable default via esModuleInterop, but tsc under
// NodeNext sees only the module namespace (known Ajv packaging issue
// ajv-validator/ajv#2132). The runtime invariant is sound.
// @ts-expect-error  ajv-formats CJS default-interop limitation under NodeNext
addFormats(ajv)

// Guard: every schema must declare Draft-07. A 2020-12 declaration causes Ajv
// to throw an opaque "no schema with key or ref" error on addSchema(); this
// surfaces the mismatch with a clear message instead. If 2020-12 support is
// ever needed, switch to Ajv2020 from 'ajv/dist/2020' and maintain two
// validator instances.
const EXPECTED_SCHEMA = 'http://json-schema.org/draft-07/schema#'

function assertDraft07(schema: {$schema?: string}, file: string): void {
  if (schema.$schema && schema.$schema !== EXPECTED_SCHEMA) {
    throw new Error(
      `[schemas:validate] ${file} declares "$schema": "${schema.$schema}" — ` +
        `expected "${EXPECTED_SCHEMA}". All schemas must use Draft-07 for Ajv compatibility.`
    )
  }
}

// Register all raw export schemas under their canonical vendored URIs.
// Source is now @j0nathan-ll0yd/portal-contract (resolved on disk); the canonical
// `https://lifegames.dev/vendored/<file>` namespace is preserved unchanged.
for (const f of readdirSync(RAW_SCHEMAS_DIR).filter((f) => f.endsWith('.schema.json'))) {
  const schema = JSON.parse(readFileSync(join(RAW_SCHEMAS_DIR, f), 'utf-8'))
  assertDraft07(schema, f)
  ajv.addSchema(schema, `https://lifegames.dev/vendored/${f}`)
}

// Register authored schemas; rewrite relative $refs to absolute URIs so AJV
// can resolve cross-schema references without a file-system resolver.
const authoredDir = join(PKG_ROOT, 'authored')
const schemasByName: Record<string, unknown> = {}
for (const f of readdirSync(authoredDir).filter((f) => f.endsWith('.schema.json'))) {
  let raw = readFileSync(join(authoredDir, f), 'utf-8')
  raw = raw.replace(/"\$ref":\s*"\.\.\/vendored\/([^"#]+\.schema\.json)([^"]*)"/g, (_match: string, file: string, frag: string) =>
    `"$ref": "https://lifegames.dev/vendored/${file}${frag}"`)
  const schema = JSON.parse(raw) as {title?: string; $schema?: string}
  assertDraft07(schema, f)
  const name = schema.title || f.replace('.schema.json', '')
  schemasByName[name] = schema
  ajv.addSchema(schema, schemaUrn('authored', name))
}

// Register generated schemas (overlay + vendored merges) under urn:generated: namespace.
// Phase 3 deletes authored/dashboard-health.schema.json; validate resolves from here instead.
const generatedDir = join(PKG_ROOT, 'generated')
if (existsSync(generatedDir)) {
  for (const f of readdirSync(generatedDir).filter((f) => f.endsWith('.schema.json'))) {
    let raw = readFileSync(join(generatedDir, f), 'utf-8')
    raw = raw.replace(/"\$ref":\s*"\.\.\/vendored\/([^"#]+\.schema\.json)([^"]*)"/g, (_match: string, file: string, frag: string) =>
      `"$ref": "https://lifegames.dev/vendored/${file}${frag}"`)
    const schema = JSON.parse(raw) as {title?: string; $schema?: string}
    assertDraft07(schema, f)
    const name = schema.title || f.replace('.schema.json', '')
    schemasByName[name] = schema
    ajv.addSchema(schema, schemaUrn('generated', name))
  }
}

// Register per-widget generated schemas (from generate-widget-schemas.mjs).
const widgetSchemaDir = join(generatedDir, 'widgets')
if (existsSync(widgetSchemaDir)) {
  for (const f of readdirSync(widgetSchemaDir).filter((f) => f.endsWith('.schema.json'))) {
    const raw = readFileSync(join(widgetSchemaDir, f), 'utf-8')
    const schema = JSON.parse(raw) as {title?: string; $schema?: string}
    assertDraft07(schema, `widgets/${f}`)
    const name = schema.title || f.replace('.schema.json', '')
    schemasByName[name] = schema
    ajv.addSchema(schema, schemaUrn('generated', name))
  }
}

// Also alias vendored schemas by their title names so fixture-map entries like
// 'TheatreReviewsExport' resolve without knowing the file name.
const VENDORED_TITLE_MAP: Record<string, string> = {
  'articles-export.schema.json': 'ArticlesExport',
  'books-export.schema.json': 'BooksExport',
  'focus-export.schema.json': 'FocusExport',
  'github-events-export.schema.json': 'GithubEventsExport',
  'github-starred-repos-export.schema.json': 'GithubStarredReposExport',
  'health-export.schema.json': 'HealthExport',
  'sleep-export.schema.json': 'SleepExport',
  'theatre-reviews-export.schema.json': 'TheatreReviewsExport',
  'workouts-export.schema.json': 'WorkoutsExport'
}
for (const [file, name] of Object.entries(VENDORED_TITLE_MAP)) {
  const compiled = ajv.getSchema(`https://lifegames.dev/vendored/${file}`)
  if (compiled) {
    ajv.addSchema(compiled.schema as object, schemaUrn('vendored', name))
  }
}

// Read the fixture map. `--map=<path>` points at another map (tests use it);
// the default is the map this package ships.
const args = process.argv.slice(2)
const mapArg = args.find((a) => a.startsWith('--map='))
const fixtureMapPath = mapArg ? resolve(mapArg.slice('--map='.length)) : join(PKG_ROOT, 'fixture-map.json')
const fixtureMap = JSON.parse(readFileSync(fixtureMapPath, 'utf-8')) as Record<
  string,
  unknown
>

// Determine which buckets to validate (default: all)
const bucketArg = args.find((a) => a.startsWith('--bucket='))
const buckets = bucketArg ? [bucketArg.slice('--bucket='.length)] : Object.keys(fixtureMap).filter((k) => !k.startsWith('_'))

let total = 0
let failed = 0
const errors: Array<{fixture: string; bucket: string; schema?: string; error?: string; ajvErrors?: ErrorObject[] | null}> = []

// Every mapped fixture must exist and validate. A missing file, a malformed
// entry, an unknown or empty bucket, and a run that checks nothing all fail:
// a gate that passes over an empty set cannot fail, so it measures nothing.
for (const bucketName of buckets) {
  const bucket = fixtureMap[bucketName]
  if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) {
    failed++
    errors.push({fixture: '(bucket)', bucket: bucketName, error: `Bucket "${bucketName}" is not an object in ${fixtureMapPath}`})
    continue
  }
  let bucketTotal = 0
  for (const [fixtureRelPath, entry] of Object.entries(bucket as Record<string, unknown>)) {
    // Skip comment keys
    if (fixtureRelPath.startsWith('_')) {
      continue
    }
    bucketTotal++
    if (!entry || typeof entry !== 'object' || typeof (entry as {schema?: unknown}).schema !== 'string') {
      failed++
      errors.push({fixture: fixtureRelPath, bucket: bucketName, error: 'Malformed map entry: expected {"schema": "<title>"}'})
      continue
    }

    const schemaName = (entry as {schema: string}).schema
    const fixtureAbsPath = isAbsolute(fixtureRelPath)
      ? fixtureRelPath
      : join(INVOKER_CWD, fixtureRelPath)

    total++
    if (!existsSync(fixtureAbsPath)) {
      failed++
      errors.push({
        fixture: fixtureRelPath,
        bucket: bucketName,
        schema: schemaName,
        error: `Mapped fixture not found: ${fixtureAbsPath} (resolved against ${INVOKER_CWD})`
      })
      continue
    }

    let data: unknown
    try {
      data = JSON.parse(readFileSync(fixtureAbsPath, 'utf-8'))
    } catch (e) {
      failed++
      errors.push({fixture: fixtureRelPath, bucket: bucketName, schema: schemaName, error: `Parse error: ${(e as Error).message}`})
      continue
    }

    // Resolution chain: authored → generated → vendored
    const validate = ajv.getSchema(schemaUrn('authored', schemaName)) ||
      ajv.getSchema(schemaUrn('generated', schemaName)) ||
      ajv.getSchema(schemaUrn('vendored', schemaName))

    if (!validate) {
      failed++
      errors.push({fixture: fixtureRelPath, bucket: bucketName, schema: schemaName, error: `Schema not found: ${schemaName}`})
      continue
    }

    const ok = validate(data)
    if (!ok) {
      failed++
      errors.push({fixture: fixtureRelPath, bucket: bucketName, schema: schemaName, ajvErrors: validate.errors})
    }
  }
  if (bucketTotal === 0) {
    failed++
    errors.push({fixture: '(bucket)', bucket: bucketName, error: `Bucket "${bucketName}" maps no fixtures`})
  }
}

if (failed === 0 && total === 0) {
  process.stderr.write(`\n[schemas:validate] FAIL: 0 fixtures validated. ${fixtureMapPath} maps no fixtures to check.\n`)
  process.exit(1)
}

if (failed > 0) {
  process.stderr.write(`\n[schemas:validate] FAIL: ${failed} error(s); ${total} mapped fixture(s) checked.\n\n`)
  for (const e of errors) {
    process.stderr.write(`  x ${e.fixture} [bucket: ${e.bucket}] (${e.schema || 'unknown schema'})\n`)
    if (e.ajvErrors) {
      const shown = e.ajvErrors.slice(0, 5)
      for (const err of shown) {
        process.stderr.write(`    - ${err.instancePath || '(root)'}: ${err.keyword} — ${err.message}\n`)
      }
      if (e.ajvErrors.length > 5) {
        process.stderr.write(`    ... (+${e.ajvErrors.length - 5} more)\n`)
      }
    } else {
      process.stderr.write(`    - ${e.error}\n`)
    }
  }
  process.exit(1)
}

process.stdout.write(`[schemas:validate] OK: ${total} fixture(s) validated successfully.\n`)
