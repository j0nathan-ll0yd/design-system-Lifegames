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

  it('a tile without its link takes the rebuild, so no tile is left without one', async () => {
    const doc = mount(await serverHtml(KNOWN))
    // Markup from another writer: the first tile's title has no link.
    const first = doc.querySelector('.shelf-book-link')!
    first.replaceWith(...first.childNodes)
    expect(doc.querySelectorAll('.shelf-book-link').length, 'control: one tile lost its link').toBe(KNOWN.books.length - 1)
    const untouched = doc.querySelectorAll('.shelf-book')[1]
    updateBookshelf(adaptBooks(KNOWN))
    expect(doc.querySelectorAll('.shelf-book')[1], 'the rebuild path ran (new tiles)').not.toBe(untouched)
    expectTileLinks(doc, KNOWN.books, false)
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

describe('closing the dialog after a live update keeps the reader in place', () => {
  // The website's sequence: the dialog is open on a book while live data
  // rewrites the shelf; Escape then closes the dialog.
  // Three books, in the template's order: reading, then two finished.
  const THREE = {...KNOWN, books: [...KNOWN.books, {...KNOWN.books[1], asin: 'KA7731KAP3', title: 'Known Answer Third Kappa-7731', author: 'Third Author'}]}

  async function openOn(books: any, tile: number): Promise<{doc: Document; dialog: HTMLDialogElement; href: string}> {
    const doc = mount(await serverHtml(books))
    const win = doc.defaultView as unknown as Window
    // jsdom has no top layer and no matchMedia: open and close only toggle `open`; reduced motion closes at once.
    const dialog = doc.getElementById('bookDialog') as HTMLDialogElement
    dialog.showModal = () => dialog.setAttribute('open', '')
    dialog.close = () => dialog.removeAttribute('open')
    win.matchMedia = ((query: string) => ({matches: query.includes('reduce'), media: query})) as unknown as typeof win.matchMedia
    initBookModal()
    const link = doc.querySelectorAll<HTMLAnchorElement>('.shelf-book-link')[tile]!
    link.dispatchEvent(new win.MouseEvent('click', {bubbles: true, cancelable: true, button: 0}))
    expect(dialog.open, 'control: the dialog opened').toBe(true)
    return {doc, dialog, href: link.getAttribute('href')!}
  }
  const escape = (dialog: HTMLDialogElement): void => {
    dialog.dispatchEvent(new (dialog.ownerDocument.defaultView as unknown as Window).Event('cancel', {cancelable: true}))
    expect(dialog.open).toBe(false)
  }
  const without = (books: any, href: string) => ({...books, books: books.books.filter((b: any) => amazonBookUrl(b.asin) !== href)})

  it('step 1, in-place reorder: focus returns to the same book, not to the tile that now shows another', async () => {
    const {doc, dialog, href} = await openOn(KNOWN, 0)
    const firstTile = doc.querySelector('.shelf-book')!
    // Same count, statuses swapped: the patch path moves the other book into the first tile.
    const SWAPPED = {...KNOWN, books: KNOWN.books.map((b: any) => ({...b, status: b.status === 'reading' ? 'finished' : 'reading'}))}
    updateBookshelf(adaptBooks(SWAPPED))
    expect(doc.querySelector('.shelf-book'), 'control: the patch path ran').toBe(firstTile)
    expect(firstTile.querySelector('.shelf-book-link')!.getAttribute('href'), 'control: the first tile now shows another book').not.toBe(href)
    escape(dialog)
    expect(doc.activeElement?.getAttribute('href')).toBe(href)
  })

  it("step 2, in-place swap that removes the open book: focus lands on the trigger tile's link", async () => {
    const {doc, dialog, href} = await openOn(THREE, 1)
    const tiles = [...doc.querySelectorAll('.shelf-book')]
    // Same count: the open book is replaced, so the patch path keeps every tile.
    const REPLACED = {...THREE, books: THREE.books.map((b: any) => (amazonBookUrl(b.asin) === href ? {...b, asin: 'KA7731SWAP', title: 'Swapped In'} : b))}
    updateBookshelf(adaptBooks(REPLACED))
    expect([...doc.querySelectorAll('.shelf-book')], 'control: the patch path ran').toEqual(tiles)
    expect(doc.querySelector(`.shelf-book-link[href="${href}"]`), 'control: the open book left the shelf').toBeNull()
    escape(dialog)
    expect(doc.activeElement).toBe(tiles[1]!.querySelector('.shelf-book-link'))
  })

  it.each([
    ['book 2', 1, 1],
    ['book 3', 2, 1]
  ])('step 2, 3 books to 2 with the dialog on %s (rebuild): focus lands on the link at the clamped place', async (_name, tile, expected) => {
    const {doc, dialog, href} = await openOn(THREE, tile)
    const before = doc.querySelector('.shelf-book')
    updateBookshelf(adaptBooks(without(THREE, href)))
    expect(doc.querySelector('.shelf-book'), 'control: the rebuild path ran').not.toBe(before)
    escape(dialog)
    expect(doc.activeElement).toBe(doc.querySelectorAll('.shelf-book-link')[expected])
  })

  it('steps 3 and 4, an empty shelf: focus skips hidden elements and lands on the card heading, never the body or a tile', async () => {
    const {doc, dialog} = await openOn(KNOWN, 0)
    updateBookshelf(adaptBooks({...KNOWN, books: []}))
    expect(doc.querySelectorAll('.shelf-book-link').length, 'control: no book is left').toBe(0)
    // Focusable but not rendered: focus() on either would leave focus on <body>.
    const header = doc.querySelector('#cardBooks .widget-header-right')!
    // Every decoy takes focus by markup, and none may receive it: hidden, inside
    // display: none, visibility: hidden, inside inert, inside aria-hidden.
    header.insertAdjacentHTML('beforeend',
      '<button hidden>hidden</button><span style="display: none"><a href="/x">inside hidden</a></span>' +
        '<button style="visibility: hidden">invisible</button><span inert><button>inside inert</button></span>' +
        '<span aria-hidden="true"><button>inside aria-hidden</button></span>')
    escape(dialog)
    expect(doc.activeElement).not.toBe(doc.body)
    expect(doc.activeElement?.closest('li')).toBeNull()
    expect(doc.activeElement?.classList.contains('widget-label'), 'the card heading').toBe(true)
    const heading = doc.activeElement as HTMLElement
    expect(heading.getAttribute('tabindex'), 'focusable from script only').toBe('-1')
    // Once focus moves on, the heading is back to its server markup.
    heading.blur()
    expect(heading.hasAttribute('tabindex'), 'the script-added tabindex is gone').toBe(false)
  })

  it('step 3: a rendered element on the card that already takes focus comes before the heading', async () => {
    const {doc, dialog} = await openOn(KNOWN, 0)
    updateBookshelf(adaptBooks({...KNOWN, books: []}))
    doc.querySelector('#cardBooks .widget-header-right')!.insertAdjacentHTML('beforeend',
      '<button hidden>hidden</button><button class="probe">shown</button>')
    escape(dialog)
    expect(doc.activeElement?.classList.contains('probe')).toBe(true)
  })
})
