// The one live-versus-stale rule (atlas decision 0160, D8): the registry
// `audit.warn` age per export, a missing or invalid `generatedAt` as stale,
// and the header and root attributes the browser writes for each verdict.
import {beforeEach, describe, expect, it} from 'vitest'
import {widgets} from '@j0nathan-ll0yd/copy'
import {EXPORT_FRESHNESS, exportDomainState, exportFreshness, type FreshnessDomain, freshnessState, isFreshnessDegraded} from '../../src/runtime/freshness'
import {revealLiveData} from '../../src/runtime/updater-empty'
import {formatAsOf} from '../../src/runtime/widget-state'

const NOW = Date.parse('2026-03-18T12:00:00.000Z')
const ago = (ms: number): string => new Date(NOW - ms).toISOString()
const M = 60_000
const H = 60 * M
const D = 24 * H

// `atlas/surfaces.yaml`, export-*-json `audit.warn` / `audit.error`, restated
// literally so a change to the module's table fails here.
const REGISTRY: Record<FreshnessDomain, [number, number]> = {
  health: [45 * M, 3 * H],
  sleep: [12 * H, 24 * H],
  workouts: [12 * H, 24 * H],
  books: [7 * D, 14 * D],
  articles: [7 * D, 14 * D],
  githubEvents: [7 * D, 14 * D],
  starredRepos: [18 * H, 36 * H],
  theatreReviews: [18 * H, 36 * H]
}

// covers: widget-contract#A live web widget's browser updater reaches the server's state for the same export
describe('EXPORT_FRESHNESS', () => {
  it('holds the registry ages for exactly the eight display exports', () => {
    expect(Object.keys(EXPORT_FRESHNESS).sort()).toEqual(Object.keys(REGISTRY).sort())
    for (const [domain, [warnMs, errorMs]] of Object.entries(REGISTRY)) {
      expect(EXPORT_FRESHNESS[domain as FreshnessDomain], domain).toEqual({warnMs, errorMs})
    }
  })
})

describe.each(Object.keys(REGISTRY) as FreshnessDomain[])('freshnessState(%s)', (domain) => {
  const [warn, error] = REGISTRY[domain]
  it('is live at age 0 and exactly at audit.warn', () => {
    expect(freshnessState(domain, ago(0), NOW)).toBe('live')
    expect(freshnessState(domain, ago(warn), NOW)).toBe('live')
  })
  it('is stale one millisecond past audit.warn, and stays stale past audit.error', () => {
    expect(freshnessState(domain, ago(warn + 1), NOW)).toBe('stale')
    expect(freshnessState(domain, ago(error + D), NOW)).toBe('stale')
  })
  it('reports degraded only past audit.error', () => {
    expect(isFreshnessDegraded(domain, ago(error), NOW)).toBe(false)
    expect(isFreshnessDegraded(domain, ago(error + 1), NOW)).toBe(true)
  })
})

describe('a generatedAt with no provable age', () => {
  it.each([[undefined], [null], [''], ['not a date']])('%s is stale and degraded', (generatedAt) => {
    expect(freshnessState('health', generatedAt, NOW)).toBe('stale')
    expect(isFreshnessDegraded('health', generatedAt, NOW)).toBe(true)
  })
  it('a timestamp ahead of the clock is live', () => {
    expect(freshnessState('health', ago(-5 * M), NOW)).toBe('live')
  })
})

describe('exportFreshness and exportDomainState', () => {
  it("carry the export's own generatedAt verbatim", () => {
    const generatedAt = ago(13 * H)
    expect(exportFreshness('sleep', {generatedAt}, NOW)).toEqual({state: 'stale', generatedAt})
    expect(exportFreshness('sleep', {}, NOW)).toEqual({state: 'stale', generatedAt: null})
  })
  it('an unread export is unavailable', () => {
    expect(exportDomainState('health', null, NOW)).toEqual({state: 'unavailable', generatedAt: null})
    expect(exportDomainState('health', {generatedAt: ago(0)}, NOW).state).toBe('live')
  })
})

describe('revealLiveData writes the header the server renders for each verdict', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="card" data-ssr-state="loading" class="is-loading">
        <span class="widget-timestamp" id="ts" data-live-label="live"></span>
        <noscript><p data-state-notice="loading">x</p></noscript>
      </div>`
  })
  const card = () => document.getElementById('card')!

  it('stale with a valid timestamp: an absolute "as of" <time>, and data-generated-at', () => {
    const generatedAt = ago(2 * H)
    revealLiveData(card(), 'stale', {generatedAt})
    const ts = document.getElementById('ts')!
    expect(ts.tagName).toBe('TIME')
    expect(ts.className).toBe('widget-timestamp widget-timestamp-stale')
    expect(ts.getAttribute('datetime')).toBe(generatedAt)
    expect(ts.textContent).toBe(widgets.widgetState.asOf.replace('{time}', formatAsOf(generatedAt)!))
    expect(ts.textContent).toMatch(/P[DS]T$/)
    expect(card().dataset.ssrState).toBe('stale')
    expect(card().dataset.generatedAt).toBe(generatedAt)
    expect(card().querySelector('noscript')).toBeNull()
  })

  it('stale without a valid timestamp: no label and no data-generated-at', () => {
    revealLiveData(card(), 'stale', {generatedAt: 'nope'})
    const ts = document.getElementById('ts')!
    expect(ts.tagName).toBe('SPAN')
    expect(ts.textContent).toBe('')
    expect(card().dataset.ssrState).toBe('stale')
    expect(card().hasAttribute('data-generated-at')).toBe(false)
  })

  it('live with a timestamp: the live label, and data-generated-at', () => {
    const generatedAt = ago(0)
    revealLiveData(card(), 'live', {generatedAt})
    expect(document.getElementById('ts')!.textContent).toBe('live')
    expect(card().dataset.generatedAt).toBe(generatedAt)
  })

  it('a stale card that recovers shows the live label again', () => {
    revealLiveData(card(), 'stale', {generatedAt: ago(2 * H)})
    revealLiveData(card(), 'live')
    const ts = document.getElementById('ts')!
    expect(ts.tagName).toBe('SPAN')
    expect(ts.textContent).toBe('live')
    expect(card().hasAttribute('data-generated-at')).toBe(false)
  })
})
