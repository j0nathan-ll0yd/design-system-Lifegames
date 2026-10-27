/// <reference path="../../src/astro-shim.d.ts" />
// Every Bookshelf tile is a real link to its book (atlas decision 0160 D5,
// shipped by the 0157 re-review), in the accessible card pattern: the link
// wraps only the title text, which names it, and CSS stretches its hit area
// over the tile. A crawler or a visitor without JavaScript reads the server
// markup, so the link must be there before any script runs; the book dialog
// is an enhancement on top of it.
//
// The website splices the server fragment only when its fragment policy
// admits every element and attribute, so the link stays narrow: one `<a>`
// with exactly `class`, `href`, `target` and `rel`, and the `href` is the same
// string the `data-book` payload carries. `aria-haspopup` is the dialog
// enhancement's alone: the server markup never carries it, because without
// JavaScript the link navigates.
//
// The browser half: `updateBookshelf` patches tiles in place when the book
// count holds, so a changed book must move its link's href and title too.
import {experimental_AstroContainer as AstroContainer} from 'astro/container'
import {JSDOM} from 'jsdom'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {afterEach, beforeAll, describe, expect, it} from 'vitest'
import Bookshelf from '../../src/widgets/reading/Bookshelf.astro'
import {adaptBooks, amazonBookUrl} from '../../src/runtime/adapters'
import {initBookModal} from '../../src/runtime/book-modal-init'
import {updateBookshelf} from '../../src/runtime/updaters'
import {toDashboardViewModels} from '../../src/runtime/view-models'

const GENERATED = join(__dirname, '../../../fixtures/src/generated')
const KNOWN = JSON.parse(readFileSync(join(GENERATED, 'books', 'ssrKnownAnswer.json'), 'utf8'))
const NOW_ISO = '2026-03-18T12:00:00.000Z'

const LINK_ATTRIBUTES = ['class', 'href', 'rel', 'target']
const LINK_REL = 'sponsored noopener noreferrer'
// The template's and the updater's tile order.
const STATUS_ORDER: Record<string, number> = {reading: 0, upNext: 1, finished: 2}

let container: AstroContainer
beforeAll(async () => {
  container = await AstroContainer.create()
})

async function serverHtml(books: any): Promise<string> {
  const vm = toDashboardViewModels({books: {data: books}}, NOW_ISO).bookshelf
  return container.renderToString(Bookshelf as any, {props: vm as unknown as Record<string, unknown>})
}

const GLOBALS = ['window', 'document', 'HTMLElement', 'Element', 'Node', 'requestAnimationFrame', 'MutationObserver'] as const
function mount(html: string): Document {
  const dom = new JSDOM(`<!doctype html><body>${html}<dialog id="bookDialog"><div id="bookModal"></div></dialog></body>`, {pretendToBeVisual: true})
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

/** Lets a MutationObserver callback run. */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

const ownAttributes = (el: Element): string[] => [...el.attributes].map((a) => a.name).filter((n) => !n.startsWith('data-astro-')).sort()

/**
 * Asserts each tile carries exactly one narrow link, inside its title, to its
 * own book; the link's text is the title; the cover is decorative; the tile
 * itself takes no focus and carries no label. With `haspopup`, the link also
 * carries the dialog enhancement's `aria-haspopup="dialog"`, and nothing else.
 */
function expectTileLinks(doc: Document, books: Array<{asin: string; title: string; author: string}>, haspopup: boolean): void {
  const tiles = [...doc.querySelectorAll('li.shelf-book')]
  expect(tiles.length, 'one tile per book').toBe(books.length)
  tiles.forEach((tile, i) => {
    const book = books[i]!
    const links = tile.querySelectorAll('a')
    expect(links.length, `tile ${i}: exactly one link`).toBe(1)
    const link = links[0]!
    expect(link.classList.value, `tile ${i}: the one new class`).toBe('shelf-book-link')
    expect(ownAttributes(link), `tile ${i}: no other attribute`).toEqual(haspopup ? ['aria-haspopup', ...LINK_ATTRIBUTES] : LINK_ATTRIBUTES)
    if (haspopup) {
      expect(link.getAttribute('aria-haspopup'), `tile ${i}: the dialog enhancement`).toBe('dialog')
    }
    expect(link.getAttribute('href'), `tile ${i}: href`).toBe(amazonBookUrl(book.asin))
    expect(link.getAttribute('href'), `tile ${i}: href is the payload's link`).toBe(JSON.parse(tile.getAttribute('data-book')!).link)
    expect(link.getAttribute('target'), `tile ${i}: target`).toBe('_blank')
    expect(link.getAttribute('rel'), `tile ${i}: rel`).toBe(LINK_REL)
    // The link wraps the title text only, and that text names it.
    expect(link.parentElement?.classList.contains('shelf-book-title'), `tile ${i}: the link sits in the title`).toBe(true)
    expect(link.textContent?.trim(), `tile ${i}: the link's text is the title`).toBe(book.title)
    expect(link.querySelector('img, .shelf-book-author, .shelf-book-status'), `tile ${i}: only the title is inside the link`).toBeNull()
    // The cover is decorative: the title in the same tile names the book.
    const imgs = [...tile.querySelectorAll('img')]
    expect(imgs.length, `tile ${i}: a cover`).toBeGreaterThan(0)
    imgs.forEach((img) => expect(img.getAttribute('alt'), `tile ${i}: decorative cover`).toBe(''))
    // The author reads as the tile's own content, outside the link.
    expect(tile.querySelector('.shelf-book-author')?.textContent?.trim(), `tile ${i}: author`).toBe(book.author)
    // The link is natively focusable and named by its text; the tile carries neither.
    expect(tile.hasAttribute('tabindex'), `tile ${i}: no tabindex`).toBe(false)
    expect(tile.hasAttribute('aria-label'), `tile ${i}: no label on the tile`).toBe(false)
    expect(tile.hasAttribute('data-book'), `tile ${i}: the payload stays on the tile`).toBe(true)
  })
  expect(doc.querySelector('.shelf-row [aria-label]'), 'no label anywhere on the shelf').toBeNull()
}

// covers: widget-contract#A live web widget renders real data or an honest state in its server markup
describe('Bookshelf server markup: every tile is a real link', () => {
  it('each tile has exactly one narrow title link to its book, and nothing says it opens a dialog', async () => {
    const html = await serverHtml(KNOWN)
    expect(html, 'no aria-haspopup in the server markup').not.toContain('aria-haspopup')
    expectTileLinks(new JSDOM(html).window.document, KNOWN.books, false)
  })

  it('the stale state keeps the links', async () => {
    const stale = {...KNOWN, generatedAt: '2020-01-01T00:00:00.000Z'}
    const html = await serverHtml(stale)
    const doc = new JSDOM(html).window.document
    expect(doc.getElementById('cardBooks')?.getAttribute('data-ssr-state')).toBe('stale')
    expect(html).not.toContain('aria-haspopup')
    expectTileLinks(doc, KNOWN.books, false)
  })
})

// covers: widget-contract#A live web widget's browser updater reaches the server's state for the same export
describe('updateBookshelf: the links follow the books', () => {
  // The same count, other books: the updater patches the server tiles in place.
  const CHANGED = {
    ...KNOWN,
    books: KNOWN.books.map((b: any, i: number) => ({...b, asin: `KA7731NEW${i}`, title: `Changed Title ${i}`, author: `Changed Author ${i}`}))
  }

  it('an in-place patch moves each link to the new book', async () => {
    const doc = mount(await serverHtml(KNOWN))
    const before = [...doc.querySelectorAll('.shelf-book-link')]
    updateBookshelf(adaptBooks(CHANGED))
    // Control: the patch path ran (the same elements), not a rebuild.
    const after = [...doc.querySelectorAll('.shelf-book-link')]
    expect(after.length).toBe(before.length)
    after.forEach((el, i) => expect(el, `link ${i} is the same element`).toBe(before[i]))
    expectTileLinks(doc, CHANGED.books, false)
  })

  it('a rebuild (a new book count) writes the same narrow links', async () => {
    const doc = mount(await serverHtml(KNOWN))
    const ONE = {...KNOWN, books: KNOWN.books.slice(0, 1)}
    updateBookshelf(adaptBooks(ONE))
    expectTileLinks(doc, ONE.books, false)
  })
})

describe('the dialog enhancement marks the links it takes over', () => {
  it('binding the dialog marks every server-rendered link', async () => {
    const doc = mount(await serverHtml(KNOWN))
    expect(doc.querySelector('[aria-haspopup]'), 'control: none before the enhancement binds').toBeNull()
    initBookModal()
    expectTileLinks(doc, KNOWN.books, true)
  })

  it('a tile updateBookshelf adds later is marked too', async () => {
    const doc = mount(await serverHtml(KNOWN))
    initBookModal()
    const MORE = {...KNOWN, books: [...KNOWN.books, {...KNOWN.books[1], asin: 'KA7731ADD1', title: 'Added Title', author: 'Added Author'}]}
    updateBookshelf(adaptBooks(MORE))
    await settle()
    const shown = MORE.books.slice().sort((a: any, b: any) => STATUS_ORDER[a.status]! - STATUS_ORDER[b.status]!)
    expectTileLinks(doc, shown, true)
  })

  it('an in-place patch keeps the mark', async () => {
    const doc = mount(await serverHtml(KNOWN))
    initBookModal()
    const CHANGED = {...KNOWN, books: KNOWN.books.map((b: any) => ({...b, asin: `${b.asin}X`}))}
    updateBookshelf(adaptBooks(CHANGED))
    await settle()
    expectTileLinks(doc, CHANGED.books, true)
  })

  it('a card the updater fills from empty is marked too', async () => {
    const doc = mount(await serverHtml({...KNOWN, books: []}))
    initBookModal()
    updateBookshelf(adaptBooks(KNOWN))
    await settle()
    expectTileLinks(doc, KNOWN.books, true)
  })
})
