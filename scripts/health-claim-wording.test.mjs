// Atlas decisions 0120 D1 and 0128 P0b, owner ruling "Omit unsupported claims". The health exports
// carry one day (mantle-LifegamesPortal src/lib/llm-content/aggregate.ts), so no tracked surface may
// promise a seven-day figure. packages/copy/tests/llm-claim-honesty.test.ts reads only the llm
// namespace; this wording outlived that fix in apps/portfolio and in the voice guides.
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'

const SEVEN_DAY_CLAIM = /\b(?:7|seven)[- ]day (?:aggregate|average|baseline|trend|window)s?\b/i

// History and the two suites that must spell the claim in order to reject it.
const EXEMPT = /(?:^|\/)CHANGELOG\.md$|^\.changeset\/|^packages\/copy\/tests\/llm-claim-honesty\.test\.ts$|^scripts\/health-claim-wording\.test\.mjs$/

function findClaims(path, text) {
  if (EXEMPT.test(path)) {
    return []
  }
  return text.split('\n').flatMap((line, index) => (SEVEN_DAY_CLAIM.test(line) ? [`${path}:${index + 1}`] : []))
}

function textOf(path) {
  const bytes = readFileSync(path)
  return bytes.includes(0) ? '' : bytes.toString('utf8')
}

test('no tracked file promises a seven-day health figure', () => {
  const tracked = execFileSync('git', ['ls-files', '-z'], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024}).split('\0').filter(Boolean)
  assert.ok(tracked.length > 0, 'git ls-files returned nothing, so the scan would pass vacuously')
  assert.deepEqual(tracked.flatMap((path) => findClaims(path, textOf(path))), [])
})

test('the scan rejects each claim shape and exempts only history', () => {
  for (const claim of ['Hydration (7-day aggregate)', 'above 7-day baseline', 'a seven-day average', 'Seven-Day Trend']) {
    assert.deepEqual(findClaims('apps/portfolio/x.astro', claim), ['apps/portfolio/x.astro:1'], claim)
  }
  assert.deepEqual(findClaims('packages/copy/CHANGELOG.md', '7-day aggregate'), [])
  assert.deepEqual(findClaims('apps/docs/x.astro', '40+ events in 7 days'), [])
  assert.deepEqual(findClaims('Sources/x.swift', 'delta from the 30-day baseline'), [])
})
