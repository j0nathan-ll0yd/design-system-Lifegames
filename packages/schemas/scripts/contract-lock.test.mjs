// Unit suite for the contract-lock document model — the two branches that decide
// whether .contract-lock.json churns: upstream checkout REACHABLE (sha re-derived)
// vs UNREACHABLE (sha preserved, never nulled).
//
// Plain node:test so it runs without a TypeScript loader, next to the .mjs it covers.
// Reachable from `pnpm test:scripts` (pre-push) and the schemas-freshness CI job.

import assert from 'node:assert/strict'
import {test} from 'node:test'
import {buildLock, provenanceOrigin} from './contract-lock.mjs'

const REPO = 'j0nathan-ll0yd/mantle-LifegamesPortal'
const PRIOR_SHA = 'c99687f45d06f2c4feeaed2e15c5bbabdf99a134'
const FRESH_SHA = '0123456789abcdef0123456789abcdef01234567'
const CHECKSUM = 'sha256:aggregate'
const PRIOR_TIME = '2026-07-31T19:27:08.352Z'
const NOW = '2026-08-12T00:00:00.000Z'

/** A lock as it exists on disk before a regeneration. */
function existingLock(overrides = {}) {
  return {
    generatedFrom: {repo: REPO, sha: PRIOR_SHA, checksum: CHECKSUM},
    generatedAt: PRIOR_TIME,
    generatorVersion: '1.0.0',
    files: {'a.schema.json': 'sha256:a', 'b.schema.json': 'sha256:b'},
    ...overrides
  }
}

function generate({previous, derivedSha, files, checksum = CHECKSUM}) {
  return buildLock({
    previous,
    repo: REPO,
    derivedSha,
    checksum,
    files: files ?? {'a.schema.json': 'sha256:a', 'b.schema.json': 'sha256:b'},
    generatorVersion: '1.0.0',
    now: NOW
  })
}

test('upstream reachable: the freshly derived sha wins over the previous one', () => {
  const lock = generate({previous: existingLock(), derivedSha: FRESH_SHA})

  assert.equal(lock.generatedFrom.sha, FRESH_SHA)
  assert.equal(provenanceOrigin(FRESH_SHA, lock.generatedFrom.sha), 'derived')
  // The pin moved, so this IS a change — the timestamp must move with it.
  assert.equal(lock.generatedAt, NOW)
})

test('upstream reachable with no previous lock: the derived sha is written', () => {
  const lock = generate({previous: null, derivedSha: FRESH_SHA})

  assert.equal(lock.generatedFrom.sha, FRESH_SHA)
  assert.equal(lock.generatedAt, NOW)
})

test('upstream unreachable: the previous provenance sha is preserved, never nulled', () => {
  const lock = generate({previous: existingLock(), derivedSha: null})

  assert.equal(lock.generatedFrom.sha, PRIOR_SHA)
  assert.equal(provenanceOrigin(null, lock.generatedFrom.sha), 'preserved')
})

test('upstream unreachable and nothing else changed: output is byte-identical', () => {
  const previous = existingLock()
  const lock = generate({previous, derivedSha: null})

  assert.deepEqual(lock, previous)
  assert.equal(JSON.stringify(lock, null, 2), JSON.stringify(previous, null, 2))
})

test('upstream unreachable but schemas changed: sha preserved, timestamp refreshed', () => {
  const lock = generate({previous: existingLock(), derivedSha: null, files: {'a.schema.json': 'sha256:a', 'b.schema.json': 'sha256:CHANGED'}})

  assert.equal(lock.generatedFrom.sha, PRIOR_SHA)
  assert.equal(lock.generatedAt, NOW)
})

test('upstream unreachable but the aggregate checksum changed: timestamp refreshed', () => {
  const lock = generate({previous: existingLock(), derivedSha: null, checksum: 'sha256:different'})

  assert.equal(lock.generatedAt, NOW)
})

test('upstream unreachable with no previous lock: sha is null, which is honest', () => {
  const lock = generate({previous: null, derivedSha: null})

  assert.equal(lock.generatedFrom.sha, null)
  assert.equal(provenanceOrigin(null, lock.generatedFrom.sha), 'unknown')
  assert.equal(lock.generatedAt, NOW)
})

test('a previous lock that already lost its sha is not treated as a change', () => {
  const previous = existingLock({generatedFrom: {repo: REPO, sha: null, checksum: CHECKSUM}})
  const lock = generate({previous, derivedSha: null})

  assert.equal(lock.generatedFrom.sha, null)
  assert.equal(lock.generatedAt, PRIOR_TIME)
})

test('file-key ORDER alone is not a change', () => {
  const previous = existingLock({files: {'b.schema.json': 'sha256:b', 'a.schema.json': 'sha256:a'}})
  const lock = generate({previous, derivedSha: null})

  assert.equal(lock.generatedAt, PRIOR_TIME)
})

test('a previous lock missing generatedAt does not leak undefined into the output', () => {
  const {generatedAt: _dropped, ...withoutTimestamp} = existingLock()
  const lock = generate({previous: withoutTimestamp, derivedSha: null})

  assert.equal(lock.generatedAt, NOW)
  assert.equal(lock.generatedFrom.sha, PRIOR_SHA)
})
