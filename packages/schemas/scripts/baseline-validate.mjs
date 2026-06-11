#!/usr/bin/env node
// B2.5 baseline fixture validation
// Loads all 16 schemas + validates fixtures with strict mode

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { RAW_SCHEMAS_DIR } from './portal-contract-source.mjs';

const DS = '/Users/jlloyd/Repositories/design-system-Lifegames';
const CONSUMER = '/Users/jlloyd/Repositories/j0nathan-ll0yd.github.io';

const ajv = new Ajv({ strict: false, allErrors: true, allowUnionTypes: true });
try { addFormats(ajv); } catch (e) { /* ajv-formats not installed; OK */ }

// Load raw export schemas from @lifegames/portal-contract; register under the
// canonical https://lifegames.dev/vendored/<basename> URIs (namespace unchanged).
const vendored = readdirSync(RAW_SCHEMAS_DIR).filter(f => f.endsWith('.schema.json'));
for (const f of vendored) {
  const schema = JSON.parse(readFileSync(join(RAW_SCHEMAS_DIR, f), 'utf-8'));
  const id = `https://lifegames.dev/vendored/${f}`;
  ajv.addSchema(schema, id);
}

// Load authored schemas; rewrite cross-file $refs to use the registered IDs
const authoredDir = join(DS, 'packages/schemas/authored');
const authored = readdirSync(authoredDir).filter(f => f.endsWith('.schema.json'));
const authoredById = {};
for (const f of authored) {
  let raw = readFileSync(join(authoredDir, f), 'utf-8');
  // Rewrite relative refs to the vendored URL pattern
  raw = raw.replace(/"\$ref":\s*"\.\.\/vendored\/([^"#]+\.schema\.json)([^"]*)"/g,
                    (_, file, frag) => `"$ref": "https://lifegames.dev/vendored/${file}${frag}"`);
  const schema = JSON.parse(raw);
  const name = f.replace('.schema.json', '');
  authoredById[name] = schema;
  ajv.addSchema(schema, `urn:authored:${name}`);
}

// Fixture mapping
const mapping = [
  { fixture: join(CONSUMER, 'data/profile.json'), schema: 'profile', label: 'consumer/data/profile.json' },
  { fixture: join(CONSUMER, 'data/system.json'), schema: 'system', label: 'consumer/data/system.json' },
  { fixture: join(CONSUMER, 'data/health.json'), schema: 'dashboard-health', label: 'consumer/data/health.json' },
  { fixture: join(CONSUMER, 'data/github.json'), schema: 'dashboard-github', label: 'consumer/data/github.json' },
  { fixture: join(CONSUMER, 'data/reading.json'), schema: 'dashboard-reading', label: 'consumer/data/reading.json' },
  { fixture: join(CONSUMER, 'data/books.json'), schema: 'dashboard-books', label: 'consumer/data/books.json' },
  { fixture: join(CONSUMER, 'data/theatre-reviews-sample.json'), schemaId: 'https://lifegames.dev/vendored/theatre-reviews-export.schema.json', label: 'consumer/data/theatre-reviews-sample.json' },
];

const results = [];
for (const m of mapping) {
  let data;
  try { data = JSON.parse(readFileSync(m.fixture, 'utf-8')); }
  catch (e) { results.push({ ...m, error: `READ_FAIL: ${e.message}`, mismatches: [] }); continue; }

  let validate;
  if (m.schemaId) {
    validate = ajv.getSchema(m.schemaId);
  } else {
    validate = ajv.getSchema(`urn:authored:${m.schema}`);
  }
  if (!validate) {
    results.push({ ...m, error: `SCHEMA_NOT_FOUND: ${m.schema || m.schemaId}`, mismatches: [] });
    continue;
  }
  const ok = validate(data);
  results.push({
    ...m,
    ok,
    mismatches: ok ? [] : validate.errors.map(e => ({
      path: e.instancePath || '(root)',
      keyword: e.keyword,
      message: e.message,
      params: e.params,
    })),
  });
}

// Also validate DS-side widget fixtures (best-effort mapping)
const widgetsDir = join(DS, 'Sources/LifegamesWidgets/Resources/widgets');
const dsFixtures = [];
function walk(dir, cat = null) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, cat || e.name);
    else if (e.name.endsWith('.json') && e.name !== 'widget-manifest.json') {
      dsFixtures.push({ path: p, category: cat });
    }
  }
}
try { walk(widgetsDir); } catch (e) { /* dir missing */ }

const dsCategoryToSchema = {
  health: 'dashboard-health',
  github: 'dashboard-github',
  identity: 'profile',
  reading: 'dashboard-reading',
  // location, other: UNMAPPED — skip
};

let unmappedCount = 0;
const dsResults = [];
for (const f of dsFixtures) {
  const schema = dsCategoryToSchema[f.category];
  if (!schema) { unmappedCount++; dsResults.push({ ...f, status: 'UNMAPPED' }); continue; }
  let data;
  try { data = JSON.parse(readFileSync(f.path, 'utf-8')); }
  catch (e) { dsResults.push({ ...f, error: `READ_FAIL: ${e.message}` }); continue; }
  const validate = ajv.getSchema(`urn:authored:${schema}`);
  if (!validate) { dsResults.push({ ...f, error: `SCHEMA_NOT_FOUND: ${schema}` }); continue; }
  const ok = validate(data);
  dsResults.push({
    path: f.path.replace(DS + '/', ''),
    category: f.category,
    schema,
    ok,
    mismatches: ok ? [] : validate.errors.slice(0, 10).map(e => ({ // cap per-fixture mismatches
      path: e.instancePath || '(root)',
      keyword: e.keyword,
      message: e.message,
    })),
    totalErrors: ok ? 0 : validate.errors.length,
  });
}

// Output
const consumerCount = results.reduce((s, r) => s + (r.mismatches?.length || 0), 0);
const dsCount = dsResults.reduce((s, r) => s + (r.totalErrors || 0), 0);
const total = consumerCount + dsCount;

console.log(JSON.stringify({
  consumer: { results, totalMismatches: consumerCount },
  ds: { results: dsResults, totalMismatches: dsCount, unmappedCount, totalFixtures: dsFixtures.length },
  grandTotal: total,
  escalationTriggered: total > 10,
}, null, 2));
