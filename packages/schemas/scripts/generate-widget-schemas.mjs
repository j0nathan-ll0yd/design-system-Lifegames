#!/usr/bin/env node
import { createGenerator } from 'ts-json-schema-generator';
import { writeFileSync, readFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';

// Format emitted JSON through Prettier (root .prettierrc.mjs) so generated
// artifacts stay readable and byte-stable for `format:check` (issue #54).
async function writeJson(outPath, data) {
  const cfg = await prettier.resolveConfig(outPath);
  const formatted = await prettier.format(JSON.stringify(data, null, 2), {
    ...cfg,
    parser: 'json',
    filepath: outPath,
  });
  writeFileSync(outPath, formatted);
}

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(PKG_ROOT, '../..');
const WEB_WIDGETS = join(REPO_ROOT, 'packages/web/src/widgets');
const OUT_DIR = join(PKG_ROOT, 'generated/widgets');

mkdirSync(OUT_DIR, { recursive: true });

function toKebab(name) {
  return name
    .replace(/Props$/, '')
    .replace(/V(\d+)$/, '-v$1')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

function stripAdditionalProperties(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(stripAdditionalProperties);
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'additionalProperties' && v === false) continue;
    result[k] = stripAdditionalProperties(v);
  }
  return result;
}

function resolveRefs(schema) {
  const defs = schema.definitions || {};
  function resolve(node) {
    if (typeof node !== 'object' || node === null) return node;
    if (Array.isArray(node)) return node.map(resolve);
    if (node.$ref && node.$ref.startsWith('#/definitions/')) {
      const name = node.$ref.replace('#/definitions/', '');
      if (defs[name]) return resolve(structuredClone(defs[name]));
    }
    const result = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === 'definitions') continue;
      result[k] = resolve(v);
    }
    return result;
  }
  return resolve(schema);
}

function makeOptionalsNullable(schema) {
  if (typeof schema !== 'object' || schema === null) return schema;
  if (Array.isArray(schema)) return schema.map(makeOptionalsNullable);

  const result = {};
  for (const [k, v] of Object.entries(schema)) {
    result[k] = makeOptionalsNullable(v);
  }

  if (result.type === 'object' && result.properties) {
    const required = new Set(result.required || []);
    for (const [prop, propSchema] of Object.entries(result.properties)) {
      if (!required.has(prop) && typeof propSchema === 'object' && propSchema !== null) {
        if (propSchema.type && propSchema.type !== 'null' && !Array.isArray(propSchema.type)) {
          if (!propSchema.anyOf) {
            result.properties[prop] = {
              anyOf: [propSchema, { type: 'null' }],
            };
          }
        }
      }
    }
  }
  return result;
}

const CATEGORIES = ['github', 'health', 'identity', 'location', 'other', 'reading'];

const MANUAL_SCHEMAS = {
  'movement-rings': {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://lifegames.org/schemas/widget/movement-rings.json',
    title: 'MovementRingsProps',
    type: 'object',
    properties: {
      health: {
        type: 'object',
        properties: {
          movement: {
            type: 'object',
            properties: {
              moveKcal: { type: 'number' },
              exerciseMin: { type: 'number' },
              standHr: { type: 'number' },
              steps: { type: 'number' },
              distanceMeters: { type: 'number' },
              flights: { type: 'number' },
              daylightMin: { type: 'number' },
              basalKcal: { type: 'number' },
              restingHeartRate: { type: 'number' },
              goals: {
                type: 'object',
                properties: {
                  moveKcal: { type: 'number' },
                  exerciseMin: { type: 'number' },
                  standHr: { type: 'number' },
                  daylightMin: { type: 'number' },
                },
                required: ['moveKcal', 'exerciseMin', 'standHr', 'daylightMin'],
              },
              solar: {
                type: 'object',
                properties: {
                  sunriseHHmm: { type: 'string' },
                  sunsetHHmm: { type: 'string' },
                  currentProgressPct: { type: 'number' },
                },
                required: ['sunriseHHmm', 'sunsetHHmm', 'currentProgressPct'],
              },
            },
            required: ['moveKcal', 'exerciseMin', 'standHr', 'steps', 'distanceMeters', 'flights'],
          },
        },
        required: ['movement'],
      },
    },
  },
  'dev-activity-cards': {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://lifegames.org/schemas/widget/dev-activity-cards.json',
    title: 'DevActivityCardsProps',
    type: 'object',
    properties: {
      events: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            repo: { type: 'string' },
            title: { type: 'string' },
            date: { type: 'string' },
            hash: { type: 'string' },
            additions: { type: 'number' },
            deletions: { type: 'number' },
            number: { type: 'number' },
          },
          required: ['type', 'repo', 'title', 'date'],
        },
      },
    },
    required: ['events'],
  },
  'dev-activity-log': {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://lifegames.org/schemas/widget/dev-activity-log.json',
    title: 'DevActivityLogProps',
    type: 'object',
    properties: {
      events: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            repo: { type: 'string' },
            title: { type: 'string' },
            date: { type: 'string' },
            hash: { type: 'string' },
            additions: { type: 'number' },
            deletions: { type: 'number' },
            number: { type: 'number' },
          },
          required: ['type', 'repo', 'title', 'date'],
        },
      },
    },
    required: ['events'],
  },
  'dev-activity-timeline': {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://lifegames.org/schemas/widget/dev-activity-timeline.json',
    title: 'DevActivityTimelineProps',
    type: 'object',
    properties: {
      events: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            repo: { type: 'string' },
            title: { type: 'string' },
            date: { type: 'string' },
            hash: { type: 'string' },
            additions: { type: 'number' },
            deletions: { type: 'number' },
            number: { type: 'number' },
          },
          required: ['type', 'repo', 'title', 'date'],
        },
      },
    },
    required: ['events'],
  },
  'og-image': {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://lifegames.org/schemas/widget/og-image.json',
    title: 'OGImageProps',
    type: 'object',
    properties: {
      avatarUrl: { type: 'string' },
      name: { type: 'string' },
      title: { type: 'string' },
      quote: { type: 'string' },
      experience: { type: 'string' },
    },
    required: ['avatarUrl', 'name', 'title', 'quote', 'experience'],
  },
  'sync-status': {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://lifegames.org/schemas/widget/sync-status.json',
    title: 'SyncStatusProps',
    type: 'object',
    properties: {
      status: { type: 'string' },
      lastSyncDate: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      referenceDate: { type: 'string' },
      errorMessage: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      primaryActionLabel: { type: 'string' },
    },
    required: ['status', 'lastSyncDate', 'referenceDate', 'errorMessage', 'primaryActionLabel'],
  },
  'diagnostics-monitor': {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://lifegames.org/schemas/widget/diagnostics-monitor.json',
    title: 'DiagnosticsMonitorProps',
    type: 'object',
    properties: {
      totalEventCount: { type: 'number' },
      counts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            count: { type: 'number' },
          },
          required: ['category', 'count'],
        },
      },
      fileSizeBytes: { type: 'number' },
      entries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            category: { type: 'string' },
            timestamp: { type: 'string' },
            message: { type: 'string' },
            level: { type: 'string' },
          },
          required: ['id', 'category', 'timestamp', 'message'],
        },
      },
      transferStatus: { type: 'string' },
      referenceDate: { type: 'string' },
    },
    required: [
      'totalEventCount',
      'counts',
      'fileSizeBytes',
      'entries',
      'transferStatus',
      'referenceDate',
    ],
  },
};

const EMPTY_WIDGETS = ['dnd-overlay', 'focus-overlay', 'book-modal', 'coming-soon'];

function generateEmptySchema(slug) {
  const title =
    slug
      .split('-')
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join('') + 'Props';
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: `https://lifegames.org/schemas/widget/${slug}.json`,
    title,
    type: 'object',
  };
}

function generateFromTs(typesFile, typeName) {
  const generator = createGenerator({
    path: typesFile,
    type: typeName,
    skipTypeCheck: true,
    tsconfig: join(PKG_ROOT, 'tsconfig.json'),
  });
  return generator.createSchema(typeName);
}

const generated = [];
const errors = [];

for (const category of CATEGORIES) {
  const catDir = join(WEB_WIDGETS, category);
  let files;
  try {
    files = readdirSync(catDir).filter((f) => f.endsWith('.types.ts'));
  } catch {
    continue;
  }

  for (const file of files) {
    const base = basename(file, '.types.ts');
    const typesPath = join(catDir, file);
    const typeName = base + 'Props';
    const slug = toKebab(typeName);

    if (MANUAL_SCHEMAS[slug]) {
      const schema = MANUAL_SCHEMAS[slug];
      const outPath = join(OUT_DIR, `${slug}.schema.json`);
      await writeJson(outPath, schema);
      generated.push(slug);
      continue;
    }

    if (EMPTY_WIDGETS.includes(slug)) {
      const schema = generateEmptySchema(slug);
      const outPath = join(OUT_DIR, `${slug}.schema.json`);
      await writeJson(outPath, schema);
      generated.push(slug);
      continue;
    }

    try {
      let schema = generateFromTs(typesPath, typeName);
      schema = resolveRefs(schema);
      schema = stripAdditionalProperties(schema);
      schema = makeOptionalsNullable(schema);

      delete schema.$ref;
      schema.$schema = 'http://json-schema.org/draft-07/schema#';
      schema.$id = `https://lifegames.org/schemas/widget/${slug}.json`;
      schema.title = typeName;

      const outPath = join(OUT_DIR, `${slug}.schema.json`);
      await writeJson(outPath, schema);
      generated.push(slug);
    } catch (err) {
      errors.push({ slug, error: err.message });
    }
  }
}

for (const slug of Object.keys(MANUAL_SCHEMAS)) {
  if (!generated.includes(slug)) {
    const schema = MANUAL_SCHEMAS[slug];
    const outPath = join(OUT_DIR, `${slug}.schema.json`);
    await writeJson(outPath, schema);
    generated.push(slug);
  }
}

// ── Wire fixture-map.json ──────────────────────────────────────────────────
const WIDGETS_ROOT = join(REPO_ROOT, 'Sources/LifegamesWidgets/Resources/widgets');
const manifestPath = join(WIDGETS_ROOT, 'widget-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

const fixtureBaseToTitle = {};
for (const w of manifest.widgets) {
  const fixBase = basename(w.fixturePath, '.json');
  fixtureBaseToTitle[fixBase] = w.name + 'Props';
}
fixtureBaseToTitle['exploration-odometer-v3'] = 'ExplorationOdometerV3Props';
fixtureBaseToTitle['place-leaderboard-v3'] = 'PlaceLeaderboardV3Props';

// Data-only fixture domains: app-preview fixture pools (S98) that have no web
// widget or manifest entry (a manifest entry implies a viewType). Their schemas
// are authored in packages/schemas/authored/ and validated via urn:authored:.
const EXTRA_CATEGORY_WIRING = {
  'media-file': 'MediaFile',
  'media-library': 'MediaLibrary',
  'media-profile': 'MediaProfile',
};
Object.assign(fixtureBaseToTitle, EXTRA_CATEGORY_WIRING);

const schemaTitles = new Set();
for (const f of readdirSync(OUT_DIR).filter((f) => f.endsWith('.schema.json'))) {
  const s = JSON.parse(readFileSync(join(OUT_DIR, f), 'utf-8'));
  if (s.title) schemaTitles.add(s.title);
}
// Authored schemas participate in ds-bucket wiring too (data-only domains above
// resolve to authored titles; validate.ts checks urn:authored: first).
const AUTHORED_DIR = join(PKG_ROOT, 'authored');
for (const f of readdirSync(AUTHORED_DIR).filter((f) => f.endsWith('.schema.json'))) {
  const s = JSON.parse(readFileSync(join(AUTHORED_DIR, f), 'utf-8'));
  if (s.title) schemaTitles.add(s.title);
}

const dsEntries = {};
const widgetCats = readdirSync(WIDGETS_ROOT).filter((d) => {
  try {
    return !d.includes('.') && readdirSync(join(WIDGETS_ROOT, d)).length > 0;
  } catch {
    return false;
  }
});
for (const cat of widgetCats) {
  for (const f of readdirSync(join(WIDGETS_ROOT, cat)).filter((f) => f.endsWith('.json'))) {
    const rel = `Sources/LifegamesWidgets/Resources/widgets/${cat}/${f}`;
    const fullBase = f.replace(/\.json$/, '');
    const baseOnly = fullBase.replace(/\.[^.]+$/, '');
    const title = fixtureBaseToTitle[fullBase] || fixtureBaseToTitle[baseOnly];
    if (title && schemaTitles.has(title)) {
      dsEntries[rel] = { schema: title, strategy: 'single' };
    }
  }
}

const fixtureMapPath = join(PKG_ROOT, 'fixture-map.json');
const fixtureMap = JSON.parse(readFileSync(fixtureMapPath, 'utf-8'));
fixtureMap.ds = dsEntries;
await writeJson(fixtureMapPath, fixtureMap);

process.stdout.write(
  `[generate-widget-schemas] Generated ${generated.length} schemas, wired ${Object.keys(dsEntries).length} fixture-map entries.\n`,
);
if (errors.length > 0) {
  process.stderr.write(`[generate-widget-schemas] ${errors.length} errors:\n`);
  for (const e of errors) {
    process.stderr.write(`  x ${e.slug}: ${e.error}\n`);
  }
  process.exit(1);
}
