// Known-answer suite for D7 (audits/checks/d7-cover-inventory.mjs).
//
// D7 compares the committed COVER_KEYS snapshot with what the distribution serves.
// Every case here injects the probe, so the suite never touches the network: a
// stub distribution answers each key, and the case asserts the verdict and the
// named key. The decisive properties: a listed key that 403s and an omitted key
// that 200s are each a MISMATCH naming ASIN and key, and a key that cannot be
// judged (no egress, a 5xx, a focus-gate suppression) is INDETERMINATE, never PASS.

import assert from 'node:assert/strict'
import test from 'node:test'

import {auditCoverKeys, formatReport, probeKey, USER_AGENT} from '../checks/d7-cover-inventory.mjs'

const ORIGIN = 'https://cdn.example/images/books/'
const SUFFIXES = ['.webp', '-thumb.webp', '-card.webp', '.avif', '-thumb.avif', '-card.avif']
const WEBP = ['.webp', '-thumb.webp', '-card.webp']

/** A stub distribution: `served` maps ASIN -> suffixes that answer 200; all else 403. */
function distribution(served, overrides = {}) {
  return async (url) => {
    const key = url.slice(ORIGIN.length)
    if (key in overrides) {
      return overrides[key]
    }
    const asin = Object.keys(served).find((a) => key.startsWith(a))
    return {status: asin && served[asin].includes(key.slice(asin.length)) ? 200 : 403, suppressed: false}
  }
}

const audit = (inventory, probe) => auditCoverKeys({inventory, suffixes: SUFFIXES, origin: ORIGIN, probe})

test('PASS when every key answers as the snapshot says, partial ASINs included', async () => {
  const inventory = {AAAAAAAAAA: SUFFIXES, BBBBBBBBBB: WEBP}
  const r = await audit(inventory, distribution(inventory))
  assert.equal(r.verdict, 'PASS')
  assert.equal(r.rows.length, 12)
  assert.deepEqual(r.mismatches, [])
})

test('a fake key (listed, answers 403) is a MISMATCH naming ASIN and key', async () => {
  const r = await audit({BBBBBBBBBB: [...WEBP, '.avif']}, distribution({BBBBBBBBBB: WEBP}))
  assert.equal(r.verdict, 'MISMATCH')
  assert.deepEqual(r.mismatches.map((m) => [m.asin, m.suffix, m.expected, m.got]), [['BBBBBBBBBB', '.avif', 200, '403']])
  assert.match(formatReport(r), /MISMATCH {7}BBBBBBBBBB \.avif: expected 200, got 403 \(BBBBBBBBBB\.avif\)/)
})

test('a dropped key (omitted, answers 200) is a MISMATCH naming ASIN and key', async () => {
  const r = await audit({AAAAAAAAAA: SUFFIXES.filter((s) => s !== '-card.webp')}, distribution({AAAAAAAAAA: SUFFIXES}))
  assert.equal(r.verdict, 'MISMATCH')
  assert.deepEqual(r.mismatches.map((m) => [m.asin, m.suffix, m.expected, m.got]), [['AAAAAAAAAA', '-card.webp', 403, '200']])
})

test('an unreachable host is INDETERMINATE, never PASS', async () => {
  const r = await audit({AAAAAAAAAA: SUFFIXES}, async () => ({error: 'TypeError: fetch failed'}))
  assert.equal(r.verdict, 'INDETERMINATE')
  assert.equal(r.indeterminate.length, 6)
})

test('a probe that throws is INDETERMINATE, and the other keys still run', async () => {
  const served = distribution({AAAAAAAAAA: SUFFIXES})
  const r = await audit({AAAAAAAAAA: SUFFIXES}, async (url) => {
    if (url.endsWith('.avif')) {
      throw new Error('boom')
    }
    return served(url)
  })
  assert.equal(r.verdict, 'INDETERMINATE')
  assert.equal(r.indeterminate.length, 3)
  assert.equal(r.rows.filter((row) => row.kind === 'ok').length, 3)
})

test('a 5xx, a 404 and a focus-gate suppression are INDETERMINATE, not MISMATCH', async () => {
  const r = await audit({AAAAAAAAAA: SUFFIXES},
    distribution({AAAAAAAAAA: SUFFIXES}, {
      'AAAAAAAAAA.webp': {status: 503, suppressed: false},
      'AAAAAAAAAA.avif': {status: 404, suppressed: false},
      'AAAAAAAAAA-card.webp': {status: 403, suppressed: true}
    }))
  assert.equal(r.verdict, 'INDETERMINATE')
  assert.deepEqual(r.indeterminate.map((row) => row.suffix).sort(), ['-card.webp', '.avif', '.webp'])
  assert.deepEqual(r.mismatches, [])
})

test('a mismatch beside an unjudged key is INDETERMINATE and still reports the mismatch', async () => {
  const r = await audit({AAAAAAAAAA: WEBP}, distribution({AAAAAAAAAA: SUFFIXES}, {'AAAAAAAAAA.webp': {error: 'TimeoutError: aborted'}}))
  assert.equal(r.verdict, 'INDETERMINATE')
  assert.equal(r.mismatches.length, 3)
  assert.match(formatReport(r), /MISMATCH {7}AAAAAAAAAA \.avif: expected 403, got 200/)
})

test('an empty inventory measures nothing and is INDETERMINATE (guards against a vacuous PASS)', async () => {
  const r = await audit({}, distribution({}))
  assert.equal(r.verdict, 'INDETERMINATE')
  assert.match(formatReport(r), /COVER_KEYS lists no ASIN/)
})

test('the default run reads the committed COVER_KEYS (guards against a vacuous lane)', async () => {
  const urls = []
  const r = await auditCoverKeys({probe: async (url) => (urls.push(url), {status: 403, suppressed: false})})
  assert.ok(r.rows.length >= 6 && r.rows.length % 6 === 0, `rows=${r.rows.length}`)
  assert.ok(urls.every((u) => u.startsWith('https://d1pfm520aduift.cloudfront.net/images/books/')))
})

test('probeKey sends HEAD with a plain User-Agent and no contact detail', async () => {
  const calls = []
  const result = await probeKey('https://cdn.example/x.webp', async (url, init) => {
    calls.push({url, init})
    return new Response(null, {status: 200, headers: {'x-source': 'origin'}})
  })
  assert.deepEqual(result, {status: 200, suppressed: false})
  assert.equal(calls.length, 1)
  assert.equal(calls[0].init.method, 'HEAD')
  assert.equal(calls[0].init.headers['User-Agent'], USER_AGENT)
  assert.doesNotMatch(USER_AGENT, /@|mailto|https?:/)
})

test('probeKey retries once on a 5xx or a network error, then reports the last answer', async () => {
  let n = 0
  const flaky = await probeKey('https://cdn.example/x.webp', async () => (n++ === 0 ? new Response(null, {status: 502}) : new Response(null, {status: 403})))
  assert.deepEqual(flaky, {status: 403, suppressed: false})
  const down = await probeKey('https://cdn.example/x.webp', async () => {
    throw new TypeError('fetch failed')
  })
  assert.deepEqual(down, {error: 'TypeError: fetch failed'})
  const suppressed = await probeKey('https://cdn.example/x.webp',
    async () => new Response(null, {status: 503, headers: {'x-source': 'cloudfront-proxy-suppressed'}}))
  assert.deepEqual(suppressed, {status: 503, suppressed: true})
})
