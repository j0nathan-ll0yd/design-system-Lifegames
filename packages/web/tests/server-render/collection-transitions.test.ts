/// <reference path="../../src/astro-shim.d.ts" />
// Review M02 (adversarial review of the 0160 wave): a SUCCESSFUL empty
// collection is not an unreadable one. Every collection updater, given an
// export that was read and carries no items, must clear the previous items,
// show the widget's own empty copy and record the `empty` state, starting
// from the REAL server markup (Astro Container API) of a live card and of an
// unavailable card. The client's empty notice must equal the server's empty
// notice, element for element. A later populated export must render again
// (the empty markup replaces the list container, so the updater recreates it).
import {experimental_AstroContainer as AstroContainer} from 'astro/container'
import {JSDOM} from 'jsdom'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {afterEach, beforeAll, describe, expect, it} from 'vitest'
import Bookshelf from '../../src/widgets/reading/Bookshelf.astro'
import DevActivityLog from '../../src/widgets/github/DevActivityLog.astro'
import ReadingFeed from '../../src/widgets/reading/ReadingFeed.astro'
import StarredRepoList from '../../src/widgets/github/StarredRepoList.astro'
import TheatreReviews from '../../src/widgets/reading/TheatreReviews.astro'
import Workouts from '../../src/widgets/health/Workouts.astro'
import {adaptArticles, adaptBooks, adaptGithubEvents, adaptStarredRepos, adaptWorkouts} from '../../src/runtime/adapters'
import {updateBookshelf, updateDevActivityLog, updateReadingFeed, updateStarredRepos, updateWorkouts} from '../../src/runtime/updaters'
import {updateTheatreReviews} from '../../src/runtime/updaters-theatre'
import {type DashboardExports, type DashboardViewModels, toDashboardViewModels} from '../../src/runtime/view-models'

const GENERATED = join(__dirname, '../../../fixtures/src/generated')
const KA = 'ssrKnownAnswer'
const raw = (dir: string, v = KA): any => JSON.parse(readFileSync(join(GENERATED, dir, `${v}.json`), 'utf8'))
const NOW_ISO = '2026-03-18T12:00:00.000Z'
const NOW = Date.parse(NOW_ISO)

interface Collection {
  name: string
  component: unknown
  id: string
  vm: keyof DashboardViewModels
  domain: keyof DashboardExports
  dir: string
  /** The export's item array key. */
  items: string
  /** One element per rendered item. */
  itemSelector: string
  /** Distinctive strings of each known-answer item. */
  itemText: (data: any) => string[]
  apply: (data: any) => void
}

const COLLECTIONS: Collection[] = [
  {
    name: 'Workouts',
    component: Workouts,
    id: 'cardWorkouts',
    vm: 'workouts',
    domain: 'workouts',
    dir: 'workouts',
    items: 'workouts',
    itemSelector: '.workout-sub-card',
    itemText: (d) => d.workouts.map((w: any) => w.activityType),
    apply: (d) => updateWorkouts(adaptWorkouts(d))
  },
  {
    name: 'DevActivityLog',
    component: DevActivityLog,
    id: 'cardDevLog',
    vm: 'devActivityLog',
    domain: 'githubEvents',
    dir: 'github-events',
    items: 'events',
    itemSelector: '.gh-dal-line',
    itemText: (d) => d.events.map((e: any) => e.title),
    apply: (d) => updateDevActivityLog(adaptGithubEvents(d, NOW))
  },
  {
    name: 'StarredRepoList',
    component: StarredRepoList,
    id: 'cardStarredRepos',
    vm: 'starredRepoList',
    domain: 'starredRepos',
    dir: 'github-starred-repos',
    items: 'repos',
    itemSelector: '.gh-sl-row',
    itemText: (d) => d.repos.map((r: any) => r.name),
    apply: (d) => updateStarredRepos(adaptStarredRepos(d, NOW))
  },
  {
    name: 'ReadingFeed',
    component: ReadingFeed,
    id: 'cardReading',
    vm: 'readingFeed',
    domain: 'articles',
    dir: 'articles',
    items: 'articles',
    itemSelector: '.article-list-item',
    itemText: (d) => d.articles.map((a: any) => a.articleTitle),
    apply: (d) => updateReadingFeed(adaptArticles(d, NOW))
  },
  {
    name: 'Bookshelf',
    component: Bookshelf,
    id: 'cardBooks',
    vm: 'bookshelf',
    domain: 'books',
    dir: 'books',
    items: 'books',
    itemSelector: '.shelf-book',
    itemText: (d) => d.books.map((b: any) => b.title),
    apply: (d) => updateBookshelf(adaptBooks(d))
  },
  {
    name: 'TheatreReviews',
    component: TheatreReviews,
    id: 'cardTheatreReviews',
    vm: 'theatreReviews',
    domain: 'theatreReviews',
    dir: 'theatre-reviews',
    items: 'reviews',
    itemSelector: '.theatre-card',
    itemText: (d) => d.reviews.map((r: any) => r.title),
    apply: (d) => updateTheatreReviews(d)
  }
]

let container: AstroContainer
beforeAll(async () => {
  container = await AstroContainer.create()
})

async function serverHtml(c: Collection, exports: DashboardExports, state?: 'unavailable'): Promise<string> {
  const vm = toDashboardViewModels(exports, NOW_ISO)[c.vm] as unknown as Record<string, unknown>
  return container.renderToString(c.component as any, {props: state ? {state} : vm})
}

const known = (c: Collection) => raw(c.dir)
const emptied = (c: Collection) => ({...known(c), [c.items]: []})

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

// An element as a canonical string: tag, sorted attributes (the dev-only
// data-astro-* annotations dropped) and children, with whitespace-only text
// dropped and other text collapsed. Server and client markup differ in
// formatting only, never in this form.
function canonical(n: Node): string {
  if (n.nodeType === 3) {
    return (n.textContent ?? '').replace(/\s+/g, ' ').trim()
  }
  if (n.nodeType !== 1) {
    return ''
  }
  const el = n as Element
  const attrs = [...el.attributes].filter((a) => !a.name.startsWith('data-astro-')).map((a) => `${a.name}="${a.value}"`).sort()
  const children = [...el.childNodes].map(canonical).filter(Boolean)
  return `<${el.tagName.toLowerCase()} ${attrs.join(' ')}>${children.join('')}</${el.tagName.toLowerCase()}>`
}

/** The server's own empty notice for this widget. */
async function serverEmptyNotice(c: Collection): Promise<string> {
  const html = await serverHtml(c, {[c.domain]: {data: emptied(c)}})
  const doc = new JSDOM(html).window.document
  expect(doc.getElementById(c.id)?.getAttribute('data-ssr-state'), `${c.name}: the server renders the emptied export as empty`).toBe('empty')
  const notice = doc.querySelector('[data-state-notice="empty"]')
  expect(notice, `${c.name}: the server renders an empty notice`).not.toBeNull()
  return canonical(notice!)
}

function expectHonestEmpty(doc: Document, c: Collection, serverNotice: string): void {
  const card = doc.getElementById(c.id)!
  expect(card.getAttribute('data-ssr-state'), 'state').toBe('empty')
  expect(card.hasAttribute('data-generated-at'), 'no data timestamp').toBe(false)
  expect(card.classList.contains('is-loading'), 'no skeleton').toBe(false)
  expect(card.querySelectorAll(c.itemSelector).length, 'no previous item').toBe(0)
  for (const text of c.itemText(known(c))) {
    expect(card.textContent, `previous item "${text}"`).not.toContain(text)
  }
  expect(card.querySelector('[data-state-notice="unavailable"]'), 'no unavailable notice').toBeNull()
  const notices = [...card.querySelectorAll('[data-state-notice="empty"]')]
  expect(notices.length, 'one empty notice').toBe(1)
  expect(canonical(notices[0]!)).toBe(serverNotice)
}

// covers: widget-contract#A live web widget renders real data or an honest state in its server markup
describe.each(COLLECTIONS)('$name: a successful empty export', (c) => {
  it('live -> empty: clears the previous items and shows the server empty notice', async () => {
    const notice = await serverEmptyNotice(c)
    const doc = mount(await serverHtml(c, {[c.domain]: {data: known(c)}}))
    expect(doc.getElementById(c.id)?.getAttribute('data-ssr-state')).toBe('live')
    expect(doc.querySelectorAll(c.itemSelector).length, 'control: the live card shows items').toBe(known(c)[c.items].length)
    c.apply(emptied(c))
    expectHonestEmpty(doc, c, notice)
  })

  it('unavailable -> empty: the first successful result is empty', async () => {
    const notice = await serverEmptyNotice(c)
    const doc = mount(await serverHtml(c, {}, 'unavailable'))
    expect(doc.getElementById(c.id)?.getAttribute('data-ssr-state')).toBe('unavailable')
    c.apply(emptied(c))
    expectHonestEmpty(doc, c, notice)
  })

  it('unavailable -> live -> empty -> live: each step renders its own state, items included', async () => {
    const notice = await serverEmptyNotice(c)
    const doc = mount(await serverHtml(c, {}, 'unavailable'))
    const count = known(c)[c.items].length
    c.apply(known(c))
    expect(doc.getElementById(c.id)?.getAttribute('data-ssr-state')).toBe('live')
    expect(doc.querySelectorAll(c.itemSelector).length).toBe(count)
    c.apply(emptied(c))
    expectHonestEmpty(doc, c, notice)
    c.apply(known(c))
    expect(doc.getElementById(c.id)?.getAttribute('data-ssr-state')).toBe('live')
    expect(doc.querySelectorAll(c.itemSelector).length, 'items render again after empty').toBe(count)
    expect(doc.querySelector('[data-state-notice]'), 'no notice left behind').toBeNull()
  })
})

describe('an unreadable result is not an empty one', () => {
  it('Workouts: null leaves the card as it is', async () => {
    const c = COLLECTIONS[0]!
    const doc = mount(await serverHtml(c, {[c.domain]: {data: known(c)}}))
    const before = doc.body.innerHTML
    updateWorkouts(null)
    expect(doc.body.innerHTML).toBe(before)
  })
})
