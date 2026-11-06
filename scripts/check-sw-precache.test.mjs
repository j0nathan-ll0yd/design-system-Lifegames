import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {test} from 'node:test'
import {findConflicts, readPrecache} from './check-sw-precache.mjs'

const CLI = resolve(import.meta.dirname, 'check-sw-precache.mjs')

function run(source) {
  const dir = mkdtempSync(join(tmpdir(), 'check-sw-precache-'))
  try {
    const file = join(dir, 'sw.js')
    writeFileSync(file, source)
    return spawnSync(process.execPath, [CLI, file], {encoding: 'utf8'})
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
}

test('reads both quote styles and normalizes a leading slash', () => {
  const entries = readPrecache('e([{url:`assets/a.png`,revision:`1`},{url:"/assets/b.png",revision:"2"},{url:`c.js`,revision:null}])')
  assert.deepEqual(entries, [{url: '/assets/a.png', revision: '1'}, {url: '/assets/b.png', revision: '2'}, {url: '/c.js', revision: 'null'}])
})

test('PROOF OF FAIL: one URL under two revisions, the shape @vite-pwa/astro 2 emitted, exits 1', () => {
  const entries = readPrecache('e([{url:`assets/icon-192.png`,revision:`a0e2`},{url:`/assets/icon-192.png`,revision:`b836`}])')
  assert.deepEqual(findConflicts(entries), [{url: '/assets/icon-192.png', revisions: ['a0e2', 'b836']}])
  const result = run('e([{url:`assets/icon-192.png`,revision:`a0e2`},{url:`/assets/icon-192.png`,revision:`b836`}])')
  assert.equal(result.status, 1)
  assert.match(result.stderr, /\/assets\/icon-192\.png: a0e2, b836/)
})

test('PROOF OF FAIL: a worker with no readable entry exits 1, never a pass', () => {
  assert.equal(run('self.skipWaiting()').status, 1)
})

test('the same URL twice under one revision is not a conflict, and exits 0', () => {
  const result = run('e([{url:`a.js`,revision:`1`},{url:`/a.js`,revision:`1`},{url:`b.js`,revision:`2`}])')
  assert.equal(result.status, 0)
  assert.match(result.stdout, /3 precache entries/)
})
