// Maps the widget fixture tree onto schema titles for fixture-map.json's `ds`
// bucket. Fails closed: every fixture JSON under the root must resolve to a
// schema, so a fixture cannot drop out of validation without a word.
import {lstatSync, readdirSync} from 'node:fs'
import {join} from 'node:path'

// The manifest sits at the root of the fixture tree but is not a fixture.
export const MANIFEST_FILE = 'widget-manifest.json'

// Every *.json and every symlink under `dir`, as POSIX paths relative to
// `root`, sorted. A dot-directory is skipped: it is tool state (a session hook
// writes `.omc/` into the directory it runs in, and .gitignore drops it), never
// a fixture directory. A dot-prefixed JSON file is listed, so it is reported,
// not hidden. A symlink is listed and never followed: lstat does not resolve
// it, so a broken link cannot throw and a link back up the tree cannot loop.
function listEntries(root, dir = root, prefix = '') {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const rel = prefix ? `${prefix}/${name}` : name
    const stat = lstatSync(full)
    if (stat.isSymbolicLink()) {
      out.push({rel, symlink: true})
    } else if (stat.isDirectory()) {
      if (!name.startsWith('.')) {
        out.push(...listEntries(root, full, rel))
      }
    } else if (stat.isFile() && name.endsWith('.json')) {
      out.push({rel, symlink: false})
    }
  }
  return out.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0))
}

/**
 * Wires each fixture under `widgetsRoot` to a schema title.
 *
 * A fixture is `<category>/<base>[.<state>].json`. Its title comes from
 * `fixtureBaseToTitle[<base>.<state>]`, then `fixtureBaseToTitle[<base>]`, and
 * must name a title in `schemaTitles`. A file at the root (other than the
 * manifest) or nested below a category cannot be loaded as a fixture, so it is
 * unmapped too, as is any symlink.
 *
 * @param {{widgetsRoot: string, relPrefix: string, fixtureBaseToTitle: Record<string, string>, schemaTitles: Set<string>}} opts
 * @returns {{entries: Record<string, {schema: string, strategy: 'single'}>, unmapped: Array<{path: string, reason: string}>}}
 */
export function wireFixtures({widgetsRoot, relPrefix, fixtureBaseToTitle, schemaTitles}) {
  const entries = {}
  const unmapped = []
  for (const {rel, symlink} of listEntries(widgetsRoot)) {
    const path = `${relPrefix}/${rel}`
    if (symlink) {
      unmapped.push({path, reason: 'symbolic link; a fixture must be a regular file'})
      continue
    }
    if (rel === MANIFEST_FILE) {
      continue
    }
    const parts = rel.split('/')
    if (parts.length !== 2) {
      unmapped.push({path, reason: 'not directly inside a category directory'})
      continue
    }
    if (parts[1].startsWith('.')) {
      unmapped.push({path, reason: 'dot-prefixed file name'})
      continue
    }
    const fullBase = parts[1].replace(/\.json$/, '')
    const baseOnly = fullBase.replace(/\.[^.]+$/, '')
    // Own keys only: a fixture named `constructor.json` must not resolve to
    // Object.prototype.constructor.
    const title = (Object.hasOwn(fixtureBaseToTitle, fullBase) && fixtureBaseToTitle[fullBase]) ||
      (Object.hasOwn(fixtureBaseToTitle, baseOnly) && fixtureBaseToTitle[baseOnly])
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

/**
 * The generator's gate. Writes the failure text and exits 1 when any fixture is
 * unmapped; returns otherwise. `write` and `exit` are injected so the test
 * drives the branch the generator runs.
 */
export function failIfUnmapped(unmapped, {write, exit}) {
  if (unmapped.length > 0) {
    write(formatUnmapped(unmapped))
    exit(1)
  }
}
