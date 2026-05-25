#!/usr/bin/env tsx
// B4 production validator — reads fixture-map.json and validates every
// listed fixture against its schema. Strict mode (additionalProperties: false).
// Used by DS build and consumer prebuild.
//
// Consumer-side invocation (Phase D1):
//   "prebuild": "LIFEGAMES_VALIDATE_CWD=$PWD pnpm --dir <ds-root> -F @lifegames/schemas validate"
// (or equivalent when consumed via yalc/npm package)

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');

// Resolve the working directory: in DS build this is the DS root.
// In consumer prebuild (D1+ work), the consumer will invoke this with its CWD,
// so fixture paths in fixture-map are relative to the invoker's CWD.
const INVOKER_CWD = process.env.LIFEGAMES_VALIDATE_CWD || process.cwd();

// Load AJV — Draft-07 is what all our schemas declare
const ajv = new Ajv({ strict: false, allErrors: true, allowUnionTypes: true });
addFormats(ajv);

// Register all vendored schemas under their canonical URIs
const vendoredDir = join(PKG_ROOT, 'vendored');
for (const f of readdirSync(vendoredDir).filter(f => f.endsWith('.schema.json'))) {
  const schema = JSON.parse(readFileSync(join(vendoredDir, f), 'utf-8'));
  ajv.addSchema(schema, `https://lifegames.dev/vendored/${f}`);
}

// Register authored schemas; rewrite relative $refs to absolute URIs so AJV
// can resolve cross-schema references without a file-system resolver.
const authoredDir = join(PKG_ROOT, 'authored');
const schemasByName: Record<string, unknown> = {};
for (const f of readdirSync(authoredDir).filter(f => f.endsWith('.schema.json'))) {
  let raw = readFileSync(join(authoredDir, f), 'utf-8');
  raw = raw.replace(
    /"\$ref":\s*"\.\.\/vendored\/([^"#]+\.schema\.json)([^"]*)"/g,
    (_match: string, file: string, frag: string) =>
      `"$ref": "https://lifegames.dev/vendored/${file}${frag}"`,
  );
  const schema = JSON.parse(raw) as { title?: string };
  const name = schema.title || f.replace('.schema.json', '');
  schemasByName[name] = schema;
  ajv.addSchema(schema, `urn:authored:${name}`);
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
  'location-export.schema.json': 'LocationExport',
  'sleep-export.schema.json': 'SleepExport',
  'theatre-reviews-export.schema.json': 'TheatreReviewsExport',
  'workouts-export.schema.json': 'WorkoutsExport',
};
for (const [file, name] of Object.entries(VENDORED_TITLE_MAP)) {
  const compiled = ajv.getSchema(`https://lifegames.dev/vendored/${file}`);
  if (compiled) {
    ajv.addSchema(compiled.schema as object, `urn:vendored:${name}`);
  }
}

// Read fixture-map.json
const fixtureMap = JSON.parse(
  readFileSync(join(PKG_ROOT, 'fixture-map.json'), 'utf-8'),
) as Record<string, unknown>;

// Determine which buckets to validate (default: all)
const args = process.argv.slice(2);
const bucketArg = args.find(a => a.startsWith('--bucket='));
const buckets = bucketArg ? [bucketArg.split('=')[1]] : Object.keys(fixtureMap);

let total = 0;
let failed = 0;
const errors: Array<{
  fixture: string;
  schema?: string;
  error?: string;
  ajvErrors?: Ajv.ErrorObject[] | null;
}> = [];

for (const bucketName of buckets) {
  const bucket = fixtureMap[bucketName];
  if (!bucket || typeof bucket !== 'object') continue;
  for (const [fixtureRelPath, entry] of Object.entries(bucket as Record<string, unknown>)) {
    // Skip comment keys
    if (fixtureRelPath.startsWith('_')) continue;
    if (!entry || typeof entry !== 'object' || !('schema' in entry)) continue;

    const schemaName = (entry as { schema: string }).schema;
    const fixtureAbsPath = isAbsolute(fixtureRelPath)
      ? fixtureRelPath
      : join(INVOKER_CWD, fixtureRelPath);

    if (!existsSync(fixtureAbsPath)) {
      // Skip silently: bucket's fixtures aren't present in this invoker's tree.
      // (e.g., DS build invokes; consumer fixtures aren't present here.)
      continue;
    }

    total++;
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(fixtureAbsPath, 'utf-8'));
    } catch (e) {
      failed++;
      errors.push({ fixture: fixtureRelPath, error: `Parse error: ${(e as Error).message}` });
      continue;
    }

    // Try authored URN first, then vendored URN
    const validate =
      ajv.getSchema(`urn:authored:${schemaName}`) ||
      ajv.getSchema(`urn:vendored:${schemaName}`);

    if (!validate) {
      failed++;
      errors.push({ fixture: fixtureRelPath, error: `Schema not found: ${schemaName}` });
      continue;
    }

    const ok = validate(data);
    if (!ok) {
      failed++;
      errors.push({
        fixture: fixtureRelPath,
        schema: schemaName,
        ajvErrors: validate.errors,
      });
    }
  }
}

if (failed > 0) {
  process.stderr.write(
    `\n[schemas:validate] FAIL: ${failed} of ${total} fixtures failed validation.\n\n`,
  );
  for (const e of errors) {
    process.stderr.write(`  x ${e.fixture} (${e.schema || 'unknown schema'})\n`);
    if (e.ajvErrors) {
      const shown = e.ajvErrors.slice(0, 5);
      for (const err of shown) {
        process.stderr.write(
          `    - ${err.instancePath || '(root)'}: ${err.keyword} — ${err.message}\n`,
        );
      }
      if (e.ajvErrors.length > 5) {
        process.stderr.write(`    ... (+${e.ajvErrors.length - 5} more)\n`);
      }
    } else {
      process.stderr.write(`    - ${e.error}\n`);
    }
  }
  process.exit(1);
}

process.stdout.write(`[schemas:validate] OK: ${total} fixture(s) validated successfully.\n`);
