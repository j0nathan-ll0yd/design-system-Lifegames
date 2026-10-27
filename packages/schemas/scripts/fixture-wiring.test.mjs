// Known-answer suite for fixture-wiring.mjs, the generator's fixture → schema
// wiring. It fails closed: a fixture JSON that no schema maps is reported by
// path, so generate-widget-schemas.mjs exits 1 instead of dropping it from
// fixture-map.json without a word.
import assert from 'node:assert/strict'
import {mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'
import {after, test} from 'node:test'
import {fileURLToPath} from 'node:url'
import {formatUnmapped, MANIFEST_FILE, wireFixtures} from './fixture-wiring.mjs'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const REPO_ROOT = join(HERE, '../../..')
const WIDGETS_REL = 'Sources/LifegamesWidgets/Resources/widgets'
const PREFIX = 'widgets'
const TITLES = {feed: 'FeedProps', pool: 'Pool'}
const SCHEMAS = new Set(['FeedProps', 'Pool'])

const work = mkdtempSync(join(tmpdir(), 'fixture-wiring-'))
after(() => rmSync(work, {recursive: true, force: true}))

let n = 0
function tree(files, {titles = TITLES, schemas = SCHEMAS} = {}) {
  const root = join(work, `case-${n++}`)
  mkdirSync(root)
  for (const rel of files) {
    mkdirSync(dirname(join(root, rel)), {recursive: true})
    writeFileSync(join(root, rel), '{}')
  }
  return wireFixtures({widgetsRoot: root, relPrefix: PREFIX, fixtureBaseToTitle: titles, schemaTitles: schemas})
}

test('mapped fixtures wire by full base, then by base without the state suffix', () => {
  const r = tree([MANIFEST_FILE, 'a/feed.json', 'a/feed.empty.json', 'b/pool.json'])
  assert.deepEqual(r.unmapped, [])
  assert.deepEqual(r.entries, {
    'widgets/a/feed.empty.json': {schema: 'FeedProps', strategy: 'single'},
    'widgets/a/feed.json': {schema: 'FeedProps', strategy: 'single'},
    'widgets/b/pool.json': {schema: 'Pool', strategy: 'single'}
  })
})

test('a fixture with no schema title is unmapped and named', () => {
  const r = tree(['a/feed.json', 'coffee/coffee-tracking.idle.json'])
  assert.deepEqual(r.unmapped, [{path: 'widgets/coffee/coffee-tracking.idle.json', reason: 'no schema title for "coffee-tracking"'}])
  assert.equal(r.entries['widgets/coffee/coffee-tracking.idle.json'], undefined)
})

test('a title that names no schema is unmapped', () => {
  const r = tree(['a/feed.json'], {schemas: new Set()})
  assert.deepEqual(r.unmapped, [{path: 'widgets/a/feed.json', reason: 'title "FeedProps" names no schema'}])
})

test('a JSON file at the root or below a category is unmapped', () => {
  const r = tree([MANIFEST_FILE, 'stray.json', 'a/nested/feed.json'])
  assert.deepEqual(r.unmapped.map((u) => u.path), ['widgets/a/nested/feed.json', 'widgets/stray.json'])
  assert.ok(r.unmapped.every((u) => u.reason === 'not directly inside a category directory'))
})

test('the manifest, non-JSON files and dot-entries are not fixtures', () => {
  const r = tree([MANIFEST_FILE, 'SCRUBBING.md', 'a/feed.json', '.omc/state/x.json', 'a/.hidden.json'])
  assert.deepEqual(r.unmapped, [])
  assert.deepEqual(Object.keys(r.entries), ['widgets/a/feed.json'])
})

test('the failure text names each unmapped file and says how to wire it', () => {
  const text = formatUnmapped([{path: 'widgets/coffee/coffee-tracking.idle.json', reason: 'no schema title for "coffee-tracking"'}])
  assert.match(text, /FAIL: 1 widget fixture\(s\) map to no schema/)
  assert.match(text, /x widgets\/coffee\/coffee-tracking\.idle\.json: no schema title for "coffee-tracking"/)
  assert.match(text, /widget-manifest\.json/)
  assert.match(text, /authored\/<name>\.schema\.json/)
  assert.match(text, /EXTRA_CATEGORY_WIRING/)
  assert.match(text, /SCHEMA_ENTRIES/)
})

test('the generator gates on the unmapped list before it writes the map', () => {
  const src = readFileSync(join(HERE, 'generate-widget-schemas.mjs'), 'utf8')
  const gate = src.indexOf('if (unmapped.length > 0)')
  assert.ok(gate > 0, 'the generator no longer checks the unmapped list')
  assert.match(src.slice(gate, gate + 200), /formatUnmapped\(unmapped\)[\s\S]*process\.exit\(1\)/)
  assert.ok(gate < src.indexOf('fixtureMap.ds = dsEntries'), 'the gate must run before fixture-map.json is written')
})

test('the shipped map holds every fixture JSON in the tree, and nothing else', () => {
  const root = join(REPO_ROOT, WIDGETS_REL)
  const onDisk = []
  for (const cat of readdirSync(root, {withFileTypes: true})) {
    if (cat.isDirectory() && !cat.name.startsWith('.')) {
      for (const f of readdirSync(join(root, cat.name)).filter((f) => f.endsWith('.json') && !f.startsWith('.'))) {
        onDisk.push(`${WIDGETS_REL}/${cat.name}/${f}`)
      }
    }
  }
  const map = JSON.parse(readFileSync(join(HERE, '../fixture-map.json'), 'utf8'))
  assert.deepEqual(Object.keys(map.ds).sort(), onDisk.sort())
})
