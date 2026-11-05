/// <reference path="../../src/astro-shim.d.ts" />
// One rule, two callers (atlas decision 0160): for the same export, the
// server render and the browser updater must reach the same card.
//
// Server half: the view models (toDashboardViewModels) at NOW, with no
// explicit state, so the shared freshness rule (runtime/freshness) decides
// live versus stale, then the real `.astro` template (Astro Container API).
// Browser half: the same template rendered `loading` (the data-free page of
// website PR 0a), loaded into a JSDOM window, then the website's call: the
// updater with the adapted export and `exportFreshness(domain, export, NOW)`.
//
// Relative labels (atlas decision 0164 D5): the server writes absolute UTC
// text in <time data-relative>, and the browser's load pass
// (fillRelativeTimes) writes the relative label. The server half here is the
// server markup after that pass at NOW; the browser half runs its updaters
// with Date.now() at NOW. So the pair also proves the server markup plus the
// load pass reaches the updater's card.
//
// The two must agree on `data-ssr-state`, `data-generated-at`, the paused and
// loading classes, every visible text node, every attribute of the elements a
// reader or a stylesheet keys on (attributeMap), and the exact markup of the
// inline runs whose spacing a whitespace text node changes (inlineMarkup).
// "Visible" models the package's CSS: no `hidden` subtree, no skeleton, no
// <noscript>, and under `.is-paused` the paused block instead of the value
// scaffold.
import {experimental_AstroContainer as AstroContainer} from 'astro/container'
import {JSDOM} from 'jsdom'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest'
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
import {EXPORT_FRESHNESS, exportDomainState, exportFreshness, type FreshnessDomain} from '../../src/runtime/freshness'
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
import {type DashboardExports, type DashboardViewModels, toDashboardViewModels} from '../../src/runtime/view-models'
import {sleepScoreSource} from '../../src/runtime/widget-rules'
import {fillRelativeTimes} from '../../src/runtime/relative-time-fill'
import {initBookModal} from '../../src/runtime/book-modal-init'

const GENERATED = join(__dirname, '../../../fixtures/src/generated')
const raw = (dir: string, v: string): any => JSON.parse(readFileSync(join(GENERATED, dir, `${v}.json`), 'utf8'))
const NOW_ISO = '2026-03-18T12:00:00.000Z'
const NOW = Date.parse(NOW_ISO)
const KA = 'ssrKnownAnswer'

/** The export, aged one minute past its registry `audit.warn` age: stale. */
function aged<T extends {generatedAt?: string}>(domain: FreshnessDomain, data: T): T {
  return {...data, generatedAt: new Date(NOW - EXPORT_FRESHNESS[domain].warnMs - 60_000).toISOString()}
}

// ── DOM plumbing ─────────────────────────────────────────────────────

const GLOBALS = ['window', 'document', 'HTMLElement', 'Element', 'Node', 'requestAnimationFrame', 'MutationObserver'] as const
function mount(html: string): Document {
  const dom = new JSDOM(`<!doctype html><body>${html}</body>`, {pretendToBeVisual: true})
  for (const key of GLOBALS) {
    ;(globalThis as Record<string, unknown>)[key] = (dom.window as unknown as Record<string, unknown>)[key]
  }
  return dom.window.document
}
// The updaters write relative labels at Date.now(); pin it to the server's clock.
beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(NOW)
})
afterEach(() => {
  vi.restoreAllMocks()
  for (const key of GLOBALS) {
    delete (globalThis as Record<string, unknown>)[key]
  }
})

/** True when the package's CSS (or a `hidden` attribute) hides `el`. */
function isHidden(el: Element, card: Element): boolean {
  if (el.hasAttribute('hidden') || el.tagName === 'NOSCRIPT' || el.classList.contains('skeleton-state')) {
    return true
  }
  const paused = card.classList.contains('is-paused')
  // components.css: the paused block shows only under .is-paused, and hides the data.
  if ((el.classList.contains('hr-paused') || el.classList.contains('mv-paused')) && !paused) {
    return true
  }
  return paused && (el.classList.contains('hr-data') || el.classList.contains('mv-data'))
}

/** Every visible, non-blank text node of the card, whitespace-collapsed, in document order. */
export function visibleText(card: Element): string[] {
  const out: string[] = []
  const walk = (node: Node): void => {
    if (node.nodeType === 3) {
      const t = (node.textContent ?? '').replace(/\s+/g, ' ').trim()
      if (t) {
        out.push(t)
      }
      return
    }
    if (node.nodeType === 1 && node !== card && isHidden(node as Element, card)) {
      return
    }
    node.childNodes.forEach(walk)
  }
  walk(card)
  return out
}

interface CardSnapshot {
  state: string | null
  generatedAt: string | null
  paused: boolean
  loading: boolean
  text: string[]
  attrs: string[]
  markup: string[]
}

// Attributes that differ by design, not by rendering: Astro's dev-only source
// markers, the client's "already written" flag, and the server's initial ECG
// parameters (the browser hands them to the canvas through __ecgUpdate).
const IGNORED_ATTR = /^(data-astro-|data-live-updated$|data-bpm$|data-hrv$|data-stroke$)/

// Attributes only a bound JavaScript enhancement writes, never a renderer,
// each scoped to one card, one element and one value. The book dialog
// (initBookModal) marks each Bookshelf title link `aria-haspopup="dialog"` once
// it takes plain clicks over. Without JavaScript the link navigates, so the
// server markup must never say it opens a dialog
// (tests/server-render/bookshelf-links.test.ts holds both halves). The browser
// half binds the dialog as the website does, so this one attribute is set
// aside there; any other aria-haspopup, or another value, is still compared.
const JS_ONLY_ATTRS = [{card: 'cardBooks', selector: '.shelf-book-link', name: 'aria-haspopup', value: 'dialog'}]
const isJsOnly = (card: Element, el: Element, a: Attr): boolean =>
  JS_ONLY_ATTRS.some((r) => card.id === r.card && el.matches(r.selector) && a.name === r.name && a.value === r.value)

// A style attribute serialized by CSSOM, then sorted by declaration: the
// browser writes styles through CSSOM (hex becomes rgb()), the server as text.
const STYLE_PARSER = new JSDOM('<!doctype html><div></div>').window.document.querySelector('div') as HTMLElement
function normalizeStyle(value: string): string {
  STYLE_PARSER.style.cssText = value
  return STYLE_PARSER.style.cssText.split(';').map((d: string) => d.trim()).filter(Boolean).sort().join('; ')
}

/**
 * Every attribute of every element a reader or a stylesheet keys on: the
 * card root, each element with an id, the dots, the ring group, the bands,
 * the images, the links (href, rel, target), the lists (aria-live) and their
 * items, every tooltip and the reading notes. Inline styles cover ring offsets, fills, bars
 * and the sun dot.
 */
function attributeMap(card: Element): string[] {
  const out: string[] = []
  const els = [card, ...card.querySelectorAll('[id], .live-dot, [role="img"], .hydra-range, img, source, time, a, ul, li, [title], .article-list-note')]
  els.forEach((el, i) => {
    const key = `${i}:${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}`
    for (const a of [...el.attributes].sort((x, y) => x.name.localeCompare(y.name))) {
      if (!IGNORED_ATTR.test(a.name) && !isJsOnly(card, el, a)) {
        // Class order carries no meaning; style serialization differs by writer.
        const value = a.name === 'style' ? normalizeStyle(a.value) : a.name === 'class' ? a.value.split(/\s+/).filter(Boolean).sort().join(' ') : a.value
        out.push(`${key} ${a.name}=${value}`)
      }
    }
  })
  return out
}

// Inline runs: a whitespace text node between two inline children renders as
// a space, so these must match byte for byte (Bookshelf stars, article rows).
const INLINE_RUNS = '.shelf-book-stars, .article-list-item'

/** The serialized children of each inline run, without Astro's dev-only attributes. */
function inlineMarkup(card: Element): string[] {
  return [...card.querySelectorAll(INLINE_RUNS)].map((el) => `${el.className}: ${el.innerHTML.replace(/ data-astro-[\w-]+(="[^"]*")?/g, '')}`)
}

function snapshot(card: Element): CardSnapshot {
  return {
    state: card.getAttribute('data-ssr-state'),
    generatedAt: card.getAttribute('data-generated-at'),
    paused: card.classList.contains('is-paused'),
    loading: card.classList.contains('is-loading'),
    text: visibleText(card),
    attrs: attributeMap(card),
    markup: inlineMarkup(card)
  }
}

// ── The matrix ──────────────────────────────────────────────────────

interface Input {
  health?: any
  sleep?: any
  workouts?: any
  githubEvents?: any
  starredRepos?: any
  articles?: any
  books?: any
  theatreReviews?: any
}

interface Card {
  name: string
  id: string
  component: unknown
  vm: keyof DashboardViewModels
  /** Extra props both halves pass (Bookshelf's localCovers). */
  extra?: Record<string, unknown>
  /** The website's browser call for this card. */
  apply: (input: Input) => void
  cases: Record<string, {input: Input; state: string}>
}

const H = raw('health', KA)
const BOOKS = raw('books', KA)
// A finished book rated 0: no stars on either side (and no stray "0").
// A title an attribute must encode: both quotes, a literal "&amp;" and a tag.
const BOOKS_HOSTILE_TITLE = {...BOOKS, books: BOOKS.books.map((b: any) => ({...b, title: `It's "A" &amp; <i>B</i>`}))}
const BOOKS_RATED_ZERO = {...BOOKS, books: BOOKS.books.map((b: any) => (b.status === 'finished' ? {...b, rating: 0} : b))}
const S = raw('sleep', KA)
const PAUSED = raw('health', 'pausedHrGap')
const {heartRate: _hr, heartRateVariabilitySDNN: _hrv, ...PAUSED_NO_HR} = PAUSED.quantities

const GITHUB_KA = raw('github-events', KA)
const GITHUB_TIMESTAMPED = {
  ...GITHUB_KA,
  events: GITHUB_KA.events.map((e: any, i: number) => ({...e, date: new Date(NOW - (i + 1) * 95 * 60_000).toISOString()}))
}

const health = (i: Input) => adaptHealth(i.health, i.sleep ?? null)
const fresh = (domain: FreshnessDomain, data: any) => exportFreshness(domain, data, NOW)

const CARDS: Card[] = [
  {
    name: 'HeartRate',
    id: 'cardHR',
    component: HeartRate,
    vm: 'heartRate',
    apply: (i) => {
      updateHeartRate(health(i), fresh('health', i.health))
      updateHeartRateFooter(health(i), fresh('health', i.health))
    },
    cases: {
      live: {input: {health: H, sleep: S}, state: 'live'},
      stale: {input: {health: aged('health', H), sleep: S}, state: 'stale'},
      // One case per heart-rate zone: the accent, the dot and the zone colours.
      'zone: bradycardia': {input: {health: raw('health', 'bradycardia')}, state: 'live'},
      'zone: resting': {input: {health: raw('health', 'resting')}, state: 'live'},
      'zone: normal': {input: {health: raw('health', 'normal')}, state: 'live'},
      'zone: fat burn': {input: {health: raw('health', 'fatBurn')}, state: 'live'},
      'zone: peak': {input: {health: raw('health', 'peak')}, state: 'live'},
      'paused (charging)': {input: {health: raw('health', 'pausedCharging')}, state: 'live'},
      'paused, stale': {input: {health: aged('health', PAUSED)}, state: 'stale'},
      'paused with no heart rate': {input: {health: {...PAUSED, quantities: PAUSED_NO_HR}}, state: 'live'},
      'no heart rate: unavailable': {input: {health: {...H, quantities: {hrvSDNN: H.quantities.hrvSDNN ?? {value: 40, unit: 'ms'}}}}, state: 'unavailable'},
      'no quantity: empty': {input: {health: raw('health', 'empty')}, state: 'empty'},
      sparse: {input: {health: raw('health', 'sparse')}, state: 'live'}
    }
  },
  {
    name: 'MovementRings',
    id: 'cardMovement',
    component: MovementRings,
    vm: 'movementRings',
    apply: (i) => updateMovementRings(health(i), fresh('health', i.health)),
    cases: {
      live: {input: {health: H, sleep: S}, state: 'live'},
      stale: {input: {health: aged('health', H)}, state: 'stale'},
      'paused (charging)': {input: {health: raw('health', 'pausedCharging')}, state: 'live'},
      'paused with no movement': {input: {health: {...PAUSED, quantities: {}}}, state: 'live'},
      empty: {input: {health: raw('health', 'empty')}, state: 'empty'},
      sparse: {input: {health: raw('health', 'sparse')}, state: 'live'}
    }
  },
  {
    name: 'Hydration',
    id: 'cardHydration',
    component: Hydration,
    vm: 'hydration',
    apply: (i) => updateHydration(health(i), fresh('health', i.health)),
    cases: {
      live: {input: {health: H}, state: 'live'},
      stale: {input: {health: aged('health', H)}, state: 'stale'},
      sparse: {input: {health: raw('health', 'sparse')}, state: 'live'},
      'zero hydration': {input: {health: raw('health', 'zeroHydration')}, state: 'live'}
    }
  },
  {
    name: 'NightSummary',
    id: 'cardSleep',
    component: NightSummary,
    vm: 'nightSummary',
    apply: (i) => {
      // Owner decision Q3: the card's freshness is the sleep export's; the
      // health export lends the score only while the shared rule calls it live.
      const healthState = exportDomainState('health', i.health, NOW).state
      updateNightSummary(adaptSleep(i.sleep, sleepScoreSource(i.health ?? null, healthState)), fresh('sleep', i.sleep))
    },
    cases: {
      live: {input: {sleep: S, health: H}, state: 'live'},
      'sleep stale': {input: {sleep: aged('sleep', S), health: H}, state: 'stale'},
      'health stale: no score': {input: {sleep: S, health: aged('health', H)}, state: 'live'},
      'health unavailable: no score': {input: {sleep: S}, state: 'live'},
      'no sleep: empty': {input: {sleep: raw('sleep', 'empty'), health: H}, state: 'empty'}
    }
  },
  {
    name: 'Workouts',
    id: 'cardWorkouts',
    component: Workouts,
    vm: 'workouts',
    apply: (i) => updateWorkouts(adaptWorkouts(i.workouts), fresh('workouts', i.workouts)),
    cases: {
      live: {input: {workouts: raw('workouts', KA)}, state: 'live'},
      stale: {input: {workouts: aged('workouts', raw('workouts', KA))}, state: 'stale'},
      empty: {input: {workouts: raw('workouts', 'empty')}, state: 'empty'}
    }
  },
  {
    name: 'DevActivityLog',
    id: 'cardDevLog',
    component: DevActivityLog,
    vm: 'devActivityLog',
    apply: (i) => updateDevActivityLog(adaptGithubEvents(i.githubEvents, NOW), fresh('githubEvents', i.githubEvents)),
    cases: {
      live: {input: {githubEvents: raw('github-events', KA)}, state: 'live'},
      stale: {input: {githubEvents: aged('githubEvents', raw('github-events', KA))}, state: 'stale'},
      // The known answer carries date-only values; these carry timestamps, so
      // each date is a <time data-relative> on both sides.
      'timestamped events': {input: {githubEvents: GITHUB_TIMESTAMPED}, state: 'live'},
      empty: {input: {githubEvents: raw('github-events', 'empty')}, state: 'empty'}
    }
  },
  {
    name: 'StarredRepoList',
    id: 'cardStarredRepos',
    component: StarredRepoList,
    vm: 'starredRepoList',
    apply: (i) => updateStarredRepos(adaptStarredRepos(i.starredRepos, NOW), fresh('starredRepos', i.starredRepos)),
    cases: {
      live: {input: {starredRepos: raw('github-starred-repos', KA)}, state: 'live'},
      stale: {input: {starredRepos: aged('starredRepos', raw('github-starred-repos', KA))}, state: 'stale'},
      empty: {input: {starredRepos: raw('github-starred-repos', 'empty')}, state: 'empty'}
    }
  },
  {
    name: 'ReadingFeed',
    id: 'cardReading',
    component: ReadingFeed,
    vm: 'readingFeed',
    apply: (i) => updateReadingFeed(adaptArticles(i.articles, NOW), fresh('articles', i.articles)),
    cases: {
      live: {input: {articles: raw('articles', KA)}, state: 'live'},
      stale: {input: {articles: aged('articles', raw('articles', KA))}, state: 'stale'},
      // The notes icon and its tooltip, and the source promoted into an empty title.
      'with notes': {input: {articles: raw('articles', 'withNotes')}, state: 'live'},
      'empty title': {input: {articles: raw('articles', 'hoodlineEmptyTitle')}, state: 'live'},
      empty: {input: {articles: raw('articles', 'empty')}, state: 'empty'}
    }
  },
  {
    name: 'Bookshelf',
    id: 'cardBooks',
    component: Bookshelf,
    vm: 'bookshelf',
    // The website binds the book dialog (BookModal) before its live data lands.
    apply: (i) => {
      if (!document.getElementById('bookDialog')) {
        document.body.insertAdjacentHTML('beforeend', '<dialog id="bookDialog"><div id="bookModal"></div></dialog>')
      }
      initBookModal()
      updateBookshelf(adaptBooks(i.books), fresh('books', i.books))
    },
    cases: {
      live: {input: {books: raw('books', KA)}, state: 'live'},
      stale: {input: {books: aged('books', raw('books', KA))}, state: 'stale'},
      'rated 0': {input: {books: BOOKS_RATED_ZERO}, state: 'live'},
      'a title with quotes, an ampersand and a tag': {input: {books: BOOKS_HOSTILE_TITLE}, state: 'live'},
      empty: {input: {books: raw('books', 'empty')}, state: 'empty'}
    }
  },
  {
    name: 'TheatreReviews',
    id: 'cardTheatreReviews',
    component: TheatreReviews,
    vm: 'theatreReviews',
    apply: (i) => updateTheatreReviews(i.theatreReviews, fresh('theatreReviews', i.theatreReviews)),
    cases: {
      live: {input: {theatreReviews: raw('theatre-reviews', KA)}, state: 'live'},
      stale: {input: {theatreReviews: aged('theatreReviews', raw('theatre-reviews', KA))}, state: 'stale'},
      empty: {input: {theatreReviews: raw('theatre-reviews', 'empty')}, state: 'empty'}
    }
  }
]

let container: AstroContainer
beforeAll(async () => {
  container = await AstroContainer.create()
})

async function serverCard(card: Card, input: Input): Promise<CardSnapshot> {
  const exports: DashboardExports = {}
  for (const [domain, data] of Object.entries(input)) {
    ;(exports as Record<string, unknown>)[domain] = {data}
  }
  const props = toDashboardViewModels(exports, NOW)[card.vm]
  const html = await container.renderToString(card.component as never, {props: {...(props as object), ...card.extra}})
  const doc = new JSDOM(`<!doctype html><body>${html}</body>`).window.document
  // The browser's load pass over the server markup (atlas decision 0164 D5).
  fillRelativeTimes(doc, NOW)
  return snapshot(doc.getElementById(card.id)!)
}

/** The browser half: the card rendered `loading`, or first filled by an earlier read (`from`). */
async function browserCard(card: Card, input: Input, from?: Input): Promise<CardSnapshot> {
  const doc = mount(await container.renderToString(card.component as never, {props: {state: 'loading', ...card.extra}}))
  if (from) {
    card.apply(from)
  }
  card.apply(input)
  // Let a bound enhancement's MutationObserver run (JS_ONLY_ATTRS).
  await new Promise((resolve) => setTimeout(resolve, 0))
  return snapshot(doc.getElementById(card.id)!)
}

function expectSame(browser: CardSnapshot, server: CardSnapshot): void {
  // Name the differing attributes first: a whole-snapshot diff truncates.
  expect({extra: browser.attrs.filter((a) => !server.attrs.includes(a)), missing: server.attrs.filter((a) => !browser.attrs.includes(a))}).toEqual({
    extra: [],
    missing: []
  })
  expect(browser).toEqual(server)
}

// covers: widget-contract#A live web widget's browser updater reaches the server's state for the same export
describe.each(CARDS)('$name: server render and browser updater agree', (card) => {
  it.each(Object.entries(card.cases))('%s', async (_name, c) => {
    const server = await serverCard(card, c.input)
    const browser = await browserCard(card, c.input)
    expect(server.state, 'the server state the case names').toBe(c.state)
    expectSame(browser, server)
  })

  // A later read over a card an earlier read filled (live → stale, live →
  // paused, live → unavailable, live → empty, stale → live, …) reaches the
  // same card as a server render of the later read alone.
  it.each(Object.entries(card.cases))('after the live case: %s', async (_name, c) => {
    const server = await serverCard(card, c.input)
    const browser = await browserCard(card, c.input, card.cases.live!.input)
    expectSame(browser, server)
  })
})

// The server renders the first page of the feed only (toReadingArticles, one
// client page) and no pager: a no-JS reader has no handler for the page
// buttons. The updater then renders the whole feed (up to 30) with the pager.
// Its first page must be the server's list, element for element.
describe('ReadingFeed: the server list is the updater first page', () => {
  async function lists(input: Input): Promise<{server: Element; browser: Element}> {
    const card = CARDS.find((c) => c.name === 'ReadingFeed')!
    const exports: DashboardExports = {articles: {data: input.articles}}
    const html = await container.renderToString(ReadingFeed, {props: toDashboardViewModels(exports, NOW).readingFeed as never})
    const server = new JSDOM(`<!doctype html><body>${html}</body>`).window.document.getElementById(card.id)!
    fillRelativeTimes(server, NOW)
    const doc = mount(await container.renderToString(ReadingFeed, {props: {state: 'loading'}}))
    card.apply(input)
    return {server, browser: doc.getElementById(card.id)!}
  }
  const list = (card: Element): Element => card.querySelector('ul.article-list')!

  it('three pages: the same first-page list, the pager on the browser only', async () => {
    const {server, browser} = await lists({articles: raw('articles', 'pagination')})
    expect(list(server).querySelectorAll('li')).toHaveLength(10)
    expect(attributeMap(list(browser))).toEqual(attributeMap(list(server)))
    expect(inlineMarkup(list(browser))).toEqual(inlineMarkup(list(server)))
    expect(visibleText(list(browser))).toEqual(visibleText(list(server)))
    expect(server.querySelector('.article-pagination')).toBeNull()
    expect([...browser.querySelectorAll('.article-page-btn')].map((b) => b.textContent)).toEqual(['1', '2', '3'])
  })

  it('three pages, then an empty read: the pager goes with the list', async () => {
    const card = CARDS.find((c) => c.name === 'ReadingFeed')!
    const empty = {articles: raw('articles', 'empty')}
    const server = await serverCard(card, empty)
    const browser = await browserCard(card, empty, {articles: raw('articles', 'pagination')})
    // The pager is a scaffold: renderWidgetEmpty empties and hides it with the list.
    const pager = document.querySelector('.article-pagination')!
    expect(pager.hasAttribute('hidden')).toBe(true)
    expect(pager.children).toHaveLength(0)
    expectSame(browser, server)
  })

  // A hostile export: the server row escapes every field and links only an
  // https URL, exactly as the updater does.
  it('a hostile article renders no markup from its fields, on either side', async () => {
    const PAYLOAD = '"><img src=x onerror="alert(1)" data-injected>'
    const base = raw('articles', KA)
    const article = (over: Record<string, unknown>) => ({...base.articles[0], ...over})
    const articles = {
      ...base,
      articles: [
        article({articleTitle: PAYLOAD, sourceTitle: PAYLOAD, articleUrl: 'javascript:alert(1)', notes: [{comment: PAYLOAD}]}),
        article({articleUrl: 'https://example.com/?q="><img src=x onerror=alert(1)>', notes: [{comment: 'a & b'}]})
      ]
    }
    const {server, browser} = await lists({articles})
    for (const card of [server, browser]) {
      expect(card.querySelectorAll('img, [onerror], [data-injected]')).toHaveLength(0)
      expect(card.querySelectorAll('a[href]')).toHaveLength(1)
      expect(card.querySelector('a[href]')!.getAttribute('href')).toBe('https://example.com/?q="><img src=x onerror=alert(1)>')
      expect(card.querySelector('.article-list-title')!.textContent).toBe(PAYLOAD)
      expect(card.querySelector('.article-list-note')!.getAttribute('title')).toBe(PAYLOAD)
    }
    expect(inlineMarkup(list(browser))).toEqual(inlineMarkup(list(server)))
  })
})
