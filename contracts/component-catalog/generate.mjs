#!/usr/bin/env node
/**
 * Generates the catalog union from existing component sources. Recursive normalization preserves
 * props, states, accessibility, and conformance metadata; missing values become null. Sorted
 * output keeps regeneration deterministic.
 */

import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs'
import {basename, dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import * as prettier from 'prettier'

import {CATALOG_SPEC_VERSION, KNOWN_PLATFORMS, MAX_PROP_DEPTH} from './schema.mjs'

const HERE = fileURLToPath(new URL('.', import.meta.url))
export const REPO_ROOT = resolve(HERE, '../..')
export const CATALOG_DIR = join(HERE, 'catalog')
export const GENERATED_BY = 'contracts/component-catalog/generate.mjs'

/**
 * The ONE axis that cannot be discovered from this repo: which widgets a CONSUMER holds to a
 * behavioral render test. The tests live in the web consumer's repository, so there is nothing here
 * to read; the value is a reference string and this repo never runs it.
 *
 * Two widgets have one today. Every other widget's `conformance.behavioralTest` is `null`, which is a
 * written GAP, not a pass — the catalog's whole job on this axis is to make the other 31 gaps
 * countable instead of invisible.
 *
 * Adding one: land the consumer test, then add its path here. Keep the map keyed by canonical widget
 * id; an entry naming an id outside the union throws below rather than being silently ignored.
 */
const BEHAVIORAL_TESTS = {
  bookshelf: 'j0nathan-ll0yd.github.io/tests/behavioral/bookshelf-matrix.test.ts',
  'theatre-reviews': 'j0nathan-ll0yd.github.io/tests/behavioral/theatre-reviews-matrix.test.ts'
}

const WEB_WIDGETS = 'packages/web/src/widgets'
const SWIFT_WIDGETS = 'Sources/LifegamesWidgets'
/**
 * The watchOS widget target. It is a FLAT directory with no group sub-directories, and it holds two
 * widgets that exist on no other surface. Reading only `Sources/LifegamesWidgets` would leave both
 * out of the union while their generated schemas sat in the tree — the catalog would report 31
 * widgets and be silently wrong about the other two.
 */
const SWIFT_WATCH_WIDGETS = 'Sources/LifegamesWidgetsWatch'
const FIXTURE_ROOT = 'Sources/LifegamesWidgets/Resources/widgets'
const WIDGET_MANIFEST = 'Sources/LifegamesWidgets/Resources/widgets/widget-manifest.json'
const SNAPSHOT_DIR = 'apps/storybook/__snapshots__'
const SCHEMA_DIR = 'packages/schemas/generated/widgets'

/** Mirrors `CATEGORIES` in packages/schemas/scripts/generate-widget-schemas.mjs. */
const CATEGORIES = ['github', 'health', 'identity', 'location', 'other', 'reading']

const sortedDir = (dir) => readdirSync(dir).sort()
const sortedFiles = (dir) => (existsSync(dir) ? sortedDir(dir) : [])

/**
 * Mirrors `toKebab` in packages/schemas/scripts/generate-widget-schemas.mjs, which is where the
 * generated schema FILENAMES come from. Copied rather than imported because that script runs its
 * whole codegen at import time; a gate that has to generate every widget schema to read one function
 * is a gate that fails for reasons unrelated to the contract.
 *
 * It is the FALLBACK normalizer, not the primary one. The schema generator also carries a table of
 * hand-written schemas keyed by an id `toKebab` does not produce — `OGImageProps` kebabs to `ogimage`
 * while the committed file is `og-image.schema.json` — so deriving ids from this function alone would
 * mis-pair that widget. `schemaIndex` below reads the real filenames and their `title` instead, and
 * `toKebab` is used only for a web types file that has no generated schema to be indexed from.
 */
export function toKebab(name) {
  return name.replace(/Props$/, '').replace(/V(\d+)$/, '-v$1').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * The canonical id index, read from the generated widget schemas.
 *
 * The FILENAME is the canonical kebab id and the `title` is the PascalCase props type both other
 * trees name their files after, so the schema directory is the one place where the two spellings sit
 * side by side. Pairing through it is exact: nothing is transformed, so nothing can be mis-transformed.
 *
 * @returns {{byId: Map<string, {id: string, pascal: string, ref: string}>, byPascal: Map<string, string>}}
 */
export function schemaIndex(repoRoot) {
  const byId = new Map()
  const byPascal = new Map()
  for (const file of sortedFiles(join(repoRoot, SCHEMA_DIR))) {
    if (!file.endsWith('.schema.json')) {
      continue
    }
    const id = file.slice(0, -'.schema.json'.length)
    const ref = `${SCHEMA_DIR}/${file}`
    const {title} = JSON.parse(readFileSync(join(repoRoot, ref), 'utf8'))
    if (typeof title !== 'string' || !title.endsWith('Props')) {
      throw new Error(
        `${ref}: expected a \`title\` ending in \`Props\`, got ${
          JSON.stringify(title)
        } — the title is how this schema is paired with its web and Swift files`
      )
    }
    const pascal = title.slice(0, -'Props'.length)
    const clash = byPascal.get(pascal)
    if (clash !== undefined) {
      throw new Error(`two generated schemas declare the title \`${title}\`: ${clash}.schema.json and ${file} — the pairing would be ambiguous`)
    }
    byPascal.set(pascal, id)
    byId.set(id, {id, pascal, ref})
  }
  if (byId.size === 0) {
    throw new Error(`no generated widget schemas under ${SCHEMA_DIR} — run \`pnpm -F @j0nathan-ll0yd/schemas codegen\` first`)
  }
  return {byId, byPascal}
}

/** Every `<Widget>.types.ts` under the six web group directories. */
function webWidgets(repoRoot, byPascal) {
  const found = new Map()
  for (const group of CATEGORIES) {
    for (const file of sortedFiles(join(repoRoot, WEB_WIDGETS, group))) {
      if (!file.endsWith('.types.ts')) {
        continue
      }
      const pascal = file.slice(0, -'.types.ts'.length)
      // A types file with a generated schema takes the schema's id; one without has no props axis to
      // pair against, so `toKebab` is the only available reading and the entry's `props` is null.
      const id = byPascal.get(pascal) ?? toKebab(`${pascal}Props`)
      found.set(id, {id, pascal, group, ref: `${WEB_WIDGETS}/${group}/${file}`})
    }
  }
  return found
}

/**
 * Resolve a Swift view's PascalCase name to a canonical widget id, or throw.
 *
 * Two rules, in order, and NO third guess:
 *   1. A generated schema declares `<Pascal>Props` — an exact pairing.
 *   2. Exactly one schema declares `<Pascal>V<n>Props`. The web type carries a version suffix the
 *      Swift view never took (`ExplorationOdometerView` against `ExplorationOdometerV3Props`), and
 *      the schema filename is the props source, so the versioned id wins and the Swift file is
 *      recorded through `swiftPropsRef` instead.
 *
 * Anything else throws by name. A wrong pairing writes one widget's prop tree under another widget's
 * slug, which is a contract that reads as verified and is not — strictly worse than a missing entry.
 */
function resolveSwiftId(pascal, byPascal, ref) {
  const direct = byPascal.get(pascal)
  if (direct !== undefined) {
    return direct
  }
  const versioned = [...byPascal.keys()].filter((name) => name.startsWith(`${pascal}V`) && /^\d+$/.test(name.slice(pascal.length + 1)))
  if (versioned.length === 1) {
    return byPascal.get(versioned[0])
  }
  throw new Error(
    `cannot map the Swift widget \`${pascal}\` (${ref}) to a canonical widget id: no generated schema declares the title \`${pascal}Props\`, and ${
      versioned.length === 0 ? 'none declares' : `${versioned.length} declare`
    } a versioned \`${pascal}V<n>Props\`${versioned.length > 1 ? ` (${versioned.join(', ')})` : ''}. ` +
      'Add the widget to packages/web/src/widgets (which generates its schema) or to MANUAL_SCHEMAS in packages/schemas/scripts/generate-widget-schemas.mjs. ' +
      'This generator will not guess a pairing.'
  )
}

/**
 * Every `<Widget>View.swift`, across the grouped iOS target and the flat watchOS target.
 *
 * The view file — not the props file — is what makes a widget Swift-present: five widgets in this
 * repo have a view and no dedicated `<Widget>Props.swift` because they share a props type
 * (`DevActivityEvent`, `LocationProps`). Keying on the props file would drop all five from the Swift
 * side of the union and write them up as web-only, which is false.
 */
function swiftWidgets(repoRoot, byPascal) {
  const found = new Map()
  const record = (dir, file, group) => {
    if (!file.endsWith('View.swift')) {
      return
    }
    const pascal = file.slice(0, -'View.swift'.length)
    const viewRef = `${dir}/${file}`
    const id = resolveSwiftId(pascal, byPascal, viewRef)
    const propsRel = `${dir}/${pascal}Props.swift`
    const clash = found.get(id)
    if (clash !== undefined) {
      throw new Error(`two Swift views resolve to the widget id \`${id}\`: ${clash.viewRef} and ${viewRef}`)
    }
    found.set(id, {id, pascal, group, viewRef, propsRef: existsSync(join(repoRoot, propsRel)) ? propsRel : null})
  }

  for (const dir of sortedFiles(join(repoRoot, SWIFT_WIDGETS))) {
    const group = dir.toLowerCase()
    if (!CATEGORIES.includes(group)) {
      continue
    }
    for (const file of sortedFiles(join(repoRoot, SWIFT_WIDGETS, dir))) {
      record(`${SWIFT_WIDGETS}/${dir}`, file, group)
    }
  }
  // The watch target has no group directory, so its widgets take their group from the manifest below.
  for (const file of sortedFiles(join(repoRoot, SWIFT_WATCH_WIDGETS))) {
    record(SWIFT_WATCH_WIDGETS, file, null)
  }
  return found
}

/**
 * `widget-manifest.json`, keyed by the PascalCase widget name.
 *
 * It supplies two facts nothing else can: the fixture BASENAME, which is not always the canonical id
 * (`GitHubHeatmap` -> `other/github-heatmap.json` against the schema's `git-hub-heatmap`), and the
 * category of a watch widget, which has no group directory to be read from.
 */
function manifestIndex(repoRoot) {
  const {widgets} = JSON.parse(readFileSync(join(repoRoot, WIDGET_MANIFEST), 'utf8'))
  return new Map(widgets.map((widget) => [widget.name, widget]))
}

/**
 * The UNION of the two widget sets, keyed by canonical id and sorted.
 *
 * This is the set the catalog must cover exactly: every member gets one entry, and no entry exists
 * for a non-member. Discovered on every run, so the two trees cannot drift out of the catalog by
 * someone forgetting to add a line to a list.
 *
 * @returns {Array<{id, group, pascal, web: object | null, swift: object | null, schema: object | null, manifest: object | null}>}
 */
export function unionWidgets(repoRoot = REPO_ROOT) {
  const {byId, byPascal} = schemaIndex(repoRoot)
  const web = webWidgets(repoRoot, byPascal)
  const swift = swiftWidgets(repoRoot, byPascal)
  const manifest = manifestIndex(repoRoot)

  const ids = [...new Set([...web.keys(), ...swift.keys()])].sort()
  return ids.map((id) => {
    const webSide = web.get(id) ?? null
    const swiftSide = swift.get(id) ?? null
    const schema = byId.get(id) ?? null
    // The canonical PascalCase name: the schema title where there is one (it is what the web tree and
    // the Storybook story titles are named after), otherwise whichever tree holds the widget.
    const pascal = schema?.pascal ?? webSide?.pascal ?? swiftSide?.pascal

    // The manifest is keyed by the Swift widget name, which for a versioned widget differs from the
    // canonical one, so both spellings are tried.
    const record = manifest.get(pascal) ?? (swiftSide === null ? undefined : manifest.get(swiftSide.pascal)) ?? null

    const groups = [webSide?.group, swiftSide?.group, record?.category].filter((group) => group !== null && group !== undefined)
    const distinct = [...new Set(groups)]
    if (distinct.length === 0) {
      throw new Error(`widget \`${id}\`: no group could be resolved from the web tree, the Swift tree or the widget manifest`)
    }
    if (distinct.length > 1) {
      throw new Error(`widget \`${id}\`: sources disagree on its group (${distinct.join(', ')})`)
    }
    const [group] = distinct
    if (!CATEGORIES.includes(group)) {
      throw new Error(`widget \`${id}\`: group \`${group}\` is not one of ${CATEGORIES.join(', ')}`)
    }

    return {id, group, pascal, web: webSide, swift: swiftSide, schema, manifest: record}
  })
}

const isSchemaObject = (node) => typeof node === 'object' && node !== null && !Array.isArray(node)

/**
 * Flatten a JSON-schema node to the concrete member schemas it stands for.
 *
 * `anyOf`/`oneOf` are the shape `generate-widget-schemas.mjs` emits for a union, and the shape it
 * emits for EVERY optional prop (`makeOptionalsNullable` rewrites `T` to `anyOf: [T, null]`). So a
 * nullable object arrives as a union, and walking the union is what keeps the nested shape of
 * `restingHeartRate?: {value, unit}` in the tree instead of collapsing it to a bare type name.
 * Declaration order is preserved: the schema file's bytes are fixed, so order is deterministic.
 */
function schemaMembers(node) {
  if (!isSchemaObject(node)) {
    return []
  }
  for (const keyword of ['anyOf', 'oneOf']) {
    if (Array.isArray(node[keyword])) {
      return node[keyword].flatMap(schemaMembers)
    }
  }
  return [node]
}

/** The concrete JSON-schema type names one member contributes. `unknown` is honest, not a guess. */
function memberTypes(member) {
  if (typeof member.type === 'string') {
    return [member.type]
  }
  if (Array.isArray(member.type)) {
    return member.type
  }
  if (Array.isArray(member.enum)) {
    return member.enum.map((value) => (value === null ? 'null' : typeof value))
  }
  if (isSchemaObject(member.properties)) {
    return ['object']
  }
  if (member.items !== undefined) {
    return ['array']
  }
  return ['unknown']
}

/**
 * Merge the `properties` of every object member into one map of child nodes.
 *
 * A key is REQUIRED only where every member that declares it marks it required — a union of two
 * object shapes where one omits the key from `required[]` means a consumer cannot rely on it, so
 * `optional: true` is the truthful reading. Keys are sorted, which is what makes the tree
 * deterministic at every level rather than only at the top.
 */
function mergeProperties(objectMembers, depth) {
  const declared = new Map()
  for (const member of objectMembers) {
    const required = new Set(Array.isArray(member.required) ? member.required : [])
    for (const [name, child] of Object.entries(member.properties)) {
      const seen = declared.get(name)
      if (seen === undefined) {
        declared.set(name, {child, required: required.has(name)})
      } else {
        seen.required = seen.required && required.has(name)
      }
    }
  }
  const properties = {}
  for (const name of [...declared.keys()].sort()) {
    const {child, required} = declared.get(name)
    properties[name] = buildPropNode(child, !required, depth)
  }
  return properties
}

/**
 * Build one node of the recursive prop tree.
 *
 * Key order here IS the emitted key order — `type`, `optional`, `truncated`, `properties`, `items`.
 * Do not reorder casually; it changes every contract file's bytes.
 *
 * The MAX_PROP_DEPTH cut is deliberately narrow: it fires only when there really are children being
 * dropped, so a leaf that happens to sit at the cap is not mislabelled as truncated. `truncated` is
 * written, never inferred from a missing `properties` — an object with no static properties (a
 * `Record<string, T>`, which arrives as `additionalProperties`) legitimately has none, and the two
 * cases must not read alike.
 *
 * @param {unknown} node a resolved JSON-schema node from the generated widget schema
 * @param {boolean} optional the prop is absent from its parent object's `required[]`
 * @param {number} depth 1 for a top-level prop
 */
export function buildPropNode(node, optional, depth) {
  const members = schemaMembers(node)
  const names = [...new Set(members.flatMap(memberTypes))]
  const types = names.length === 0 ? ['unknown'] : names

  const built = {type: types.length === 1 ? types[0] : types, optional}

  const objectMembers = members.filter((member) => isSchemaObject(member.properties))
  const arrayMember = members.find((member) => isSchemaObject(member.items))

  if (objectMembers.length === 0 && arrayMember === undefined) {
    return built
  }
  if (depth >= MAX_PROP_DEPTH) {
    built.truncated = true
    return built
  }
  if (objectMembers.length > 0) {
    built.properties = mergeProperties(objectMembers, depth + 1)
  }
  if (arrayMember !== undefined) {
    // An element is not a member of its parent's `required[]`, so `optional` is meaningless for it
    // and is written `false` rather than left to a coin flip.
    built.items = buildPropNode(arrayMember.items, false, depth + 1)
  }
  return built
}

/**
 * The full nested prop shape, read from the widget's generated JSON schema.
 *
 * v2 walks the whole tree. v1 recorded top-level props only, which on this repo's widgets meant a
 * single `{profile: object}`-shaped entry per widget — a props axis that carried almost no signal.
 */
export function buildPropTree(schema) {
  const required = new Set(Array.isArray(schema.required) ? schema.required : [])
  const properties = isSchemaObject(schema.properties) ? schema.properties : {}
  const props = {}
  for (const name of Object.keys(properties).sort()) {
    props[name] = buildPropNode(properties[name], !required.has(name), 1)
  }
  return props
}

/**
 * Fixture filenames. `<base>.json` with no infix is the default state.
 *
 * The base is the manifest's fixture basename, not the canonical id: `GitHubHeatmap`'s fixtures are
 * `other/github-heatmap.*.json` while its schema — and so its id — is `git-hub-heatmap`. Deriving the
 * base from the id would silently report that widget as having no states at all.
 */
function fixtureStates(repoRoot, fixtureDir, base) {
  const states = []
  for (const file of sortedFiles(join(repoRoot, FIXTURE_ROOT, fixtureDir))) {
    if (!file.endsWith('.json')) {
      continue
    }
    const stem = file.slice(0, -'.json'.length)
    if (stem === base) {
      states.push('default')
      continue
    }
    if (stem.startsWith(`${base}.`)) {
      states.push(stem.slice(base.length + 1))
    }
  }
  return states
}

/**
 * The Storybook visual-baseline prefix for a widget.
 *
 * Storybook derives a story id by lowercasing its title path and collapsing punctuation, so
 * `Production/Health/HeartRate` becomes `production-health-heartrate` — the PascalCase name
 * LOWERCASED, with no separators. It is NOT the kebab id: v2 built the prefix from the slug, so
 * `production-health-heart-rate--` matched nothing and every multi-word widget silently reported
 * zero snapshot states. `schema.test.mjs` asserts that every `production-*` baseline on disk is
 * claimed by exactly one entry, which is what keeps this derivation honest.
 */
function snapshotPrefix(group, pascal) {
  return `production-${group}-${pascal.toLowerCase()}--`
}

/** Storybook visual-baseline filenames. Absent for most widgets; absence is not an error. */
function snapshotStates(repoRoot, group, pascal) {
  const prefix = snapshotPrefix(group, pascal)
  const states = []
  for (const file of sortedFiles(join(repoRoot, SNAPSHOT_DIR))) {
    if (file.startsWith(prefix) && file.endsWith('.png')) {
      states.push(file.slice(prefix.length, -'.png'.length))
    }
  }
  return states
}

/**
 * `voiceOverLabel` is `true` with a `<file>:<line>` ref, or `null`. `null` is a written GAP, and it
 * covers two different facts that both mean "no label was found": the widget has a Swift view with no
 * `.accessibilityLabel(` in it, or the widget has no Swift view to read. The second case also writes
 * no `sources.a11y`, so the two are told apart by provenance rather than by a second null.
 */
function readA11y(repoRoot, viewRef) {
  if (viewRef === null) {
    return {a11y: {voiceOverLabel: null, ref: null}, source: null}
  }
  const lines = readFileSync(join(repoRoot, viewRef), 'utf8').split('\n')
  const index = lines.findIndex((line) => line.includes('.accessibilityLabel('))
  if (index === -1) {
    return {a11y: {voiceOverLabel: null, ref: null}, source: viewRef}
  }
  return {a11y: {voiceOverLabel: true, ref: `${viewRef}:${index + 1}`}, source: viewRef}
}

/**
 * Build one entry. Key order here IS the emitted key order — do not reorder casually, it changes
 * every contract file's bytes.
 *
 * A PARTIAL entry — one platform present, the other written `null` — is the point of v3. Nothing is
 * faked to fill a gap: no props tree is invented for a widget with no schema, no Swift props path is
 * written for a widget that has none, and `states` is left empty rather than given a default that was
 * never on disk.
 *
 * @param {ReturnType<typeof unionWidgets>[number]} widget
 */
export function buildEntry(repoRoot, widget) {
  const {id, group, pascal, web, swift, schema, manifest} = widget

  const fixtureRel = manifest?.fixturePath ?? `${group}/${id}.json`
  const fixtureDir = dirname(fixtureRel)
  const fixtureBase = basename(fixtureRel, '.json')

  const {a11y, source: a11ySource} = readA11y(repoRoot, swift?.viewRef ?? null)
  const states = [...new Set([...fixtureStates(repoRoot, fixtureDir, fixtureBase), ...snapshotStates(repoRoot, group, pascal)])].sort()
  const platforms = KNOWN_PLATFORMS.filter((platform) => (platform === 'web' ? web !== null : swift !== null))

  const sources = {}
  if (schema !== null) {
    sources.props = schema.ref
  }
  sources.states = [`${FIXTURE_ROOT}/${fixtureDir}/${fixtureBase}[.<state>].json`, `${SNAPSHOT_DIR}/${snapshotPrefix(group, pascal)}<state>.png`]
  if (a11ySource !== null) {
    sources.a11y = a11ySource
  }

  return {
    specVersion: CATALOG_SPEC_VERSION,
    widget: id,
    group,
    platforms,
    props: schema === null ? null : buildPropTree(JSON.parse(readFileSync(join(repoRoot, schema.ref), 'utf8'))),
    propsRef: web?.ref ?? null,
    swiftPropsRef: swift?.propsRef ?? null,
    states,
    a11y,
    conformance: {behavioralTest: BEHAVIORAL_TESTS[id] ?? null},
    generatedBy: GENERATED_BY,
    sources
  }
}

/**
 * Format emitted JSON through Prettier (root .prettierrc.mjs) so the bytes are stable.
 * Mirrors `writeJson` in packages/schemas/scripts/generate-widget-schemas.mjs — the repo's
 * established rule for generated JSON.
 *
 * The config is resolved from the file's place in the REAL catalog directory, never from the
 * directory being written to. `check.mjs` regenerates into a temp directory and compares bytes;
 * resolving from that path finds no `.prettierrc.mjs` at all, so the temp run formatted at Prettier's
 * default printWidth of 80 while the committed bytes were written at the repo's 100. Every emitted
 * line between those two widths then differed, and the idempotence check reported drift that was
 * purely an artifact of where the check happened to write. The bytes are the subject of the
 * comparison; the output directory is an implementation detail of the checker and must not reach the
 * formatter.
 *
 * @param {string} file the contract's BASENAME, e.g. `heart-rate.contract.json`
 */
export async function formatJson(file, data) {
  const referencePath = join(CATALOG_DIR, file)
  const cfg = await prettier.resolveConfig(referencePath)
  return prettier.format(JSON.stringify(data, null, 2), {...cfg, parser: 'json', filepath: referencePath})
}

/**
 * Generate a contract for every widget in the union into `outDir`.
 *
 * @param {{repoRoot?: string, outDir?: string}} [options]
 * @returns {Promise<Array<{widget: string, file: string, bytes: string}>>}
 */
export async function generateAll({repoRoot = REPO_ROOT, outDir = CATALOG_DIR} = {}) {
  const widgets = unionWidgets(repoRoot)
  const ids = new Set(widgets.map(({id}) => id))
  // A curated map keyed by a widget that is not in the union is a stale reference nobody would notice
  // otherwise: the test it names would simply never be attached to anything.
  for (const id of Object.keys(BEHAVIORAL_TESTS)) {
    if (!ids.has(id)) {
      throw new Error(`BEHAVIORAL_TESTS names \`${id}\`, which is not a widget in the union`)
    }
  }

  mkdirSync(outDir, {recursive: true})
  const written = []
  for (const widget of widgets) {
    const entry = buildEntry(repoRoot, widget)
    const file = `${entry.widget}.contract.json`
    const bytes = await formatJson(file, entry)
    writeFileSync(join(outDir, file), bytes)
    written.push({widget: entry.widget, file, bytes})
  }
  return written
}

/** The canonical widget id set the catalog must cover exactly. */
export const catalogWidgets = (repoRoot = REPO_ROOT) => unionWidgets(repoRoot).map(({id}) => id)

if (import.meta.url === `file://${process.argv[1]}`) {
  const written = await generateAll()
  process.stdout.write(`[component-catalog] generated ${written.length} contracts into contracts/component-catalog/catalog/\n`)
  for (const {file} of written) {
    process.stdout.write(`  - ${file}\n`)
  }
}
