/// <reference path="../../src/astro-shim.d.ts" />
// The browser-side gaps website PR 0a exposed (atlas decision 0160). Each case
// starts from the REAL server markup (Astro Container API) loaded into a
// JSDOM window, and asserts on the DOM.
//
//   1. Hydration's target-range bands: the browser updater draws them, at the
//      known-answer positions, with the server's markup.
//   2. renderWidgetUnavailable: a failed first read leaves the card exactly as
//      the server renders `unavailable`; a later read still fills it; a
//      suppressed card and a card showing a reading are never written to.
//   3. A paused watch records the same state on HeartRate and MovementRings,
//      on server and browser.
//   5. Bookshelf's mirrored covers ride on the card in every state, and the
//      browser serves a cover same-origin only for an exact listed path.
// Gap 4 (freshness) is the stale half of client-parity.test.ts plus
// tests/runtime/freshness.test.ts.
import {experimental_AstroContainer as AstroContainer} from 'astro/container'
import {JSDOM} from 'jsdom'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
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
import {widgets} from '@j0nathan-ll0yd/copy'
import {adaptArticles, adaptBooks, adaptGithubEvents, adaptHealth, adaptSleep, adaptStarredRepos, adaptWorkouts} from '../../src/runtime/adapters'
import {CLOUDFRONT_BASE} from '../../src/runtime/constants'
import {exportFreshness} from '../../src/runtime/freshness'
import {PLACEHOLDER_IMAGE_SRC} from '../../src/runtime/image-utils'
import {releaseSuppression, renderWidgetUnavailable} from '../../src/runtime/updater-empty'
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
import {toDashboardViewModels} from '../../src/runtime/view-models'
import type {WidgetState} from '../../src/runtime/widget-state'

const GENERATED = join(__dirname, '../../../fixtures/src/generated')
const raw = (dir: string, v: string): any => JSON.parse(readFileSync(join(GENERATED, dir, `${v}.json`), 'utf8'))
const NOW = Date.parse('2026-03-18T12:00:00.000Z')
const KA = 'ssrKnownAnswer'

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

let container: AstroContainer
beforeAll(async () => {
  container = await AstroContainer.create()
})
const render = (component: unknown, props: Record<string, unknown>): Promise<string> => container.renderToString(component as never, {props})

/**
 * A card's markup, comparable across server and browser: Astro's dev-only
 * `data-astro-*` attributes dropped, attributes sorted, whitespace between
 * and around nodes collapsed. Every element, attribute and text survives.
 */
function canonical(el: Element): string {
  const clone = el.cloneNode(true) as Element
  const all = [clone, ...clone.querySelectorAll('*')]
  for (const node of all) {
    for (const attr of [...node.attributes]) {
      if (attr.name.startsWith('data-astro-')) {
        node.removeAttribute(attr.name)
      }
    }
    const attrs = [...node.attributes].map((a) => [a.name, a.value] as const).sort(([a], [b]) => a.localeCompare(b))
    attrs.forEach(([name]) => node.removeAttribute(name))
    // CSSOM serializes a style it wrote with a trailing ';': not a difference.
    attrs.forEach(([name, value]) => node.setAttribute(name, name === 'style' ? value.trim().replace(/;$/, '') : value))
  }
  return clone.outerHTML.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim()
}

// ── Gap 1: Hydration's target-range bands ─────────────────────────────

// covers: widget-contract#A live web widget's browser updater reaches the server's state for the same export
describe('gap 1: Hydration target-range bands in the browser', () => {
  const health = () => adaptHealth(raw('health', KA), null)

  it('known answer: the updater draws both bands at the registry ranges (water 74–125 of 140 oz, caffeine 200–400 of 500 mg)', async () => {
    const doc = mount(await render(Hydration, {state: 'loading'}))
    expect(doc.querySelectorAll('.hydra-range').length).toBe(0)
    updateHydration(health(), exportFreshness('health', raw('health', KA), NOW))
    const water = doc.querySelector<HTMLElement>('.hydra-bottle-body > .hydra-range.hydra-range-water')!
    const coffee = doc.querySelector<HTMLElement>('.hydra-mug-body > .hydra-range.hydra-range-coffee')!
    // 74 / 140 = 52.857…%; (125 − 74) / 140 = 36.428…%; 200 / 500 = 40%; (400 − 200) / 500 = 40%.
    expect(water.getAttribute('style')).toBe('bottom: 52.85714285714286%; height: 36.42857142857142%')
    expect(coffee.getAttribute('style')).toBe('bottom: 40%; height: 40%')
    expect(water.querySelector('.hydra-range-label-top')?.textContent).toBe('125')
    expect(water.querySelector('.hydra-range-label-bottom')?.textContent).toBe('74')
    expect(coffee.querySelector('.hydra-range-label-top')?.textContent).toBe('400')
    expect(coffee.querySelector('.hydra-range-label-bottom')?.textContent).toBe('200')
  })

  it("the browser's bands are the server's bands, element for element", async () => {
    const vm = toDashboardViewModels({health: {data: raw('health', KA)}}, NOW)
    const server = new JSDOM(await render(Hydration, vm.hydration as never)).window.document
    const doc = mount(await render(Hydration, {state: 'loading'}))
    updateHydration(health(), exportFreshness('health', raw('health', KA), NOW))
    for (const vessel of ['.hydra-bottle-body', '.hydra-mug-body']) {
      expect(canonical(doc.querySelector(vessel)!), vessel).toBe(canonical(server.querySelector(vessel)!))
    }
  })

  it('a repeated update keeps one band per vessel', async () => {
    const doc = mount(await render(Hydration, {state: 'loading'}))
    updateHydration(health())
    updateHydration(health())
    expect(doc.querySelectorAll('.hydra-bottle-body > .hydra-range').length).toBe(1)
    expect(doc.querySelectorAll('.hydra-mug-body > .hydra-range').length).toBe(1)
  })
})

// ── Gap 2: renderWidgetUnavailable ────────────────────────────────────

interface LiveCard {
  name: string
  id: string
  component: unknown
  /** A successful read of the known-answer export, as the website calls it. */
  fill: () => void
}

const KA_HEALTH = () => adaptHealth(raw('health', KA), raw('sleep', KA))
const LIVE_CARDS: LiveCard[] = [
  {
    name: 'HeartRate',
    id: 'cardHR',
    component: HeartRate,
    fill: () => {
      updateHeartRate(KA_HEALTH())
      updateHeartRateFooter(KA_HEALTH())
    }
  },
  {name: 'MovementRings', id: 'cardMovement', component: MovementRings, fill: () => updateMovementRings(KA_HEALTH())},
  {name: 'Hydration', id: 'cardHydration', component: Hydration, fill: () => updateHydration(KA_HEALTH())},
  {name: 'NightSummary', id: 'cardSleep', component: NightSummary, fill: () => updateNightSummary(adaptSleep(raw('sleep', KA), raw('health', KA)))},
  {name: 'Workouts', id: 'cardWorkouts', component: Workouts, fill: () => updateWorkouts(adaptWorkouts(raw('workouts', KA)))},
  {name: 'DevActivityLog', id: 'cardDevLog', component: DevActivityLog, fill: () => updateDevActivityLog(adaptGithubEvents(raw('github-events', KA), NOW))},
  {
    name: 'StarredRepoList',
    id: 'cardStarredRepos',
    component: StarredRepoList,
    fill: () => updateStarredRepos(adaptStarredRepos(raw('github-starred-repos', KA), NOW))
  },
  {name: 'ReadingFeed', id: 'cardReading', component: ReadingFeed, fill: () => updateReadingFeed(adaptArticles(raw('articles', KA), NOW))},
  {name: 'Bookshelf', id: 'cardBooks', component: Bookshelf, fill: () => updateBookshelf(adaptBooks(raw('books', KA)))},
  {name: 'TheatreReviews', id: 'cardTheatreReviews', component: TheatreReviews, fill: () => updateTheatreReviews(raw('theatre-reviews', KA))}
]

describe.each(LIVE_CARDS)('gap 2: renderWidgetUnavailable on $name', (card) => {
  it("turns the loading card into exactly the server's unavailable markup", async () => {
    const server = new JSDOM(`<body>${await render(card.component, {state: 'unavailable'})}</body>`).window.document.getElementById(card.id)!
    const doc = mount(await render(card.component, {state: 'loading'}))
    const el = doc.getElementById(card.id)!
    expect(renderWidgetUnavailable(el)).toBe(true)
    expect(canonical(el)).toBe(canonical(server))
    // The notice is the copy key's text, and no value is named.
    expect(el.querySelector('[data-state-notice="unavailable"]')?.textContent).toBe(widgets.widgetState.unavailable)
    expect(el.dataset.ssrState).toBe('unavailable')
    expect(el.hasAttribute('data-generated-at')).toBe(false)
  })

  it('a card the focus gate released takes the unavailable markup too', async () => {
    const server = new JSDOM(`<body>${await render(card.component, {state: 'unavailable'})}</body>`).window.document.getElementById(card.id)!
    const doc = mount(await render(card.component, {state: 'suppressed'}))
    const el = doc.getElementById(card.id)!
    releaseSuppression(el)
    expect(renderWidgetUnavailable(el)).toBe(true)
    expect(canonical(el)).toBe(canonical(server))
    expect(el.querySelector('[data-state-notice="suppressed"]')).toBeNull()
  })

  it('is a no-op on a card already unavailable', async () => {
    const doc = mount(await render(card.component, {state: 'unavailable'}))
    const before = doc.body.innerHTML
    expect(renderWidgetUnavailable(doc.getElementById(card.id))).toBe(true)
    expect(doc.body.innerHTML).toBe(before)
  })

  it('a later successful read fills the card', async () => {
    const doc = mount(await render(card.component, {state: 'loading'}))
    const el = doc.getElementById(card.id)!
    renderWidgetUnavailable(el)
    card.fill()
    expect(el.dataset.ssrState).toBe('live')
    expect(el.querySelector('[data-state-notice="unavailable"]')).toBeNull()
    expect(el.classList.contains('is-loading')).toBe(false)
    expect([...el.querySelectorAll<HTMLElement>('[data-state-scaffold]')].every((s) => !s.hidden)).toBe(true)
  })

  it('refuses a suppressed card and writes nothing', async () => {
    const doc = mount(await render(card.component, {state: 'suppressed'}))
    const before = doc.body.innerHTML
    expect(renderWidgetUnavailable(doc.getElementById(card.id))).toBe(false)
    expect(doc.body.innerHTML).toBe(before)
  })

  it('refuses a card that shows a reading: a later failed read keeps the last reading', async () => {
    const doc = mount(await render(card.component, {state: 'loading'}))
    card.fill()
    const before = doc.body.innerHTML
    expect(renderWidgetUnavailable(doc.getElementById(card.id))).toBe(false)
    expect(doc.body.innerHTML).toBe(before)
  })
})

// ── Gap 3: a paused watch ─────────────────────────────────────────────

describe('gap 3: a paused watch records one state on HeartRate and MovementRings, server and browser', () => {
  const PAUSED = raw('health', 'pausedHrGap')
  const {heartRate: _hr, heartRateVariabilitySDNN: _hrv, ...NO_HR} = PAUSED.quantities
  const STALE_AT = new Date(NOW - 2 * 3600_000).toISOString()
  const CASES: Array<{name: string; health: any; state: WidgetState}> = [
    {name: 'charging', health: raw('health', 'pausedCharging'), state: 'live'},
    {name: 'heart-rate gap', health: PAUSED, state: 'live'},
    {name: 'no heart rate in the export', health: {...PAUSED, quantities: NO_HR}, state: 'live'},
    {name: 'no quantity at all', health: {...PAUSED, quantities: {}}, state: 'live'},
    {name: 'an export older than audit.warn', health: {...PAUSED, generatedAt: STALE_AT}, state: 'stale'}
  ]

  it.each(CASES)('$name', async (c) => {
    const vm = toDashboardViewModels({health: {data: c.health}}, NOW)
    expect(vm.heartRate.state).toBe(c.state)
    expect(vm.movementRings.state).toBe(c.state)
    for (const [component, props, id] of [[HeartRate, vm.heartRate, 'cardHR'], [MovementRings, vm.movementRings, 'cardMovement']] as const) {
      const server = new JSDOM(await render(component, props as never)).window.document.getElementById(id)!
      expect(server.getAttribute('data-ssr-state'), `server ${id}`).toBe(c.state)
      expect(server.classList.contains('is-paused'), `server ${id} is-paused`).toBe(true)
    }
    const doc = mount((await render(HeartRate, {state: 'loading'})) + (await render(MovementRings, {state: 'loading'})))
    const adapted = adaptHealth(c.health, null)
    const freshness = exportFreshness('health', c.health, NOW)
    updateHeartRate(adapted, freshness)
    updateHeartRateFooter(adapted, freshness)
    updateMovementRings(adapted, freshness)
    for (const id of ['cardHR', 'cardMovement']) {
      const el = doc.getElementById(id)!
      expect(el.dataset.ssrState, `browser ${id}`).toBe(c.state)
      expect(el.classList.contains('is-paused'), `browser ${id} is-paused`).toBe(true)
      expect(el.classList.contains('is-loading'), `browser ${id} is-loading`).toBe(false)
    }
    // The paused card names no value (the server's value-free scaffold).
    for (const id of ['pulseBpm', 'hrZoneBadge', 'hrHrvValue', 'hrFooterRhr', 'hrFooterTemp', 'ringCenterPct', 'legendMove']) {
      expect(doc.getElementById(id)?.textContent?.trim(), id).toBe('')
    }
  })
})

// ── Gap 5: Bookshelf's mirrored covers ────────────────────────────────

describe("gap 5: Bookshelf's localCovers reach the browser", () => {
  const ASIN = 'KA7731KAP1'
  const VERSION = '00d8d9c74e41f9c468de2699'
  const CF = `${CLOUDFRONT_BASE}/images/books`
  const card = `${CF}/${ASIN}-${VERSION}-card.webp`
  const thumb = `${CF}/${ASIN}-${VERSION}-thumb.webp`
  const cardAvif = `${CF}/${ASIN}-${VERSION}-card.avif`
  // The site mirrors the card WebP and the card AVIF; the thumb is not mirrored.
  const LOCAL = [`/images/books/${ASIN}-${VERSION}-card.webp`, `/images/books/${ASIN}-${VERSION}-card.avif`]
  const books = () => {
    const b = raw('books', KA)
    b.books[0] = {...b.books[0], mainImage: card, mainImageCard: card, mainImageThumb: thumb, mainImageCardAvif: cardAvif, mainImageAvif: cardAvif}
    return b
  }
  const shelfCovers = (doc: Document) => {
    const book = [...doc.querySelectorAll('.shelf-book')].find((b) => b.getAttribute('aria-label')?.includes('Kappa-7731'))!
    return {
      src: book.querySelector('img')!.getAttribute('src'),
      srcset: book.querySelector('img')!.getAttribute('srcset'),
      avif: book.querySelector('source')?.getAttribute('srcset') ?? null,
      fallback: book.querySelector('img')!.getAttribute('data-fallback')
    }
  }

  it.each(['loading', 'unavailable', 'suppressed', 'empty', 'live', 'stale'] as const)('the card carries the list in %s', async (state) => {
    const props = state === 'live' || state === 'stale' ? {...toDashboardViewModels({books: {data: books()}}, NOW).bookshelf, state} : {state}
    const doc = new JSDOM(await render(Bookshelf, {...props, localCovers: LOCAL})).window.document
    expect(JSON.parse(doc.getElementById('cardBooks')!.getAttribute('data-local-covers')!)).toEqual(LOCAL)
  })

  it('the browser serves an exactly listed cover same-origin and every other from CloudFront with the W6 fallback', async () => {
    const doc = mount(await render(Bookshelf, {state: 'loading', localCovers: LOCAL}))
    updateBookshelf(adaptBooks(books()))
    const covers = shelfCovers(doc)
    expect(covers.src).toBe(LOCAL[0])
    expect(covers.srcset).toBe(`${LOCAL[0]} 1x, ${thumb} 2x`)
    // No thumb AVIF: the 2x candidate falls back to mainImageAvif, also the mirrored card AVIF.
    expect(covers.avif).toBe(`${LOCAL[1]} 1x, ${LOCAL[1]} 2x`)
    expect(covers.fallback).toBe(PLACEHOLDER_IMAGE_SRC)
  })

  it("the browser's covers are the server's covers for the same input", async () => {
    const vm = toDashboardViewModels({books: {data: books()}}, NOW)
    const server = new JSDOM(await render(Bookshelf, {...vm.bookshelf, localCovers: LOCAL})).window.document
    const doc = mount(await render(Bookshelf, {state: 'loading', localCovers: LOCAL}))
    updateBookshelf(adaptBooks(books()))
    expect(shelfCovers(doc)).toEqual(shelfCovers(server))
  })

  it('a new version token never matches an outdated mirrored file', async () => {
    const doc = mount(await render(Bookshelf, {state: 'loading', localCovers: LOCAL}))
    const next = books()
    const newCard = `${CF}/${ASIN}-ffffffffffffffffffffffff-card.webp`
    next.books[0] = {...next.books[0], mainImage: newCard, mainImageCard: newCard, mainImageCardAvif: null, mainImageAvif: null}
    updateBookshelf(adaptBooks(next))
    expect(shelfCovers(doc).src).toBe(newCard)
  })

  it('without a list, every cover loads from CloudFront', async () => {
    const doc = mount(await render(Bookshelf, {state: 'loading'}))
    expect(doc.getElementById('cardBooks')!.hasAttribute('data-local-covers')).toBe(false)
    updateBookshelf(adaptBooks(books()))
    expect(shelfCovers(doc).src).toBe(card)
  })
})
