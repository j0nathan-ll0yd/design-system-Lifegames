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
// The two must agree on `data-ssr-state`, `data-generated-at`, the paused and
// loading classes, every visible text node, and every attribute of the
// elements a reader or a stylesheet keys on (attributeMap). "Visible" models the
// package's CSS: no `hidden` subtree, no skeleton, no <noscript>, and under
// `.is-paused` the paused block instead of the value scaffold.
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
}

// Attributes that differ by design, not by rendering: Astro's dev-only source
// markers, the client's "already written" flag, and the server's initial ECG
// parameters (the browser hands them to the canvas through __ecgUpdate).
const IGNORED_ATTR = /^(data-astro-|data-live-updated$|data-bpm$|data-hrv$|data-stroke$)/

// A style attribute serialized by CSSOM, then sorted by declaration: the
// browser writes styles through CSSOM (hex becomes rgb()), the server as text.
const STYLE_PARSER = new JSDOM('<!doctype html><div></div>').window.document.querySelector('div') as HTMLElement
function normalizeStyle(value: string): string {
  STYLE_PARSER.style.cssText = value
  return STYLE_PARSER.style.cssText.split(';').map((d: string) => d.trim()).filter(Boolean).sort().join('; ')
}

/**
 * Every attribute of every element a reader or a stylesheet keys on: the
 * card root, each element with an id, the dots, the ring group, the bands
 * and the images. Inline styles cover ring offsets, fills, bars and the sun dot.
 */
function attributeMap(card: Element): string[] {
  const out: string[] = []
  const els = [card, ...card.querySelectorAll('[id], .live-dot, [role="img"], .hydra-range, img, source, time')]
  els.forEach((el, i) => {
    const key = `${i}:${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}`
    for (const a of [...el.attributes].sort((x, y) => x.name.localeCompare(y.name))) {
      if (!IGNORED_ATTR.test(a.name)) {
        // Class order carries no meaning; style serialization differs by writer.
        const value = a.name === 'style' ? normalizeStyle(a.value) : a.name === 'class' ? a.value.split(/\s+/).filter(Boolean).sort().join(' ') : a.value
        out.push(`${key} ${a.name}=${value}`)
      }
    }
  })
  return out
}

function snapshot(card: Element): CardSnapshot {
  return {
    state: card.getAttribute('data-ssr-state'),
    generatedAt: card.getAttribute('data-generated-at'),
    paused: card.classList.contains('is-paused'),
    loading: card.classList.contains('is-loading'),
    text: visibleText(card),
    attrs: attributeMap(card)
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
const S = raw('sleep', KA)
const PAUSED = raw('health', 'pausedHrGap')
const {heartRate: _hr, heartRateVariabilitySDNN: _hrv, ...PAUSED_NO_HR} = PAUSED.quantities

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
      empty: {input: {articles: raw('articles', 'empty')}, state: 'empty'}
    }
  },
  {
    name: 'Bookshelf',
    id: 'cardBooks',
    component: Bookshelf,
    vm: 'bookshelf',
    apply: (i) => updateBookshelf(adaptBooks(i.books), fresh('books', i.books)),
    cases: {
      live: {input: {books: raw('books', KA)}, state: 'live'},
      stale: {input: {books: aged('books', raw('books', KA))}, state: 'stale'},
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
  return snapshot(doc.getElementById(card.id)!)
}

/** The browser half: the card rendered `loading`, or first filled by an earlier read (`from`). */
async function browserCard(card: Card, input: Input, from?: Input): Promise<CardSnapshot> {
  const doc = mount(await container.renderToString(card.component as never, {props: {state: 'loading', ...card.extra}}))
  if (from) {
    card.apply(from)
  }
  card.apply(input)
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
