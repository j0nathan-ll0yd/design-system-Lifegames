#!/usr/bin/env tsx
/**
 * codegen.ts — Lifegames Schema Codegen Pipeline
 *
 * Generates from the JSON schemas registered in SCHEMA_ENTRIES (raw LP
 * exports from @lifegames/portal-contract + authored/generated DS):
 *   - dist/types/{Name}.ts      — TypeScript interfaces via json-schema-to-typescript
 *   - dist/types/branded.ts     — SchemaDerived<T> brand type
 *   - dist/types/index.ts       — Re-exports all types wrapped in SchemaDerived<T>
 *   - swift/WidgetModels.swift  — Swift Codable structs via quicktype
 *   - fixture-map.json          — Fixture → schema → strategy mapping
 *
 * Idempotent: re-running produces byte-identical output.
 * Do NOT modify the portal-contract raw schemas or authored/ schemas from this script.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { execSync } from 'node:child_process';
import { compile } from 'json-schema-to-typescript';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';
import { RAW_SCHEMAS_DIR } from './portal-contract-source.mjs';

async function formatWithPrettier(
  src: string,
  outPath: string,
  parser: 'typescript' | 'json',
): Promise<string> {
  const cfg = await prettier.resolveConfig(outPath);
  return prettier.format(src, { ...cfg, parser, filepath: outPath });
}

type JsonObject = Record<string, unknown>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PKG_ROOT = join(__dirname, '..');
const DIST_TYPES = join(PKG_ROOT, 'dist', 'types');
const SWIFT_DIR = join(PKG_ROOT, 'swift');
const SWIFT_TEMP = join(SWIFT_DIR, 'temp');

/**
 * Authoritative naming map — LP schemas lack title/$id/description so we
 * provide names explicitly. Order is stable and determines index.ts export order.
 */
const SCHEMA_ENTRIES: Array<{ relPath: string; name: string }> = [
  { relPath: 'vendored/articles-export.schema.json', name: 'ArticlesExport' },
  { relPath: 'vendored/books-export.schema.json', name: 'BooksExport' },
  { relPath: 'vendored/focus-export.schema.json', name: 'FocusExport' },
  { relPath: 'vendored/github-events-export.schema.json', name: 'GithubEventsExport' },
  { relPath: 'vendored/github-starred-repos-export.schema.json', name: 'GithubStarredReposExport' },
  { relPath: 'vendored/health-export.schema.json', name: 'HealthExport' },
  { relPath: 'vendored/location-export.schema.json', name: 'LocationExport' },
  { relPath: 'vendored/sleep-export.schema.json', name: 'SleepExport' },
  { relPath: 'vendored/theatre-reviews-export.schema.json', name: 'TheatreReviewsExport' },
  { relPath: 'vendored/workouts-export.schema.json', name: 'WorkoutsExport' },
  { relPath: 'authored/profile.schema.json', name: 'Profile' },
  { relPath: 'authored/system.schema.json', name: 'System' },
  { relPath: 'generated/dashboard-health.schema.json', name: 'DashboardHealth' },
  { relPath: 'authored/dashboard-github.schema.json', name: 'DashboardGithub' },
  { relPath: 'authored/dashboard-reading.schema.json', name: 'DashboardReading' },
  { relPath: 'authored/dashboard-books.schema.json', name: 'DashboardBooks' },
  { relPath: 'authored/media-file.schema.json', name: 'MediaFile' },
  { relPath: 'authored/media-library.schema.json', name: 'MediaLibrary' },
  { relPath: 'authored/media-profile.schema.json', name: 'MediaProfile' },
  { relPath: 'authored/visit-timeline.schema.json', name: 'VisitTimeline' },
  { relPath: 'authored/saved-places.schema.json', name: 'SavedPlaces' },
  { relPath: 'authored/place-search-results.schema.json', name: 'PlaceSearchResults' },
];

/**
 * Overlay entries drive the merge-generate pipeline.
 * For each entry: vendored schema + overlay = generated schema written to generated/.
 * SCHEMA_ENTRIES still points at authored/ until Phase 3 switches it to generated/.
 */
const OVERLAY_ENTRIES: Array<{
  vendored: string;
  overlay: string;
  outputRel: string;
  name: string;
  excludeFromVendored?: string[];
}> = [
  {
    vendored: 'vendored/health-export.schema.json',
    overlay: 'overlays/dashboard-health.overlay.json',
    outputRel: 'generated/dashboard-health.schema.json',
    name: 'DashboardHealth',
    excludeFromVendored: ['generatedAt'],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir(p: string): void {
  mkdirSync(p, { recursive: true });
}

/**
 * Resolve a SCHEMA_ENTRIES/OVERLAY_ENTRIES relPath to an absolute file path.
 * `vendored/<file>` paths now resolve from the @lifegames/portal-contract
 * package (the single producer of the raw export schemas); `authored/` and
 * `generated/` paths remain local to this package.
 */
function resolveSchemaPath(relPath: string): string {
  return relPath.startsWith('vendored/')
    ? join(RAW_SCHEMAS_DIR, basename(relPath))
    : join(PKG_ROOT, relPath);
}

/**
 * Deep-merge a vendored LP schema with a DS overlay to produce a generated schema.
 * - properties: vendored props (minus excludeFromVendored) + overlay props (overlay wins on conflict)
 * - required: overlay's required array only (overlay is authoritative; vendored required is ignored)
 * - $id, title, description: from overlay only
 * - type: "object" from vendored
 * - No top-level additionalProperties (forward-compat: LP ships new fields regularly)
 */
function mergeSchemas(
  vendored: JsonObject,
  overlay: JsonObject,
  excludeFromVendored: string[] = [],
): JsonObject {
  const vendoredProps = (vendored['properties'] as JsonObject) ?? {};
  const overlayProps = (overlay['properties'] as JsonObject) ?? {};

  const filteredVendoredProps: JsonObject = {};
  for (const [key, val] of Object.entries(vendoredProps)) {
    if (!excludeFromVendored.includes(key)) {
      filteredVendoredProps[key] = val;
    }
  }

  const merged: JsonObject = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { ...filteredVendoredProps, ...overlayProps },
    required: overlay['required'],
  };

  // $id intentionally omitted — generated schemas are registered under urn:generated: URN.
  // Including $id causes AJV conflict when authored schema with the same $id is also registered.
  if (overlay['title']) merged['title'] = overlay['title'];
  if (overlay['description']) merged['description'] = overlay['description'];

  return merged;
}

/** Read and parse a JSON schema file. */
function readSchema(absPath: string): object {
  return JSON.parse(readFileSync(absPath, 'utf-8'));
}

/**
 * Patch relative $ref paths in a schema object so json-schema-to-typescript
 * can resolve them using absolute file:// URIs.
 * Only dashboard-health.schema.json uses a cross-file $ref; handled generically.
 */
function patchRefs(schema: object, schemaAbsPath: string): object {
  const schemaDir = dirname(schemaAbsPath);
  const raw = JSON.stringify(schema);
  const patched = raw.replace(/"(\$ref)":\s*"([^"]+)"/g, (_match, key, ref) => {
    // Only patch relative file refs (not JSON Pointer-only refs like "#/...")
    if (ref.startsWith('#') || ref.startsWith('http') || ref.startsWith('file:')) {
      return `"${key}":"${ref}"`;
    }
    // Split on '#' to separate path from JSON pointer
    const [filePart, pointerPart] = ref.split('#');
    if (!filePart) return `"${key}":"${ref}"`; // pure JSON pointer, no file
    const absFile = join(schemaDir, filePart);
    const fileUri = `file://${absFile}`;
    const resolved = pointerPart ? `${fileUri}#${pointerPart}` : fileUri;
    return `"${key}":"${resolved}"`;
  });
  return JSON.parse(patched);
}

const GENERATED = join(PKG_ROOT, 'generated');

// ─── Step 1: Ensure output directories ───────────────────────────────────────

console.log('codegen: ensuring output directories...');
ensureDir(DIST_TYPES);
ensureDir(SWIFT_DIR);
ensureDir(SWIFT_TEMP);
ensureDir(GENERATED);

// ─── Step 1b: Generate merged schemas from overlay + vendored ─────────────────

console.log('codegen: generating merged schemas...');
for (const entry of OVERLAY_ENTRIES) {
  const vendoredPath = resolveSchemaPath(entry.vendored);
  const overlayPath = join(PKG_ROOT, entry.overlay);
  const outputPath = join(PKG_ROOT, entry.outputRel);

  const vendored = JSON.parse(readFileSync(vendoredPath, 'utf-8')) as JsonObject;
  const overlay = JSON.parse(readFileSync(overlayPath, 'utf-8')) as JsonObject;
  const merged = mergeSchemas(vendored, overlay, entry.excludeFromVendored);

  writeFileSync(
    outputPath,
    await formatWithPrettier(JSON.stringify(merged, null, 2), outputPath, 'json'),
    'utf-8',
  );
  console.log(`  generated: ${entry.outputRel} (${entry.name})`);
}

// ─── Step 2: Write branded.ts ────────────────────────────────────────────────

console.log('codegen: writing branded.ts...');
const brandedContent = `// SchemaDerived brand — generated types are wrapped in this type alias
// to enforce W16 convention (widget Props MUST extend a schema-derived type).
// Do not modify this file manually — it is regenerated by scripts/codegen.ts.
declare const __schemaDerived: unique symbol;
export type SchemaDerived<T> = T & { readonly [__schemaDerived]: true };
`;
const brandedPath = join(DIST_TYPES, 'branded.ts');
writeFileSync(
  brandedPath,
  await formatWithPrettier(brandedContent, brandedPath, 'typescript'),
  'utf-8',
);

// ─── Step 3: Generate TypeScript types ───────────────────────────────────────

console.log('codegen: generating TypeScript types...');

const generatedNames: string[] = [];

for (const { relPath, name } of SCHEMA_ENTRIES) {
  const absPath = resolveSchemaPath(relPath);
  const raw = readSchema(absPath);
  const patched = patchRefs(raw, absPath);

  process.stdout.write(`  [TS] ${name} (${relPath})...`);

  const ts = await compile(patched as Parameters<typeof compile>[0], name, {
    bannerComment: '',
    additionalProperties: false,
    declareExternallyReferenced: true,
    unreachableDefinitions: false,
    enableConstEnums: false,
    strictIndexSignatures: false,
    style: { singleQuote: true },
    format: false,
  });

  // Prepend a generation notice
  const header = `// Generated by scripts/codegen.ts — do not edit manually.\n// Source: ${relPath}\n\n`;
  const outPath = join(DIST_TYPES, `${name}.ts`);
  const formatted = await formatWithPrettier(header + ts, outPath, 'typescript');
  writeFileSync(outPath, formatted, 'utf-8');
  generatedNames.push(name);
  console.log(' ok');
}

// ─── Step 4: Write index.ts ──────────────────────────────────────────────────

console.log('codegen: writing index.ts...');

const indexLines: string[] = [
  `// Generated by scripts/codegen.ts — do not edit manually.`,
  `// Re-exports all schema-derived types wrapped in SchemaDerived<T>.`,
  ``,
  `export type { SchemaDerived } from './branded';`,
  `import type { SchemaDerived } from './branded';`,
  ``,
];

for (const name of generatedNames) {
  indexLines.push(`import type { ${name} as _${name} } from './${name}';`);
}
indexLines.push('');
for (const name of generatedNames) {
  indexLines.push(`export type ${name} = SchemaDerived<_${name}>;`);
}
indexLines.push('');

const indexPath = join(DIST_TYPES, 'index.ts');
writeFileSync(
  indexPath,
  await formatWithPrettier(indexLines.join('\n'), indexPath, 'typescript'),
  'utf-8',
);

// ─── Step 5: Generate Swift (quicktype, per-schema → aggregate) ───────────────

console.log('codegen: generating Swift structs via quicktype...');

const QUICKTYPE_BIN = join(PKG_ROOT, 'node_modules', '.bin', 'quicktype');

const swiftParts: string[] = [];

for (const { relPath, name } of SCHEMA_ENTRIES) {
  const absPath = resolveSchemaPath(relPath);
  const outFile = join(SWIFT_TEMP, `${name}.swift`);

  process.stdout.write(`  [Swift] ${name} (${relPath})...`);

  try {
    execSync(
      `"${QUICKTYPE_BIN}" --src-lang schema --lang swift --top-level ${name} -o "${outFile}" "${absPath}"`,
      { stdio: 'pipe' },
    );

    const content = readFileSync(outFile, 'utf-8');
    swiftParts.push(content);
    console.log(' ok');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\n  ERROR generating Swift for ${name}: ${msg}`);
    process.exit(1);
  }
}

// Aggregate: deduplicate `import Foundation` and shared helper functions,
// resolve type-name collisions across schemas, add per-schema section markers.
console.log('codegen: aggregating Swift output...');

const SWIFT_HEADER = `// Generated by scripts/codegen.ts — do not edit manually.
// Source: packages/schemas/{vendored,authored}/*.schema.json
// Re-run: pnpm -F @lifegames/schemas codegen
//
// Contains Codable structs for all ${SCHEMA_ENTRIES.length} widget data schemas.
// Shared decoder helpers appear once at the end of this file.

import Foundation

`;

// Helper blocks that quicktype emits per-file but should appear only once.
// We collect them from the last file and dedup.
const HELPER_MARKERS = [
  'func newJSONDecoder()',
  'func newJSONEncoder()',
  'extension String:',
  '// Serialization extensions for types',
];

function isHelperLine(line: string): boolean {
  return HELPER_MARKERS.some((m) => line.includes(m));
}

/**
 * Extract a struct/enum/extension block signature from a Swift line.
 * Returns the type name or null if not a type declaration.
 */
function extractTypeName(line: string): string | null {
  const match = line.match(/^(struct|enum|class)\s+(\w+)/);
  return match ? match[2] : null;
}

/**
 * Extract the full definition block (struct/enum + its extension) for a given
 * type name from a section's lines. Used to compare whether two types with the
 * same name are structurally identical.
 */
function extractTypeBlock(lines: string[], typeName: string): string {
  const result: string[] = [];
  let capturing = false;
  let braceDepth = 0;

  for (const line of lines) {
    if (!capturing) {
      const tn = extractTypeName(line);
      if (tn === typeName) {
        capturing = true;
        braceDepth = 0;
      } else {
        continue;
      }
    }

    if (capturing) {
      // Strip doc comments for comparison purposes
      const trimmed = line.replace(/^\s*\/\/\/.*/, '').trim();
      if (trimmed) result.push(trimmed);
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;
      if (braceDepth <= 0 && result.length > 1) {
        capturing = false;
      }
    }
  }
  return result.join('\n');
}

/**
 * Rename all occurrences of a Swift type name within a section.
 * Uses word-boundary matching to avoid partial replacements.
 */
function renameTypeInSection(content: string, oldName: string, newName: string): string {
  const pattern = new RegExp(`\\b${oldName}\\b`, 'g');
  return content.replace(pattern, newName);
}

// Phase 1: Strip headers/helpers, collect raw content per schema
interface SchemaSection {
  name: string;
  contentLines: string[];
}

const rawSections: SchemaSection[] = [];
let sharedHelpersBlock = '';

for (let i = 0; i < swiftParts.length; i++) {
  const { name } = SCHEMA_ENTRIES[i];
  const lines = swiftParts[i].split('\n');

  const contentLines: string[] = [];
  let pastHeader = false;
  let inHelpers = false;
  const helperLines: string[] = [];

  for (const line of lines) {
    if (!pastHeader) {
      if (
        line.startsWith('import Foundation') ||
        (line.trim() === '' && contentLines.length === 0)
      ) {
        if (line.startsWith('import Foundation')) {
          pastHeader = true;
        }
        continue;
      }
      if (line.startsWith('//')) {
        continue;
      }
    }
    pastHeader = true;

    if (!inHelpers && isHelperLine(line)) {
      inHelpers = true;
    }

    if (inHelpers) {
      helperLines.push(line);
    } else {
      contentLines.push(line);
    }
  }

  if (helperLines.length > 0 && sharedHelpersBlock === '') {
    sharedHelpersBlock = helperLines.join('\n');
  }

  rawSections.push({ name, contentLines });
}

// Phase 2: Detect type-name collisions across schemas and resolve them.
// For each type name seen more than once:
//   - If the struct body is identical → drop the duplicate entirely
//   - If different → prefix with the parent schema name
console.log('codegen: resolving Swift type-name collisions...');

// First occurrence of each type name: schema index and structural signature
const typeRegistry = new Map<string, { schemaIdx: number; signature: string }>();
// Renames to apply per schema: schemaIdx → Map<oldName, newName>
const renameMap = new Map<number, Map<string, string>>();
// Types to drop entirely per schema (identical duplicates)
const dropMap = new Map<number, Set<string>>();

for (let i = 0; i < rawSections.length; i++) {
  const { name: schemaName, contentLines } = rawSections[i];

  const typesInSection: string[] = [];
  for (const line of contentLines) {
    const tn = extractTypeName(line);
    if (tn && !typesInSection.includes(tn)) {
      typesInSection.push(tn);
    }
  }

  for (const typeName of typesInSection) {
    // Skip the top-level schema type itself (e.g., ArticlesExport) — never collides
    if (typeName === schemaName) continue;

    if (!typeRegistry.has(typeName)) {
      const sig = extractTypeBlock(contentLines, typeName);
      typeRegistry.set(typeName, { schemaIdx: i, signature: sig });
    } else {
      const first = typeRegistry.get(typeName)!;
      const currentSig = extractTypeBlock(contentLines, typeName);

      if (currentSig === first.signature) {
        // Identical struct — drop this duplicate
        if (!dropMap.has(i)) dropMap.set(i, new Set());
        dropMap.get(i)!.add(typeName);
        console.log(
          `  drop duplicate: ${typeName} (${schemaName} = ${rawSections[first.schemaIdx].name})`,
        );
      } else {
        // Different struct — prefix with schema name
        const newName = `${schemaName}${typeName}`;
        if (!renameMap.has(i)) renameMap.set(i, new Map());
        renameMap.get(i)!.set(typeName, newName);
        console.log(`  rename: ${typeName} → ${newName} (in ${schemaName})`);
      }
    }
  }
}

// Phase 3: Apply renames and drops, build final sections
const structSections: string[] = [];

for (let i = 0; i < rawSections.length; i++) {
  const { name: schemaName, contentLines } = rawSections[i];
  let sectionText = contentLines.join('\n').trim();
  if (!sectionText) continue;

  // Drop identical duplicate types (remove struct + its extension block)
  const toDrop = dropMap.get(i);
  if (toDrop) {
    for (const typeName of toDrop) {
      sectionText = removeTypeAndExtension(sectionText, typeName);
    }
  }

  // Apply renames for colliding-but-different types
  const renames = renameMap.get(i);
  if (renames) {
    for (const [oldName, newName] of renames) {
      sectionText = renameTypeInSection(sectionText, oldName, newName);
    }
  }

  sectionText = sectionText.trim();
  if (sectionText) {
    structSections.push(`// MARK: - Schema: ${schemaName}\n\n${sectionText}`);
  }
}

/**
 * Remove a struct/enum and its extension block from the section text.
 * Handles: doc comments before the struct, the struct itself, MARK comments,
 * and the `extension TypeName { ... }` convenience block.
 */
function removeTypeAndExtension(text: string, typeName: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let skipping = false;
  let braceDepth = 0;

  for (let j = 0; j < lines.length; j++) {
    const line = lines[j];
    const trimmed = line.trim();

    // Detect start of struct/enum declaration or extension
    if (!skipping) {
      const isStructDecl = new RegExp(`^(struct|enum|class)\\s+${typeName}\\b`).test(trimmed);
      const isExtension = new RegExp(`^extension\\s+${typeName}\\b`).test(trimmed);
      const isMark = new RegExp(`^//\\s*MARK:.*\\b${typeName}\\b`).test(trimmed);

      if (isMark) {
        // Drop MARK comment lines for this type
        // Also drop preceding blank lines that were just added
        while (result.length > 0 && result[result.length - 1].trim() === '') {
          result.pop();
        }
        continue;
      }

      if (isStructDecl || isExtension) {
        // Remove any doc comments or blank lines we already pushed that belong to this block
        while (result.length > 0) {
          const prev = result[result.length - 1].trim();
          if (prev === '' || prev.startsWith('///') || prev.startsWith('// MARK:')) {
            result.pop();
          } else {
            break;
          }
        }
        skipping = true;
        braceDepth = 0;
      }
    }

    if (skipping) {
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;
      if (braceDepth <= 0 && line.includes('}')) {
        skipping = false;
      }
      continue;
    }

    result.push(line);
  }

  // Clean up multiple consecutive blank lines
  return result.join('\n').replace(/\n{3,}/g, '\n\n');
}

const aggregated =
  SWIFT_HEADER +
  structSections.join('\n\n') +
  '\n\n' +
  (sharedHelpersBlock ? '// MARK: - Shared Helpers\n\n' + sharedHelpersBlock + '\n' : '');

writeFileSync(join(SWIFT_DIR, 'WidgetModels.swift'), aggregated, 'utf-8');

// Clean up temp directory
for (const f of readdirSync(SWIFT_TEMP)) {
  rmSync(join(SWIFT_TEMP, f));
}
rmSync(SWIFT_TEMP, { recursive: true });

// ─── Step 6: Write fixture-map.json ──────────────────────────────────────────

console.log('codegen: writing fixture-map.json...');

// Preserve DS-bucket entries written by generate-widget-schemas.mjs.
const existingMap = existsSync(join(PKG_ROOT, 'fixture-map.json'))
  ? (JSON.parse(readFileSync(join(PKG_ROOT, 'fixture-map.json'), 'utf-8')) as Record<
      string,
      unknown
    >)
  : {};

const fixtureMap = {
  consumer: {
    'data/profile.json': { schema: 'Profile', strategy: 'single' },
    'data/system.json': { schema: 'System', strategy: 'single' },
    'data/health.json': { schema: 'DashboardHealth', strategy: 'single' },
    'data/github.json': { schema: 'DashboardGithub', strategy: 'single' },
    'data/reading.json': { schema: 'DashboardReading', strategy: 'single' },
    'data/books.json': { schema: 'DashboardBooks', strategy: 'single' },
    'data/theatre-reviews-sample.json': { schema: 'TheatreReviewsExport', strategy: 'single' },
  },
  ds:
    existingMap.ds &&
    typeof existingMap.ds === 'object' &&
    Object.keys(existingMap.ds as object).length > 1
      ? existingMap.ds
      : {},
};

// Stable serialization: JSON.stringify with sorted keys for idempotency
function sortedStringify(obj: unknown, indent = 2): string {
  return JSON.stringify(
    obj,
    (_key, value) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Object.fromEntries(
          Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)),
        );
      }
      return value;
    },
    indent,
  );
}

const fixtureMapPath = join(PKG_ROOT, 'fixture-map.json');
writeFileSync(
  fixtureMapPath,
  await formatWithPrettier(sortedStringify(fixtureMap), fixtureMapPath, 'json'),
  'utf-8',
);

// ─── Done ─────────────────────────────────────────────────────────────────────

console.log('');
console.log('codegen: complete.');
console.log(
  `  TS types:    dist/types/ (${generatedNames.length} schemas + branded.ts + index.ts)`,
);
console.log(`  Swift:       swift/WidgetModels.swift`);
console.log(`  Fixture map: fixture-map.json`);
