#!/usr/bin/env tsx
/**
 * build.ts — @lifegames/copy build + codegen pipeline.
 *
 * Single producer of every copy artifact. Manifest-driven: the NAMESPACES
 * array parametrizes the per-namespace pipeline. Each manifest entry maps one
 * copy namespace to its rich authoring file, flat schema, and generated outputs.
 * New namespaces are added as additional manifest entries.
 *
 * Per-namespace pipeline:
 *   1. Validate the RICH authoring file (src/<name>.en-US.json) against the
 *      rich schema (schema/<name>.schema.json) with Ajv + ajv-formats. This is
 *      the ONLY place the rich {value,_meta} shape is validated.
 *   2. Derive a FLAT JSON Schema from the rich one: walk the schema tree and
 *      replace ONLY the leaf $refs (CopyString → {type:string}, CopyStringList →
 *      {type:array,items:{type:string}}), preserving every object wrapper,
 *      `required` array, and `additionalProperties:false`. This flat schema is
 *      the SINGLE input to all codegen (TS/Zod/Swift) — consumers read flat
 *      values, never the rich {value,_meta} shape.
 *   3. Emit the flat instance (dist/<name>.flat.json, _meta stripped) + barrel.
 *   4. TS    — json-schema-to-typescript over the flat schema → dist/<name>.ts
 *   5. Zod   — json-schema-to-zod over the flat schema → dist/<name>.zod.ts
 *   6. Swift — quicktype over the flat schema → ../../Sources/LifegamesCopy/<TopLevelType>.generated.swift
 *   7. Resource — flat instance → ../../Sources/LifegamesCopy/Resources/<name>.en-US.json
 *
 * Round-trip guard: the derived flat schema MUST validate the flat instance
 * (ajv.validate(flatSchema, flatJson)) so a derivation bug cannot silently drop
 * a `required` field. Idempotent: re-running yields byte-identical output.
 *
 * Cross-namespace Swift type-name collision guard: quicktype derives nested
 * struct names from JSON keys, so two namespaces sharing a top-level type name
 * would emit colliding Swift structs across files. After generating every
 * namespace the build asserts the set of top-level Swift type names is unique.
 *
 * Leaf boundary: @lifegames/copy is a zero-runtime-dependency leaf — the src/
 * tree must not import any @lifegames/* or UI package (enforced by the
 * leaf-boundary ESLint rule, GOVERNANCE P3.1). The authoring schema lives in
 * schema/ and is read here in scripts/; consumers read the flat dist/ outputs only.
 */

import {mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {execFileSync} from 'node:child_process'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import {compile} from 'json-schema-to-typescript'
import jsonSchemaToZod from 'json-schema-to-zod'
import * as prettier from 'prettier'

async function formatWithPrettier(src: string, outPath: string, parser: 'typescript' | 'json'): Promise<string> {
  const cfg = await prettier.resolveConfig(outPath)
  return prettier.format(src, {...cfg, parser, filepath: outPath})
}

const HERE = dirname(fileURLToPath(import.meta.url))

const PKG_ROOT = join(HERE, '..') // packages/copy
const DS_ROOT = join(PKG_ROOT, '..', '..') // design-system-Lifegames
const SRC = join(PKG_ROOT, 'src')
const SCHEMA = join(PKG_ROOT, 'schema')
const DIST = join(PKG_ROOT, 'dist')
const SWIFT_TARGET = join(DS_ROOT, 'Sources', 'LifegamesCopy')
const SWIFT_RESOURCES = join(SWIFT_TARGET, 'Resources')

type JsonSchema = Record<string, any>

/**
 * One copy namespace. Everything the single-file generator hardcoded for
 * `identity` is parametrized here so additional namespaces are pure data entries.
 */
interface Namespace {
  /** Namespace key, used for src/dist/resource basenames (e.g. 'identity'). */
  name: string
  /** Top-level TS/Swift type name + flat-schema title (e.g. 'Identity'). */
  topLevelType: string
  /** Flat-schema $id. */
  flatSchemaId: string
}

const NAMESPACES: Namespace[] = [
  {name: 'identity', topLevelType: 'Identity', flatSchemaId: 'https://lifegames.org/schemas/copy.identity.flat.schema.json'},
  {name: 'widgets', topLevelType: 'Widgets', flatSchemaId: 'https://lifegames.org/schemas/copy.widgets.flat.schema.json'},
  {name: 'a11y', topLevelType: 'Accessibility', flatSchemaId: 'https://lifegames.org/schemas/copy.a11y.flat.schema.json'},
  {name: 'app', topLevelType: 'App', flatSchemaId: 'https://lifegames.org/schemas/copy.app.flat.schema.json'},
  {name: 'permissions', topLevelType: 'Permissions', flatSchemaId: 'https://lifegames.org/schemas/copy.permissions.flat.schema.json'},
  {name: 'errors', topLevelType: 'Errors', flatSchemaId: 'https://lifegames.org/schemas/copy.errors.flat.schema.json'},
  {name: 'llm', topLevelType: 'Llm', flatSchemaId: 'https://lifegames.org/schemas/copy.llm.flat.schema.json'}
]

/** Per-namespace generated-file banner. Names the namespace's own rich source so
 * each artifact points at its true source of truth (identity files keep
 * `identity.en-US.json`, so their output stays byte-identical). */
function genHeader(name: string): string {
  return (
    '// Generated by packages/copy/scripts/build.ts — do not edit manually.\n' +
    `// Source of truth: packages/copy/src/${name}.en-US.json (rich) → derived flat schema.\n` +
    '// Re-run: pnpm -F @lifegames/copy build\n\n'
  )
}

/** Barrel banner — the combined barrel spans every namespace. */
const BARREL_HEADER = '// Generated by packages/copy/scripts/build.ts — do not edit manually.\n' +
  '// Source of truth: packages/copy/src/*.en-US.json (rich) → derived flat schemas.\n' +
  '// Re-run: pnpm -F @lifegames/copy build\n\n'

function readJson(p: string): any {
  return JSON.parse(readFileSync(p, 'utf-8'))
}
function ensureDir(p: string): void {
  mkdirSync(p, {recursive: true})
}

// ── Derive the FLAT schema (tree-walk; replace only leaf $refs) ───────────────
const STRING_REF = '#/$defs/CopyString'
const LIST_REF = '#/$defs/CopyStringList'

function deriveFlat(node: JsonSchema): JsonSchema {
  if (node && typeof node === 'object' && typeof node.$ref === 'string') {
    if (node.$ref === STRING_REF) {
      return {type: 'string'}
    }
    if (node.$ref === LIST_REF) {
      return {type: 'array', items: {type: 'string'}}
    }
    throw new Error(`deriveFlat: unexpected $ref "${node.$ref}" — only CopyString/CopyStringList leaves are allowed`)
  }
  if (node && node.type === 'object' && node.properties) {
    const properties: JsonSchema = {}
    for (const [key, sub] of Object.entries(node.properties)) {
      properties[key] = deriveFlat(sub as JsonSchema)
    }
    const out: JsonSchema = {type: 'object'}
    if (node.title) {
      out.title = node.title
    }
    if (node.description) {
      out.description = node.description
    }
    out.properties = properties
    if (Array.isArray(node.required)) {
      out.required = [...node.required]
    }
    if ('additionalProperties' in node) {
      out.additionalProperties = node.additionalProperties
    }
    return out
  }
  throw new Error(`deriveFlat: unexpected node shape ${JSON.stringify(node).slice(0, 160)}`)
}

// ── Derive the FLAT instance (strip _meta, keep values) ───────────────────────
function isLeaf(n: any): boolean {
  return (
    n && typeof n === 'object' && !Array.isArray(n) && Object.prototype.hasOwnProperty.call(n, 'value') && Object.prototype.hasOwnProperty.call(n, '_meta')
  )
}
function flattenInstance(n: any): any {
  if (isLeaf(n)) {
    return n.value
  }
  if (n && typeof n === 'object' && !Array.isArray(n)) {
    const out: any = {}
    for (const [key, val] of Object.entries(n)) {
      out[key] = flattenInstance(val)
    }
    return out
  }
  return n
}

const ajv = new Ajv({allErrors: true, strict: false})
addFormats(ajv)

ensureDir(DIST)
ensureDir(SWIFT_TARGET)
ensureDir(SWIFT_RESOURCES)

const QUICKTYPE_BIN = join(PKG_ROOT, 'node_modules', '.bin', 'quicktype')

/** Top-level Swift type names emitted across all namespaces (collision guard). */
const swiftTopLevelNames: {name: string; namespace: string}[] = []

/**
 * Every Swift struct name emitted across all namespaces (top-level + NESTED).
 * quicktype derives nested struct names from JSON keys (or a group object's
 * `title`), and within a single Swift module two namespaces emitting a struct of
 * the same name redeclare it (compile error). The top-level guard alone misses
 * nested collisions, so we also assert that the full set of struct names is
 * unique across namespaces. Disambiguate by giving each colliding group object a
 * unique `title` in its rich schema (e.g. a11y prefixes its groups with `A11y`).
 */
const swiftStructNames: {name: string; namespace: string}[] = []
const SWIFT_STRUCT_RE = /^public struct ([A-Za-z0-9_]+)/gm

/**
 * quicktype emits an identical module-private helper block
 * (`newJSONDecoder()` / `newJSONEncoder()`) into every generated Swift file.
 * Within a single Swift module those free functions collide (redeclaration),
 * so we keep the block in the FIRST file emitted and strip it from the rest.
 * The marker `// MARK: - Helper functions for creating encoders and decoders`
 * is stable across quicktype versions and always precedes the helper block at
 * the file tail.
 */
const SWIFT_HELPER_MARKER = '// MARK: - Helper functions for creating encoders and decoders'
let swiftHelpersEmitted = false

/** Result of building one namespace, used to emit the combined barrel. */
interface BuiltNamespace {
  name: string
  topLevelType: string
}
const built: BuiltNamespace[] = []

for (const ns of NAMESPACES) {
  const richInstancePath = join(SRC, `${ns.name}.en-US.json`)
  const richSchemaPath = join(SCHEMA, `${ns.name}.schema.json`)

  // ── 1. Validate the rich authoring file ─────────────────────────────────────
  console.log(`copy:build — validating rich ${ns.name} against rich schema (Ajv)...`)
  const richSchema = readJson(richSchemaPath) as JsonSchema
  const richInstance = readJson(richInstancePath)

  const validateRich = ajv.compile(richSchema)
  if (!validateRich(richInstance)) {
    console.error(`copy:build — RICH validation FAILED (${ns.name}):`)
    for (const e of validateRich.errors ?? []) {
      console.error(`  ${e.instancePath || '/'} ${e.message}`)
    }
    process.exit(1)
  }
  console.log('  rich OK.')

  // ── 2. Derive the FLAT schema ───────────────────────────────────────────────
  console.log(`copy:build — deriving flat schema (${ns.name})...`)
  const flatSchema: JsonSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: ns.flatSchemaId,
    ...deriveFlat(richSchema),
    title: ns.topLevelType
  }

  // ── 3. Derive the FLAT instance + round-trip guard ──────────────────────────
  const flatInstance = flattenInstance(richInstance)

  const validateFlat = ajv.compile(flatSchema)
  if (!validateFlat(flatInstance)) {
    console.error(`copy:build — FLAT round-trip validation FAILED (derivation bug, ${ns.name}):`)
    for (const e of validateFlat.errors ?? []) {
      console.error(`  ${e.instancePath || '/'} ${e.message}`)
    }
    process.exit(1)
  }
  console.log('  flat derivation + round-trip OK.')

  // ── 4. Write JSON artifacts ─────────────────────────────────────────────────
  const flatSchemaPath = join(DIST, `${ns.name}.flat.schema.json`)
  const flatInstancePath = join(DIST, `${ns.name}.flat.json`)
  const flatInstanceRaw = JSON.stringify(flatInstance, null, 2) + '\n'
  const flatSchemaJson = await formatWithPrettier(JSON.stringify(flatSchema, null, 2) + '\n', flatSchemaPath, 'json')
  const flatInstanceJson = await formatWithPrettier(flatInstanceRaw, flatInstancePath, 'json')
  writeFileSync(flatSchemaPath, flatSchemaJson)
  writeFileSync(flatInstancePath, flatInstanceJson)

  // ── 5. TS types ─────────────────────────────────────────────────────────────
  console.log(`copy:build — TS (json-schema-to-typescript, ${ns.name})...`)
  const tsRaw = await compile(flatSchema as Parameters<typeof compile>[0], ns.topLevelType, {
    bannerComment: '',
    additionalProperties: false,
    declareExternallyReferenced: true,
    enableConstEnums: false,
    format: false
  })
  const tsPath = join(DIST, `${ns.name}.ts`)
  const ts = await formatWithPrettier(genHeader(ns.name) + tsRaw, tsPath, 'typescript')
  writeFileSync(tsPath, ts)

  // ── 6. Zod (validates the FLAT JSON the web collection reads) ────────────────
  console.log(`copy:build — Zod (json-schema-to-zod, ${ns.name})...`)
  const zodRaw = jsonSchemaToZod(flatSchema, {name: `${ns.name}Schema`, module: 'esm'})
  const zodPath = join(DIST, `${ns.name}.zod.ts`)
  const zod = await formatWithPrettier(genHeader(ns.name) + zodRaw, zodPath, 'typescript')
  writeFileSync(zodPath, zod)

  // ── 7. Swift (quicktype over the flat schema) ───────────────────────────────
  console.log(`copy:build — Swift (quicktype, ${ns.name})...`)
  const swiftTmp = join(DIST, `.${ns.name}.swift.tmp`)
  execFileSync(QUICKTYPE_BIN, [
    '--src-lang',
    'schema',
    '--lang',
    'swift',
    '--top-level',
    ns.topLevelType,
    '--access-level',
    'public',
    '--sendable',
    '-o',
    swiftTmp,
    flatSchemaPath
  ], {stdio: 'pipe'})
  let swift = readFileSync(swiftTmp, 'utf-8')
  rmSync(swiftTmp)
  // Drop quicktype's leading comment banner (everything before the first import).
  swift = swift.replace(/^[\s\S]*?(?=^import )/m, '').trimStart()
  // Keep the shared JSON encoder/decoder helper block in the first Swift file
  // only; strip it from subsequent files to avoid module-level redeclaration.
  const helperIdx = swift.indexOf(SWIFT_HELPER_MARKER)
  if (helperIdx !== -1) {
    if (swiftHelpersEmitted) {
      swift = swift.slice(0, helperIdx).trimEnd() + '\n'
    } else {
      swiftHelpersEmitted = true
    }
  }
  writeFileSync(join(SWIFT_TARGET, `${ns.topLevelType}.generated.swift`), genHeader(ns.name) + swift + (swift.endsWith('\n') ? '' : '\n'))

  // Record every struct name this namespace emits for the nested-collision guard.
  for (const m of swift.matchAll(SWIFT_STRUCT_RE)) {
    swiftStructNames.push({name: m[1], namespace: ns.name})
  }

  // ── 8. Resource (flat values shipped to device) ─────────────────────────────
  // Swift resources are prettierignored — write unformatted raw JSON.
  writeFileSync(join(SWIFT_RESOURCES, `${ns.name}.en-US.json`), flatInstanceRaw)

  swiftTopLevelNames.push({name: ns.topLevelType, namespace: ns.name})
  built.push({name: ns.name, topLevelType: ns.topLevelType})
}

// ── 9. Cross-namespace Swift type-name collision guard ────────────────────────
const seenSwiftTypes = new Map<string, string>()
for (const {name, namespace} of swiftTopLevelNames) {
  const prior = seenSwiftTypes.get(name)
  if (prior) {
    console.error(
      `copy:build — Swift top-level type collision: "${name}" generated by both ` +
        `namespace "${prior}" and namespace "${namespace}". Top-level type names must ` +
        'be unique across namespaces to avoid cross-file Swift redeclaration.'
    )
    process.exit(1)
  }
  seenSwiftTypes.set(name, namespace)
}

// ── 9b. Cross-namespace NESTED Swift struct collision guard ───────────────────
// quicktype names nested structs from JSON keys (or a group's `title`). Two
// namespaces emitting a same-named struct redeclare it inside the single Swift
// module. Assert every struct name (top-level + nested) is unique across
// namespaces; the fix is a unique `title` on the colliding group in its schema.
const seenSwiftStructs = new Map<string, string>()
for (const {name, namespace} of swiftStructNames) {
  const prior = seenSwiftStructs.get(name)
  if (prior && prior !== namespace) {
    console.error(
      `copy:build — Swift struct collision: "${name}" generated by both namespace ` +
        `"${prior}" and namespace "${namespace}". Nested struct names (derived from ` +
        'group keys) must be unique across namespaces to avoid cross-file Swift ' +
        'redeclaration. Give the colliding group a unique `title` in its rich schema ' +
        '(e.g. prefix it with the namespace, like the a11y groups use `A11y*`).'
    )
    process.exit(1)
  }
  seenSwiftStructs.set(name, namespace)
}

// ── 10. Combined barrel (zero-dep main entry; typed flat values, no Zod) ───────
// One import binding per namespace (`<name>Data`) so multiple namespaces never
// collide on a shared `data` identifier (TS2300). Each namespace re-exports its
// top-level type plus a typed const holding its flat values.
let barrel = BARREL_HEADER
for (const b of built) {
  const dataBinding = `${b.name}Data`
  barrel += `import ${dataBinding} from './${b.name}.flat.json';\n`
  barrel += `import type { ${b.topLevelType} } from './${b.name}';\n\n`
  barrel += `export type { ${b.topLevelType} } from './${b.name}';\n\n`
  barrel += `export const ${b.name}: ${b.topLevelType} = ${dataBinding};\n`
}
const indexPath = join(DIST, 'index.ts')
const formattedBarrel = await formatWithPrettier(barrel, indexPath, 'typescript')
writeFileSync(indexPath, formattedBarrel)

console.log('copy:build — done.')
for (const b of built) {
  console.log(`  dist/: ${b.name}.flat.schema.json, ${b.name}.flat.json, ${b.name}.ts, ${b.name}.zod.ts`)
  console.log(`  swift: Sources/LifegamesCopy/${b.topLevelType}.generated.swift (+ Resources/${b.name}.en-US.json)`)
}
console.log('  dist/index.ts (combined barrel)')
