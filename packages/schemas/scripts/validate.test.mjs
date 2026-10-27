// Known-answer suite for validate.ts. The validator fails closed: a mapped
// fixture that does not exist fails and names its path and bucket, and a run
// that validates 0 fixtures fails. A valid fixture still passes and an invalid
// one still fails. Each case runs the real script against a temp map.
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'
import {after, test} from 'node:test'
import {fileURLToPath} from 'node:url'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const TSX = join(HERE, '../node_modules/.bin/tsx')
const VALIDATE = join(HERE, 'validate.ts')
const REAL_FIXTURE = join(HERE, '../../../Sources/LifegamesWidgets/Resources/widgets/github/activity-feed.json')
const SCHEMA = 'ActivityFeedProps'

const work = mkdtempSync(join(tmpdir(), 'schemas-validate-'))
after(() => rmSync(work, {recursive: true, force: true}))

let n = 0
// Writes the map and the fixture files into a fresh case dir, then runs
// validate.ts with that dir as LIFEGAMES_VALIDATE_CWD.
function run(map, files = {}, extraArgs = []) {
  const dir = join(work, `case-${n++}`)
  mkdirSync(dir)
  const mapPath = join(dir, 'map.json')
  writeFileSync(mapPath, JSON.stringify(map))
  for (const [rel, write] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, rel)), {recursive: true})
    write(join(dir, rel))
  }
  return spawnSync(TSX, [VALIDATE, `--map=${mapPath}`, ...extraArgs], {env: {...process.env, LIFEGAMES_VALIDATE_CWD: dir}, encoding: 'utf8'})
}

test('a valid fixture passes', () => {
  const r = run({ds: {'ok.json': {schema: SCHEMA}}}, {'ok.json': (p) => copyFileSync(REAL_FIXTURE, p)})
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /OK: 1 fixture\(s\) validated successfully/)
})

test('an invalid fixture fails as before', () => {
  const r = run({ds: {'bad.json': {schema: SCHEMA}}}, {'bad.json': (p) => writeFileSync(p, '{}')})
  assert.equal(r.status, 1)
  assert.match(r.stderr, /x bad\.json \[bucket: ds\] \(ActivityFeedProps\)/)
  assert.match(r.stderr, /required/)
})

test('a missing mapped fixture fails and names the path and the bucket', () => {
  const r = run({consumer: {'data/books.json': {schema: SCHEMA}}, ds: {'ok.json': {schema: SCHEMA}}}, {'ok.json': (p) => copyFileSync(REAL_FIXTURE, p)})
  assert.equal(r.status, 1)
  assert.match(r.stderr, /x data\/books\.json \[bucket: consumer\]/)
  assert.match(r.stderr, /Mapped fixture not found: .*\/data\/books\.json/)
  assert.doesNotMatch(r.stdout, /OK:/)
})

test('a run that validates 0 fixtures fails', () => {
  const r = run({_comment: 'no buckets'}, {})
  assert.equal(r.status, 1)
  assert.match(r.stderr, /FAIL: 0 fixtures validated/)
  assert.doesNotMatch(r.stdout, /OK:/)
})

test('a bucket that maps no fixtures fails', () => {
  const r = run({ds: {_comment: 'emptied'}}, {})
  assert.equal(r.status, 1)
  assert.match(r.stderr, /Bucket "ds" maps no fixtures/)
})

test('an unknown --bucket fails instead of checking nothing', () => {
  const r = run({ds: {'ok.json': {schema: SCHEMA}}}, {'ok.json': (p) => copyFileSync(REAL_FIXTURE, p)}, ['--bucket=consumer'])
  assert.equal(r.status, 1)
  assert.match(r.stderr, /\[bucket: consumer\]/)
  assert.match(r.stderr, /Bucket "consumer" is not an object/)
})

test('a malformed entry fails instead of being skipped', () => {
  const r = run({ds: {'ok.json': {strategy: 'single'}}}, {'ok.json': (p) => copyFileSync(REAL_FIXTURE, p)})
  assert.equal(r.status, 1)
  assert.match(r.stderr, /x ok\.json \[bucket: ds\]/)
  assert.match(r.stderr, /Malformed map entry/)
})

test('an unknown schema fails', () => {
  const r = run({ds: {'ok.json': {schema: 'NoSuchSchema'}}}, {'ok.json': (p) => copyFileSync(REAL_FIXTURE, p)})
  assert.equal(r.status, 1)
  assert.match(r.stderr, /x ok\.json \[bucket: ds\] \(NoSuchSchema\)/)
  assert.match(r.stderr, /Schema not found: NoSuchSchema/)
})

test('an unparseable fixture fails', () => {
  const r = run({ds: {'broken.json': {schema: SCHEMA}}}, {'broken.json': (p) => writeFileSync(p, '{')})
  assert.equal(r.status, 1)
  assert.match(r.stderr, /x broken\.json \[bucket: ds\]/)
  assert.match(r.stderr, /Parse error/)
})

test('the shipped map has no consumer bucket', () => {
  const map = JSON.parse(readFileSync(join(HERE, '../fixture-map.json'), 'utf8'))
  assert.deepEqual(Object.keys(map).filter((k) => !k.startsWith('_')), ['ds'])
})
