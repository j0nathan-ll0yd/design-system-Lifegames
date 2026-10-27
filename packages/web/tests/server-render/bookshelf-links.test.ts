/// <reference path="../../src/astro-shim.d.ts" />
// Every Bookshelf tile is a real link to its book (atlas decision 0160 D5,
// shipped by the 0157 re-review). A crawler or a visitor without JavaScript
// reads the server markup, so the link must be there before any script runs;
// the book dialog is an enhancement on top of it.
//
// The website splices the server fragment only when its fragment policy
// admits every element and attribute, so the link stays narrow: one `<a>`
// with exactly `class`, `href`, `target`, `rel` and `aria-label`, and the
// `href` is the same string the `data-book` payload carries.
//
// The browser half: `updateBookshelf` patches tiles in place when the book
// count holds, so a changed book must move its link's href and label too.
import {experimental_AstroContainer as AstroContainer} from 'astro/container'
import {JSDOM} from 'jsdom'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {a11y} from '@j0nathan-ll0yd/copy'
import {afterEach, beforeAll, describe, expect, it} from 'vitest'
import Bookshelf from '../../src/widgets/reading/Bookshelf.astro'
import {adaptBooks, amazonBookUrl} from '../../src/runtime/adapters'
import {updateBookshelf} from '../../src/runtime/updaters'
import {toDashboardViewModels} from '../../src/runtime/view-models'

const GENERATED = join(__dirname, '../../../fixtures/src/generated')
const KNOWN = JSON.parse(readFileSync(join(GENERATED, 'books', 'ssrKnownAnswer.json'), 'utf8'))
const NOW_ISO = '2026-03-18T12:00:00.000Z'

const LINK_ATTRIBUTES = ['aria-label', 'class', 'href', 'rel', 'target']
const LINK_REL = 'sponsored noopener noreferrer'

let container: AstroContainer
beforeAll(async () => {
  container = await AstroContainer.create()
})

async function serverHtml(books: any): Promise<string> {
  const vm = toDashboardViewModels({books: {data: books}}, NOW_ISO).bookshelf
  return container.renderToString(Bookshelf as any, {props: vm as unknown as Record<string, unknown>})
}

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

const label = (b: {title: string; author: string}): string => a11y.bookshelf.bookItem.replace('{title}', b.title).replace('{author}', b.author)

/** Asserts each tile carries exactly one narrow link to its own book, and the tile itself takes no focus. */
function expectTileLinks(doc: Document, books: Array<{asin: string; title: string; author: string}>): void {
  const tiles = [...doc.querySelectorAll('li.shelf-book')]
  expect(tiles.length, 'one tile per book').toBe(books.length)
  tiles.forEach((tile, i) => {
    const book = books[i]!
    const links = tile.querySelectorAll('a')
    expect(links.length, `tile ${i}: exactly one link`).toBe(1)
    const link = links[0]!
    expect(link.classList.value, `tile ${i}: the one new class`).toBe('shelf-book-link')
    expect([...link.attributes].map((a) => a.name).filter((n) => !n.startsWith('data-astro-')).sort(), `tile ${i}: no other attribute`).toEqual(
      LINK_ATTRIBUTES
    )
    expect(link.getAttribute('href'), `tile ${i}: href`).toBe(amazonBookUrl(book.asin))
    expect(link.getAttribute('href'), `tile ${i}: href is the payload's link`).toBe(JSON.parse(tile.getAttribute('data-book')!).link)
    expect(link.getAttribute('target'), `tile ${i}: target`).toBe('_blank')
    expect(link.getAttribute('rel'), `tile ${i}: rel`).toBe(LINK_REL)
    expect(link.getAttribute('aria-label'), `tile ${i}: label`).toBe(label(book))
    // The link wraps the tile's content: the cover and the title.
    expect(link.querySelector('.shelf-cover-wrapper img'), `tile ${i}: the cover is inside the link`).not.toBeNull()
    expect(link.querySelector('.shelf-book-title')?.textContent?.trim(), `tile ${i}: the title is inside the link`).toBe(book.title)
    // The link is natively focusable and carries the name; the tile carries neither.
    expect(tile.hasAttribute('tabindex'), `tile ${i}: no tabindex`).toBe(false)
    expect(tile.hasAttribute('aria-label'), `tile ${i}: no label on the tile`).toBe(false)
    expect(tile.hasAttribute('data-book'), `tile ${i}: the payload stays on the tile`).toBe(true)
  })
}

// covers: widget-contract#A live web widget renders real data or an honest state in its server markup
describe('Bookshelf server markup: every tile is a real link', () => {
  it('each tile has exactly one narrow link to its book, and the tile takes no focus', async () => {
    const doc = new JSDOM(await serverHtml(KNOWN)).window.document
    expectTileLinks(doc, KNOWN.books)
  })

  it('the stale state keeps the links', async () => {
    const stale = {...KNOWN, generatedAt: '2020-01-01T00:00:00.000Z'}
    const doc = new JSDOM(await serverHtml(stale)).window.document
    expect(doc.getElementById('cardBooks')?.getAttribute('data-ssr-state')).toBe('stale')
    expectTileLinks(doc, KNOWN.books)
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
    expectTileLinks(doc, CHANGED.books)
  })

  it('an in-place patch reaches the server markup of the new books', async () => {
    const doc = mount(await serverHtml(KNOWN))
    updateBookshelf(adaptBooks(CHANGED))
    const server = new JSDOM(await serverHtml(CHANGED)).window.document
    const attrs = (d: Document) => [...d.querySelectorAll('.shelf-book-link')].map((a) => LINK_ATTRIBUTES.map((n) => `${n}=${a.getAttribute(n)}`).join(' '))
    expect(attrs(doc)).toEqual(attrs(server))
  })

  it('a rebuild (a new book count) writes the same narrow links', async () => {
    const doc = mount(await serverHtml(KNOWN))
    const ONE = {...KNOWN, books: KNOWN.books.slice(0, 1)}
    updateBookshelf(adaptBooks(ONE))
    expectTileLinks(doc, ONE.books)
  })
})
