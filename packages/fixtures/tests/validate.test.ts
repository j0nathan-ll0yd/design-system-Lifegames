// Known-answer suite for scripts/validate.ts. The gate fails closed: a mapped raw
// directory with no JSON fails, and a run that validates 0 fixtures fails. A valid
// fixture still passes and an invalid one still fails. Each case runs the real
// script with `--root` pointed at a temp tree.
import {spawnSync} from 'node:child_process'
import {copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {afterAll, describe, expect, it} from 'vitest'

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TSX = join(PKG_ROOT, 'node_modules/.bin/tsx')
const VALIDATE = join(PKG_ROOT, 'scripts/validate.ts')
const REAL_RAW = join(PKG_ROOT, 'src/generated/books/baseline.json')
const RAW_SCHEMA = 'books-export.schema.json'

const work = mkdtempSync(join(tmpdir(), 'fixtures-validate-'))
afterAll(() => rmSync(work, {recursive: true, force: true}))

let n = 0
// Writes the map and the fixture files into a fresh tree, then runs validate.ts on it.
function run(map: object, files: Record<string, string | null> = {}) {
  const root = join(work, `case-${n++}`)
  mkdirSync(root)
  writeFileSync(join(root, 'fixture-map.json'), JSON.stringify(map))
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(root, rel)
    mkdirSync(dirname(abs), {recursive: true})
    if (body === null) {
      copyFileSync(REAL_RAW, abs)
    } else if (body !== '') {
      writeFileSync(abs, body)
    }
  }
  return spawnSync(TSX, [VALIDATE, `--root=${root}`], {encoding: 'utf8'})
}

describe('fixtures validate.ts', () => {
  it('passes a valid raw fixture', () => {
    const r = run({raw: {books: RAW_SCHEMA}, postAdapter: {}}, {'src/generated/books/baseline.json': null})
    expect(r.status, r.stderr).toBe(0)
    expect(r.stdout).toMatch(/OK: 1 fixture\(s\) validated successfully/)
  })

  it('fails an invalid raw fixture', () => {
    const r = run({raw: {books: RAW_SCHEMA}, postAdapter: {}}, {'src/generated/books/bad.json': '{"nope": 1}'})
    expect(r.status).toBe(1)
    expect(r.stderr).toMatch(/bad\.json \(books-export\.schema\.json\)/)
  })

  it('fails a mapped raw directory that is missing', () => {
    const r = run({raw: {books: RAW_SCHEMA}, postAdapter: {}})
    expect(r.status).toBe(1)
    expect(r.stderr).toMatch(/generated directory missing/)
  })

  it('fails a mapped raw directory that holds no JSON', () => {
    // A second domain validates one real fixture, so the 0-fixture guard cannot fire:
    // the exit code alone proves the empty-directory guard.
    const r = run({raw: {books: RAW_SCHEMA, more: RAW_SCHEMA}, postAdapter: {}}, {
      'src/generated/books/README.md': 'not json',
      'src/generated/more/baseline.json': null
    })
    expect(r.status).toBe(1)
    expect(r.stderr).toMatch(/books\/\*\.json \(books-export\.schema\.json\)/)
    expect(r.stderr).toMatch(/no raw fixtures found/)
  })

  it.each(['raw', 'postAdapter'])('fails a map with no %s object', (key) => {
    const map: Record<string, object> = {raw: {}, postAdapter: {}}
    delete map[key]
    const r = run(map)
    expect(r.status).toBe(1)
    expect(r.stderr).toMatch(new RegExp(`has no "${key}" object`))
    expect(r.stderr).not.toMatch(/TypeError/)
  })

  it('fails a run that validates 0 fixtures', () => {
    const r = run({raw: {_comment: 'none'}, postAdapter: {_comment: 'none'}})
    expect(r.status).toBe(1)
    expect(r.stderr).toMatch(/FAIL: 0 fixtures validated/)
    expect(r.stdout).not.toMatch(/OK:/)
  })
})
