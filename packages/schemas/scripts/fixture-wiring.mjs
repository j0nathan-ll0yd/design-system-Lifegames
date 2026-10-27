// Maps the widget fixture tree onto schema titles for fixture-map.json's `ds`
// bucket. Fails closed: every fixture JSON under the root must resolve to a
// schema, so a fixture cannot drop out of validation without a word.
import {readdirSync} from 'node:fs'
import {join} from 'node:path'

// The manifest sits at the root of the fixture tree but is not a fixture.
export const MANIFEST_FILE = 'widget-manifest.json'

// Every *.json under `dir`, as POSIX paths relative to `root`, sorted. A
// dot-entry is skipped: it is tool state (a session hook writes `.omc/` into
// the directory it runs in, and .gitignore drops it), never a fixture.
function listJson(root, dir = root, prefix = '') {
  const out = []
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    if (entry.name.startsWith('.')) {
      continue
    }
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      out.push(...listJson(root, join(dir, entry.name), rel))
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      out.push(rel)
    }
  }
  return out.sort()
}

/**
 * Wires each fixture under `widgetsRoot` to a schema title.
 *
 * A fixture is `<category>/<base>[.<state>].json`. Its title comes from
 * `fixtureBaseToTitle[<base>.<state>]`, then `fixtureBaseToTitle[<base>]`, and
 * must name a title in `schemaTitles`. A file at the root (other than the
 * manifest) or nested below a category cannot be loaded as a fixture, so it is
 * unmapped too.
 *
 * @param {{widgetsRoot: string, relPrefix: string, fixtureBaseToTitle: Record<string, string>, schemaTitles: Set<string>}} opts
 * @returns {{entries: Record<string, {schema: string, strategy: 'single'}>, unmapped: Array<{path: string, reason: string}>}}
 */
export function wireFixtures({widgetsRoot, relPrefix, fixtureBaseToTitle, schemaTitles}) {
  const entries = {}
  const unmapped = []
  for (const rel of listJson(widgetsRoot)) {
    if (rel === MANIFEST_FILE) {
      continue
    }
    const path = `${relPrefix}/${rel}`
    const parts = rel.split('/')
    if (parts.length !== 2) {
      unmapped.push({path, reason: 'not directly inside a category directory'})
      continue
    }
    const fullBase = parts[1].replace(/\.json$/, '')
    const baseOnly = fullBase.replace(/\.[^.]+$/, '')
    const title = fixtureBaseToTitle[fullBase] || fixtureBaseToTitle[baseOnly]
    if (!title) {
      unmapped.push({path, reason: `no schema title for "${baseOnly}"`})
    } else if (!schemaTitles.has(title)) {
      unmapped.push({path, reason: `title "${title}" names no schema`})
    } else {
      entries[path] = {schema: title, strategy: 'single'}
    }
  }
  return {entries, unmapped}
}

// The generator's failure text: one line per unmapped file, then how to wire it.
export function formatUnmapped(unmapped) {
  const lines = [`[generate-widget-schemas] FAIL: ${unmapped.length} widget fixture(s) map to no schema, so validate.ts would never check them:`]
  for (const u of unmapped) {
    lines.push(`  x ${u.path}: ${u.reason}`)
  }
  lines.push('  Wire each one. A widget fixture: add the widget to widget-manifest.json (its Props type generates the schema).',
    '  A data-only fixture pool: author packages/schemas/authored/<name>.schema.json, map the fixture base name to its',
    '  title in EXTRA_CATEGORY_WIRING (scripts/generate-widget-schemas.mjs), and add it to SCHEMA_ENTRIES (scripts/codegen.ts).')
  return lines.join('\n') + '\n'
}
