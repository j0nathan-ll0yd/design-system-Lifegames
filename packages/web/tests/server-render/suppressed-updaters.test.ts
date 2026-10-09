/// <reference path="../../src/astro-shim.d.ts" />
// L-1 (verifier on PR #289): every guarded client updater writes NOTHING to a
// card the server rendered suppressed, against the REAL server markup of all
// ten widgets (Astro Container API), not a hand-written stand-in. The control
// case proves each call does write to the same markup rendered unavailable,
// so the test can see a write. Removing any one updater's suppression guard
// fails its case here.
import {experimental_AstroContainer as AstroContainer} from 'astro/container'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {JSDOM} from 'jsdom'
import {afterEach, beforeAll, describe, expect, it} from 'vitest'
import Bookshelf from '../../src/widgets/reading/Bookshelf.astro'
import DevActivityLog from '../../src/widgets/github/DevActivityLog.astro'
import HeartRate from '../../src/widgets/health/HeartRate.astro'
import Hydration from '../../src/widgets/health/Hydration.astro'
import MovementRings from '../../src/widgets/health/MovementRings.astro'
import NightSummary from '../../src/widgets/health/NightSummary.astro'
import ReadingFeed from '../../src/widgets/reading/ReadingFeed.astro'
import StarredRepoList from '../../src/widgets/github/StarredRepoList.astro'
import TheatreReviews from '../../src/widgets/reading/TheatreReviews.astro'
import Workouts from '../../src/widgets/health/Workouts.astro'
import {adaptArticles, adaptBooks, adaptGithubEvents, adaptHealth, adaptSleep, adaptStarredRepos, adaptWorkouts} from '../../src/runtime/adapters'
import {
  updateBookshelf,
  updateDevActivityLog,
  updateHeartRate,
  updateHydration,
  updateNightSummary,
  updateReadingFeed,
  updateStarredRepos,
  updateWorkouts
} from '../../src/runtime/updaters'
import {updateHeartRateFooter, updateMovementRings} from '../../src/runtime/updaters-movement'
import {updateTheatreReviews} from '../../src/runtime/updaters-theatre'

const GENERATED = join(__dirname, '../../../fixtures/src/generated')
const raw = (dir: string, v: string): any => JSON.parse(readFileSync(join(GENERATED, dir, `${v}.json`), 'utf8'))
const NOW = Date.parse('2026-03-18T12:00:00.000Z')
const KA = 'ssrKnownAnswer'

const COMPONENTS = [HeartRate, MovementRings, Hydration, NightSummary, Workouts, DevActivityLog, StarredRepoList, ReadingFeed, Bookshelf, TheatreReviews]

// The eleven guarded updaters, each called with known-answer data, and the six
// collection updaters again with a successful empty export.
const UPDATERS: Record<string, () => void> = {
  updateHeartRate: () => updateHeartRate(adaptHealth(raw('health', KA), raw('sleep', KA))),
  updateHeartRateFooter: () => updateHeartRateFooter(adaptHealth(raw('health', KA), raw('sleep', KA))),
  updateMovementRings: () => updateMovementRings(adaptHealth(raw('health', KA), raw('sleep', KA))),
  updateHydration: () => updateHydration(adaptHealth(raw('health', KA), raw('sleep', KA))),
  updateNightSummary: () => updateNightSummary(adaptSleep(raw('sleep', KA), raw('health', KA))),
  updateWorkouts: () => updateWorkouts(adaptWorkouts(raw('workouts', KA))),
  updateDevActivityLog: () => updateDevActivityLog(adaptGithubEvents(raw('github-events', KA), NOW)),
  updateStarredRepos: () => updateStarredRepos(adaptStarredRepos(raw('github-starred-repos', KA), NOW)),
  updateReadingFeed: () => updateReadingFeed(adaptArticles(raw('articles', KA), NOW)),
  updateBookshelf: () => updateBookshelf(adaptBooks(raw('books', KA))),
  updateTheatreReviews: () => updateTheatreReviews(raw('theatre-reviews', KA)),
  // Review M02: each collection's successful-empty branch writes too, so it is guarded too.
  'updateWorkouts (empty)': () => updateWorkouts(adaptWorkouts({...raw('workouts', KA), workouts: []})),
  'updateDevActivityLog (empty)': () => updateDevActivityLog(adaptGithubEvents({...raw('github-events', KA), events: []}, NOW)),
  'updateStarredRepos (empty)': () => updateStarredRepos(adaptStarredRepos({...raw('github-starred-repos', KA), repos: []}, NOW)),
  'updateReadingFeed (empty)': () => updateReadingFeed(adaptArticles({...raw('articles', KA), articles: []}, NOW)),
  'updateBookshelf (empty)': () => updateBookshelf(adaptBooks({...raw('books', KA), books: []})),
  'updateTheatreReviews (empty)': () => updateTheatreReviews({...raw('theatre-reviews', KA), reviews: []})
}

const markup: Record<'suppressed' | 'unavailable', string> = {suppressed: '', unavailable: ''}
beforeAll(async () => {
  const container = await AstroContainer.create()
  for (const state of ['suppressed', 'unavailable'] as const) {
    const parts = await Promise.all(COMPONENTS.map((c) => container.renderToString(c, {props: {state}})))
    markup[state] = parts.join('\n')
  }
})

// The Astro Container needs Node; the updaters need a DOM. Each case loads the
// server markup into a JSDOM window installed as the globals the updaters read.
const GLOBALS = ['window', 'document', 'HTMLElement', 'Element', 'Node', 'requestAnimationFrame'] as const
function mount(html: string): Document {
  const dom = new JSDOM(`<!doctype html><body>${html}</body>`, {pretendToBeVisual: true})
  for (const key of GLOBALS) {
    ;(globalThis as Record<string, unknown>)[key] = (dom.window as unknown as Record<string, unknown>)[key]
  }
  return dom.window.document
}
afterEach(() => {
  for (const key of GLOBALS) {
    delete (globalThis as Record<string, unknown>)[key]
  }
})

describe.each(Object.keys(UPDATERS))('%s', (name) => {
  it('writes nothing to the server-rendered suppressed cards', () => {
    const doc = mount(markup.suppressed)
    const before = doc.body.innerHTML
    UPDATERS[name]!()
    expect(doc.body.innerHTML === before, `${name} mutated a suppressed card`).toBe(true)
    for (const el of doc.querySelectorAll<HTMLElement>('[data-ssr-state]')) {
      expect(el.dataset.ssrState).toBe('suppressed')
    }
  })

  it('control: does write to the same cards rendered unavailable', () => {
    const doc = mount(markup.unavailable)
    const before = doc.body.innerHTML
    UPDATERS[name]!()
    expect(doc.body.innerHTML === before, `${name} wrote nothing (the test would be blind)`).toBe(false)
  })
})
