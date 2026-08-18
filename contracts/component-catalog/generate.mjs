#!/usr/bin/env node
/**
 * THE GENERATOR for the component-contract catalog.
 *
 * Every axis is READ from a source that already exists in this repo. Nothing here restates a prop
 * shape, a state name, or an accessibility label. That is the whole design: a hand-written second
 * copy of a prop shape drifts from the first one silently, and a catalog that drifts is worse than
 * no catalog, because it reads as verified.
 *
 * Sources, one per axis:
 *   props   <- packages/schemas/generated/widgets/<widget>.schema.json  (top-level `properties` +
 *              `required`, emitted by packages/schemas/scripts/generate-widget-schemas.mjs from
 *              packages/web/src/widgets/<group>/<Widget>.types.ts)
 *   states  <- Sources/LifegamesWidgets/Resources/widgets/<group>/<widget>.<state>.json filenames
 *              UNION apps/storybook/__snapshots__/production-<group>-<widget>--<state>.png
 *   a11y    <- the first `.accessibilityLabel(` in Sources/LifegamesWidgets/<Group>/<Widget>View.swift
 *   conformance <- PILOT below. Cross-repo, so it cannot be discovered from here; it is a reference
 *              STRING, never executed by this repo.
 *
 * Determinism: every directory read is sorted and every emitted object has a fixed key order, so
 * running this twice produces a zero-byte diff. `check.mjs` proves that on every run.
 */

import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs'
import {join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import * as prettier from 'prettier'

import {CATALOG_SPEC_VERSION} from './schema.mjs'

const HERE = fileURLToPath(new URL('.', import.meta.url))
export const REPO_ROOT = resolve(HERE, '../..')
export const CATALOG_DIR = join(HERE, 'catalog')
export const GENERATED_BY = 'contracts/component-catalog/generate.mjs'

/**
 * The pilot set. Each entry declares only what CANNOT be discovered from this repo: the widget slug
 * and its cross-repo behavioral render test. Group, props, states, a11y and both file refs are all
 * derived and existence-checked below.
 *
 * The three span the difficulty axis deliberately:
 *   bio-terminal — presentation-only, no consumer render test, so conformance is honestly null.
 *   bookshelf    — has a consumer behavioral render test, so the conformance ref is populated.
 *   heart-rate   — has a VoiceOver label in its Swift view, so the a11y axis is populated. It is
 *                  the exception: most widgets in this repo have no label, and their entries say so.
 */
const PILOT = [
  {widget: 'bio-terminal', behavioralTest: null},
  {widget: 'bookshelf', behavioralTest: 'j0nathan-ll0yd.github.io/tests/behavioral/bookshelf-matrix.test.ts'},
  {widget: 'heart-rate', behavioralTest: null}
]

const WEB_WIDGETS = 'packages/web/src/widgets'
const SWIFT_WIDGETS = 'Sources/LifegamesWidgets'
const FIXTURE_ROOT = 'Sources/LifegamesWidgets/Resources/widgets'
const SNAPSHOT_DIR = 'apps/storybook/__snapshots__'
const SCHEMA_DIR = 'packages/schemas/generated/widgets'

/** Mirrors `CATEGORIES` in packages/schemas/scripts/generate-widget-schemas.mjs. */
const CATEGORIES = ['github', 'health', 'identity', 'location', 'other', 'reading']

const sortedDir = (dir) => readdirSync(dir).sort()

/** `bio-terminal` -> `BioTerminal`. The inverse of `toKebab` in the schema generator. */
function toPascal(slug) {
  return slug.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join('')
}

/**
 * The Swift group directory is PascalCase but not mechanically so (`github` -> `GitHub`), so resolve
 * it by matching the real directory listing rather than transforming the string.
 */
function swiftGroupDir(repoRoot, group) {
  const found = sortedDir(join(repoRoot, SWIFT_WIDGETS)).find((name) => name.toLowerCase() === group)
  if (!found) {
    throw new Error(`no Swift group directory matches \`${group}\` under ${SWIFT_WIDGETS}`)
  }
  return found
}

/** The group is wherever the web types file lives — discovered, not declared. */
function resolveGroup(repoRoot, widget) {
  const typesFile = `${toPascal(widget)}.types.ts`
  const hits = CATEGORIES.filter((category) => existsSync(join(repoRoot, WEB_WIDGETS, category, typesFile)))
  if (hits.length !== 1) {
    throw new Error(`expected exactly one group to contain ${typesFile}, found ${hits.length === 0 ? 'none' : hits.join(', ')}`)
  }
  return hits[0]
}

/**
 * Collapse a JSON-schema node to a single type string. Declaration order is preserved: the schema
 * file's bytes are already fixed, so preserving order is both deterministic and faithful.
 */
function schemaType(node) {
  if (typeof node !== 'object' || node === null || Array.isArray(node)) {
    return 'unknown'
  }
  if (typeof node.type === 'string') {
    return node.type
  }
  const union = (members) => [...new Set(members.map(schemaType))].join(' | ')
  if (Array.isArray(node.type)) {
    return [...new Set(node.type)].join(' | ')
  }
  if (Array.isArray(node.anyOf)) {
    return union(node.anyOf)
  }
  if (Array.isArray(node.oneOf)) {
    return union(node.oneOf)
  }
  if (Array.isArray(node.enum)) {
    return [...new Set(node.enum.map((value) => typeof value))].join(' | ')
  }
  return 'unknown'
}

/**
 * Top-level props only for Increment 0. Depth is the obvious next increment; a shallow catalog that
 * is generated beats a deep one that is typed by hand.
 */
function readProps(repoRoot, widget) {
  const rel = `${SCHEMA_DIR}/${widget}.schema.json`
  const abs = join(repoRoot, rel)
  if (!existsSync(abs)) {
    throw new Error(`no generated widget schema at ${rel} — run \`pnpm -F @j0nathan-ll0yd/schemas codegen\` first`)
  }
  const schema = JSON.parse(readFileSync(abs, 'utf8'))
  const required = new Set(Array.isArray(schema.required) ? schema.required : [])
  const props = {}
  for (const name of Object.keys(schema.properties ?? {}).sort()) {
    props[name] = {type: schemaType(schema.properties[name]), optional: !required.has(name)}
  }
  return {props, ref: rel}
}

/** Fixture filenames. `<widget>.json` with no infix is the default state. */
function fixtureStates(repoRoot, group, widget) {
  const dir = join(repoRoot, FIXTURE_ROOT, group)
  const states = []
  for (const file of sortedDir(dir)) {
    if (!file.endsWith('.json')) {
      continue
    }
    const base = file.slice(0, -'.json'.length)
    if (base === widget) {
      states.push('default')
      continue
    }
    if (base.startsWith(`${widget}.`)) {
      states.push(base.slice(widget.length + 1))
    }
  }
  return states
}

/** Storybook visual-baseline filenames. Absent for most widgets; absence is not an error. */
function snapshotStates(repoRoot, group, widget) {
  const dir = join(repoRoot, SNAPSHOT_DIR)
  if (!existsSync(dir)) {
    return []
  }
  const prefix = `production-${group}-${widget}--`
  const states = []
  for (const file of sortedDir(dir)) {
    if (file.startsWith(prefix) && file.endsWith('.png')) {
      states.push(file.slice(prefix.length, -'.png'.length))
    }
  }
  return states
}

/**
 * `voiceOverLabel` is `true` with a `<file>:<line>` ref, or `null`. `null` is a written GAP: roughly
 * 26 of this repo's widgets have no label, and the catalog records that rather than implying a pass.
 */
function readA11y(repoRoot, group, widget) {
  const rel = `${SWIFT_WIDGETS}/${swiftGroupDir(repoRoot, group)}/${toPascal(widget)}View.swift`
  const abs = join(repoRoot, rel)
  if (!existsSync(abs)) {
    throw new Error(`no Swift view at ${rel}`)
  }
  const lines = readFileSync(abs, 'utf8').split('\n')
  const index = lines.findIndex((line) => line.includes('.accessibilityLabel('))
  if (index === -1) {
    return {a11y: {voiceOverLabel: null, ref: null}, source: rel}
  }
  return {a11y: {voiceOverLabel: true, ref: `${rel}:${index + 1}`}, source: rel}
}

function swiftPropsRef(repoRoot, group, widget) {
  const rel = `${SWIFT_WIDGETS}/${swiftGroupDir(repoRoot, group)}/${toPascal(widget)}Props.swift`
  if (!existsSync(join(repoRoot, rel))) {
    throw new Error(`no Swift Props file at ${rel}`)
  }
  return rel
}

/**
 * Build one entry. Key order here IS the emitted key order — do not reorder casually, it changes
 * every contract file's bytes.
 *
 * @param {string} repoRoot
 * @param {{widget: string, behavioralTest: string | null}} pilot
 */
export function buildEntry(repoRoot, pilot) {
  const {widget, behavioralTest} = pilot
  const group = resolveGroup(repoRoot, widget)
  const {props, ref: propsSchemaRef} = readProps(repoRoot, widget)
  const {a11y, source: a11ySource} = readA11y(repoRoot, group, widget)
  const states = [...new Set([...fixtureStates(repoRoot, group, widget), ...snapshotStates(repoRoot, group, widget)])].sort()

  if (states.length === 0) {
    throw new Error(`no fixtures or snapshots found for ${widget} in group ${group}`)
  }

  return {
    specVersion: CATALOG_SPEC_VERSION,
    widget,
    group,
    props,
    propsRef: `${WEB_WIDGETS}/${group}/${toPascal(widget)}.types.ts`,
    swiftPropsRef: swiftPropsRef(repoRoot, group, widget),
    states,
    a11y,
    conformance: {behavioralTest},
    generatedBy: GENERATED_BY,
    sources: {
      props: propsSchemaRef,
      states: [`${FIXTURE_ROOT}/${group}/${widget}[.<state>].json`, `${SNAPSHOT_DIR}/production-${group}-${widget}--<state>.png`],
      a11y: a11ySource
    }
  }
}

/**
 * Format emitted JSON through Prettier (root .prettierrc.mjs) so the bytes are stable for
 * `format:check`. Mirrors `writeJson` in packages/schemas/scripts/generate-widget-schemas.mjs — the
 * repo's established rule for generated JSON.
 */
export async function formatJson(outPath, data) {
  const cfg = await prettier.resolveConfig(outPath)
  return prettier.format(JSON.stringify(data, null, 2), {...cfg, parser: 'json', filepath: outPath})
}

/**
 * Generate every pilot contract into `outDir`.
 *
 * @param {{repoRoot?: string, outDir?: string}} [options]
 * @returns {Promise<Array<{widget: string, file: string, bytes: string}>>}
 */
export async function generateAll({repoRoot = REPO_ROOT, outDir = CATALOG_DIR} = {}) {
  mkdirSync(outDir, {recursive: true})
  const written = []
  for (const pilot of [...PILOT].sort((a, b) => (a.widget < b.widget ? -1 : 1))) {
    const entry = buildEntry(repoRoot, pilot)
    const file = `${entry.widget}.contract.json`
    const outPath = join(outDir, file)
    const bytes = await formatJson(outPath, entry)
    writeFileSync(outPath, bytes)
    written.push({widget: entry.widget, file, bytes})
  }
  return written
}

export const PILOT_WIDGETS = PILOT.map((pilot) => pilot.widget).sort()

if (import.meta.url === `file://${process.argv[1]}`) {
  const written = await generateAll()
  process.stdout.write(`[component-catalog] generated ${written.length} contracts into contracts/component-catalog/catalog/\n`)
  for (const {file} of written) {
    process.stdout.write(`  - ${file}\n`)
  }
}
