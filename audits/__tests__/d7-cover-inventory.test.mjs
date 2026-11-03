// Known-answer suite for D7 (audits/checks/d7-cover-inventory.mjs) and its focus signal
// (audits/lib/focus-suppression.mjs).
//
// D7 compares the committed COVER_KEYS snapshot with what the distribution serves. Every
// case drives the real probeKey through a stubbed `fetch` that returns Response objects
// shaped like the live distribution's answers (measured 2026-11-02), never a pre-judged
// flag, so the suite never touches the network. The decisive properties:
//   - a listed key that answers absent and an omitted key that answers present are each a
//     MISMATCH naming ASIN and key;
//   - the focus gate's answer (403, application/json, mantle-LifegamesPortal
//     src/edge/focus-gate.js) is never read as an absent key, and a SUPPRESSED focus.json
//     stops the run before any key is probed;
//   - an interceptor that answers every key alike cannot PASS (negative control and
//     positive coverage);
//   - anything that cannot be judged is INDETERMINATE, never PASS.

import assert from 'node:assert/strict'
import test from 'node:test'

import {auditCoverKeys, CONTROL_KEY, formatReport, judgeKey, probeKey, USER_AGENT} from '../checks/d7-cover-inventory.mjs'
import {MAX_SUPPRESSION_MS, readFocusSuppression} from '../lib/focus-suppression.mjs'

const ORIGIN = 'https://cdn.example/images/books/'
const FOCUS_URL = 'https://cdn.example/focus.json'
const SUFFIXES = ['.webp', '-thumb.webp', '-card.webp', '.avif', '-thumb.avif', '-card.avif']
const WEBP = ['.webp', '-thumb.webp', '-card.webp']
const NOW = new Date('2026-11-02T12:00:00Z')

// The distribution's answers, as measured.
const image = (suffix) =>
  new Response(null, {status: 200, headers: {'content-type': suffix.endsWith('.avif') ? 'image/avif' : 'image/webp', server: 'AmazonS3'}})
const s3Missing = () => new Response(null, {status: 403, headers: {'content-type': 'application/xml', server: 'AmazonS3'}})
// Verbatim SUPPRESSION_RESPONSE of mantle-LifegamesPortal src/edge/focus-gate.js:60-64.
const focusGate = () =>
  new Response('{"suppressed":true,"reason":"focus mode active"}', {status: 403, headers: {'content-type': 'application/json', 'cache-control': 'no-store'}})
const focusJson = (body) => new Response(JSON.stringify(body), {status: 200, headers: {'content-type': 'application/json'}})
const VISIBLE = () => focusJson({currentFocus: 'None', hidingSince: null})

/**
 * A stub distribution. `served` maps ASIN -> suffixes that exist; every other key is S3's
 * missing-key 403. `keys` overrides single keys; `focus` answers focus.json.
 */
function distribution({served = {}, keys = {}, focus = VISIBLE} = {}) {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({url, init})
    if (url === FOCUS_URL) {
      return focus()
    }
    const key = url.slice(ORIGIN.length)
    if (key in keys) {
      return keys[key]()
    }
    const asin = Object.keys(served).find((a) => key.startsWith(a))
    const suffix = asin ? key.slice(asin.length) : null
    return asin && served[asin].includes(suffix) ? image(suffix) : s3Missing()
  }
  return {fetchImpl, calls}
}

const audit = (inventory, fetchImpl) => auditCoverKeys({inventory, suffixes: SUFFIXES, origin: ORIGIN, fetchImpl, now: NOW})

test('PASS when every key answers as the snapshot says, partial ASINs included', async () => {
  const inventory = {AAAAAAAAAA: SUFFIXES, BBBBBBBBBB: WEBP}
  const r = await audit(inventory, distribution({served: inventory}).fetchImpl)
  assert.equal(r.verdict, 'PASS')
  assert.equal(r.rows.length, 12)
  assert.equal(r.control.got, 'absent')
  assert.equal(r.listedJudged, 9)
})

test('a fake key (listed, S3 answers missing) is a MISMATCH naming ASIN and key', async () => {
  const r = await audit({BBBBBBBBBB: [...WEBP, '.avif']}, distribution({served: {BBBBBBBBBB: WEBP}}).fetchImpl)
  assert.equal(r.verdict, 'MISMATCH')
  assert.deepEqual(r.mismatches.map((m) => [m.asin, m.suffix, m.expected, m.got]), [['BBBBBBBBBB', '.avif', 'present', 'absent']])
  assert.match(formatReport(r), /MISMATCH {7}BBBBBBBBBB \.avif: expected present, got absent \(BBBBBBBBBB\.avif\)/)
})

test('a dropped key (omitted, serves an image) is a MISMATCH naming ASIN and key', async () => {
  const r = await audit({AAAAAAAAAA: SUFFIXES.filter((s) => s !== '-card.webp')}, distribution({served: {AAAAAAAAAA: SUFFIXES}}).fetchImpl)
  assert.equal(r.verdict, 'MISMATCH')
  assert.deepEqual(r.mismatches.map((m) => [m.asin, m.suffix, m.expected, m.got]), [['AAAAAAAAAA', '-card.webp', 'absent', 'present']])
})

test("the focus gate's exact 403 is never an absent key: INDETERMINATE, no MISMATCH", async () => {
  // focus.json still reads visible (a stale or racing signal), but the gate is answering.
  const gated = Object.fromEntries([...SUFFIXES.map((s) => `AAAAAAAAAA${s}`), CONTROL_KEY].map((k) => [k, focusGate]))
  const r = await audit({AAAAAAAAAA: SUFFIXES}, distribution({keys: gated}).fetchImpl)
  assert.equal(r.verdict, 'INDETERMINATE')
  assert.deepEqual(r.mismatches, [])
  assert.match(r.control.got, /focus gate/)
})

test('a SUPPRESSED focus.json stops the run before any key is probed', async () => {
  const {fetchImpl, calls} = distribution({
    served: {AAAAAAAAAA: SUFFIXES},
    focus: () => focusJson({currentFocus: 'Work', hidingSince: '2026-11-02T11:00:00Z'})
  })
  const r = await audit({AAAAAAAAAA: SUFFIXES}, fetchImpl)
  assert.equal(r.verdict, 'INDETERMINATE')
  assert.equal(r.focus.state, 'SUPPRESSED')
  assert.deepEqual(calls.map((c) => c.url), [FOCUS_URL])
  assert.match(formatReport(r), /covers are suppressed: focus mode has been hiding for 1\.0h/)
})

test('an OVERDUE focus licenses nothing: it probes, and a live gate still reads INDETERMINATE', async () => {
  const gated = Object.fromEntries(SUFFIXES.map((s) => [`AAAAAAAAAA${s}`, focusGate]))
  const {fetchImpl, calls} = distribution({keys: gated, focus: () => focusJson({currentFocus: 'Do Not Disturb'})})
  const r = await audit({AAAAAAAAAA: SUFFIXES}, fetchImpl)
  assert.equal(r.focus.state, 'OVERDUE')
  assert.equal(r.verdict, 'INDETERMINATE')
  assert.equal(calls.length, 1 + SUFFIXES.length + 1)
  assert.deepEqual(r.mismatches, [])
})

test('an unreadable focus.json licenses nothing: it probes and can still judge every key', async () => {
  const inventory = {AAAAAAAAAA: WEBP}
  const r = await audit(inventory, distribution({served: inventory, focus: () => new Response('<html>', {status: 502})}).fetchImpl)
  assert.equal(r.focus.state, 'UNKNOWN')
  assert.equal(r.verdict, 'PASS')
})

test('an unreachable host is INDETERMINATE, never PASS', async () => {
  const r = await audit({AAAAAAAAAA: SUFFIXES}, async () => {
    throw new TypeError('fetch failed')
  })
  assert.equal(r.focus.state, 'UNKNOWN')
  assert.equal(r.verdict, 'INDETERMINATE')
  assert.equal(r.unjudged.length, 6)
})

test('a blanket-200 interceptor cannot PASS a fully listed inventory (negative control)', async () => {
  const r = await audit({AAAAAAAAAA: SUFFIXES}, async (url) => (url === FOCUS_URL ? VISIBLE() : image('.webp')))
  assert.deepEqual(r.mismatches, [])
  assert.equal(r.control.got, 'present')
  assert.equal(r.verdict, 'INDETERMINATE')
  assert.match(r.reason, /negative control d7-negative-control\.webp answered present/)
})

test('a blanket-403 answer cannot PASS an empty listing (positive coverage)', async () => {
  const r = await audit({AAAAAAAAAA: []}, async (url) => (url === FOCUS_URL ? VISIBLE() : s3Missing()))
  assert.deepEqual(r.mismatches, [])
  assert.equal(r.listedJudged, 0)
  assert.equal(r.verdict, 'INDETERMINATE')
  assert.match(r.reason, /no listed key was judged/)
})

test('a fetch that resolves undefined, or throws, is INDETERMINATE and the other keys still run', async () => {
  const {fetchImpl} = distribution({served: {AAAAAAAAAA: SUFFIXES}})
  const r = await audit({AAAAAAAAAA: SUFFIXES}, async (url, init) => {
    if (url.endsWith('.avif')) {
      return undefined
    }
    if (url.endsWith('-thumb.webp')) {
      throw new Error('boom')
    }
    return fetchImpl(url, init)
  })
  assert.equal(r.verdict, 'INDETERMINATE')
  assert.deepEqual(r.unjudged.map((row) => [row.suffix, row.got]).sort(), [
    ['-card.avif', 'no response'],
    ['-thumb.avif', 'no response'],
    ['-thumb.webp', 'Error: boom'],
    ['.avif', 'no response']
  ])
  assert.equal(r.rows.filter((row) => row.kind === 'ok').length, 2)
})

test('a 5xx, a 404, a non-image 200 and a non-xml 403 are unjudged, not MISMATCH', async () => {
  const r = await audit({AAAAAAAAAA: SUFFIXES},
    distribution({
      served: {AAAAAAAAAA: SUFFIXES},
      keys: {
        'AAAAAAAAAA.webp': () => new Response(null, {status: 503}),
        'AAAAAAAAAA.avif': () => new Response(null, {status: 404, headers: {'content-type': 'application/xml'}}),
        'AAAAAAAAAA-card.webp': () => new Response(null, {status: 200, headers: {'content-type': 'text/html'}}),
        'AAAAAAAAAA-card.avif': () => new Response(null, {status: 403, headers: {'content-type': 'text/html'}})
      }
    }).fetchImpl)
  assert.equal(r.verdict, 'INDETERMINATE')
  assert.deepEqual(r.unjudged.map((row) => row.suffix).sort(), ['-card.avif', '-card.webp', '.avif', '.webp'])
  assert.deepEqual(r.mismatches, [])
})

test('a mismatch beside an unjudged key is INDETERMINATE and still reports the mismatch', async () => {
  const r = await audit({AAAAAAAAAA: WEBP},
    distribution({served: {AAAAAAAAAA: SUFFIXES}, keys: {'AAAAAAAAAA.webp': () => new Response(null, {status: 500})}}).fetchImpl)
  assert.equal(r.verdict, 'INDETERMINATE')
  assert.equal(r.mismatches.length, 3)
  assert.match(formatReport(r), /MISMATCH {7}AAAAAAAAAA \.avif: expected absent, got present/)
})

test('an empty inventory measures nothing and is INDETERMINATE', async () => {
  const r = await audit({}, distribution().fetchImpl)
  assert.equal(r.verdict, 'INDETERMINATE')
})

test('the default run reads the committed COVER_KEYS on the real origin (guards against a vacuous lane)', async () => {
  const urls = []
  const r = await auditCoverKeys({now: NOW, fetchImpl: async (url) => (urls.push(url), url.endsWith('/focus.json') ? VISIBLE() : s3Missing())})
  assert.ok(r.rows.length >= 6 && r.rows.length % 6 === 0, `rows=${r.rows.length}`)
  assert.equal(urls[0], 'https://d1pfm520aduift.cloudfront.net/focus.json')
  assert.ok(urls.slice(1).every((u) => u.startsWith('https://d1pfm520aduift.cloudfront.net/images/books/')))
})

test('probeKey sends HEAD with a plain User-Agent and returns status and content type', async () => {
  const calls = []
  const result = await probeKey('https://cdn.example/x.webp', async (_url, init) => (calls.push(init), image('.webp')))
  assert.deepEqual(result, {status: 200, contentType: 'image/webp'})
  assert.equal(calls.length, 1)
  assert.equal(calls[0].method, 'HEAD')
  assert.equal(calls[0].headers['User-Agent'], USER_AGENT)
  assert.doesNotMatch(USER_AGENT, /@|mailto|https?:/)
})

test('probeKey retries once on a 5xx, an error or a non-response, then reports the last answer', async () => {
  let n = 0
  assert.deepEqual(await probeKey('u', async () => (n++ === 0 ? new Response(null, {status: 502}) : s3Missing())), {
    status: 403,
    contentType: 'application/xml'
  })
  assert.deepEqual(await probeKey('u', async () => {
    throw new TypeError('fetch failed')
  }), {error: 'TypeError: fetch failed'})
  assert.deepEqual(await probeKey('u', async () => undefined), {error: 'no response'})
})

test('judgeKey reads the gate, S3 and an image apart through probeKey', async () => {
  assert.deepEqual(judgeKey(await probeKey('u', async () => focusGate())), {answer: 'unjudged', why: '403 application/json: the focus gate suppressed it'})
  assert.deepEqual(judgeKey(await probeKey('u', async () => s3Missing())), {answer: 'absent'})
  assert.deepEqual(judgeKey(await probeKey('u', async () => image('.avif'))), {answer: 'present'})
  assert.deepEqual(judgeKey(undefined), {answer: 'unjudged', why: 'no probe result'})
})

test('readFocusSuppression: the same states as LP, fail-open on every unreadable signal', async () => {
  const read = (body) => readFocusSuppression(ORIGIN, async () => focusJson(body), NOW)
  assert.equal((await read({currentFocus: 'Personal'})).state, 'VISIBLE')
  assert.equal((await read({currentFocus: 'Work', hidingSince: '2026-11-02T06:00:00Z'})).state, 'SUPPRESSED')
  assert.equal((await read({currentFocus: 'Work'})).state, 'OVERDUE')
  assert.equal((await read({currentFocus: 'Work', hidingSince: 'yesterday'})).state, 'OVERDUE')
  assert.equal((await read({currentFocus: 'Work', hidingSince: '2026-11-03T00:00:00Z'})).state, 'OVERDUE')
  assert.equal((await read({currentFocus: 'Work', hidingSince: new Date(NOW.getTime() - MAX_SUPPRESSION_MS - 1).toISOString()})).state, 'OVERDUE')
  assert.equal((await read({})).state, 'UNKNOWN')
  assert.equal((await readFocusSuppression(ORIGIN, async () => new Response('not json'), NOW)).state, 'UNKNOWN')
  assert.equal((await readFocusSuppression(ORIGIN, async () => undefined, NOW)).state, 'UNKNOWN')
  assert.equal((await read({currentFocus: 'None'})).focusUrl, FOCUS_URL)
})
