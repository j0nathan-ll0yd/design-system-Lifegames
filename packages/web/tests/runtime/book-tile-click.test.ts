// @vitest-environment jsdom
// Each Bookshelf tile is a real link to the book on Amazon; the dialog is an
// enhancement. A plain primary click opens the dialog and keeps the link from
// navigating. Every other click (a modifier held, or another button) keeps
// the browser's default, so the visitor still reaches Amazon in a new tab.
// The showcase island applies the same rule to its `book-clicked` event.
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {initBookModal} from '../../src/runtime/book-modal-init'
import {initBookshelf} from '../../src/runtime/bookshelf-init'
import type {BookshelfProps} from '../../src/widgets/reading/Bookshelf.types'

const BOOK = {title: 'Known Title', author: 'Known Author', asin: 'KA0000001', status: 'finished', link: 'https://www.amazon.com/dp/KA0000001'}

// The template's tile: the title is the link; CSS stretches its hit area over
// the tile, so a click anywhere on the tile targets the link.
const TILE = `<ul class="shelf-row"><li class="shelf-book" data-book='${JSON.stringify(BOOK)}'>` +
  '<div class="shelf-cover-wrapper"><img alt=""></div>' +
  `<div class="shelf-book-title"><a class="shelf-book-link" href="${BOOK.link}" target="_blank" rel="sponsored noopener noreferrer"><span>Known Title</span></a></div>` +
  '<div class="shelf-book-author">Known Author</div></li></ul>'

/** Dispatches a cancelable click on the tile's link; returns whether the default (navigation) was prevented. */
function clickTile(init: MouseEventInit = {}): boolean {
  const link = document.querySelector('.shelf-book-link')!
  const event = new MouseEvent('click', {bubbles: true, cancelable: true, button: 0, ...init})
  link.dispatchEvent(event)
  return event.defaultPrevented
}

const MODIFIED: Array<[string, MouseEventInit]> = [
  ['a meta-click', {metaKey: true}],
  ['a ctrl-click', {ctrlKey: true}],
  ['a shift-click', {shiftKey: true}],
  ['an alt-click', {altKey: true}],
  ['a middle click', {button: 1}]
]

describe('book modal: the tile link and the dialog', () => {
  let dialog: HTMLDialogElement
  const matchMedia = window.matchMedia

  afterEach(() => {
    window.matchMedia = matchMedia
  })

  beforeEach(() => {
    document.body.innerHTML = '<dialog id="bookDialog"><div id="bookModal"></div></dialog>' + `<div id="cardBooks">${TILE}</div>`
    dialog = document.getElementById('bookDialog') as HTMLDialogElement
    // jsdom has no top layer: showModal and close only toggle `open`.
    dialog.showModal = () => dialog.setAttribute('open', '')
    dialog.close = () => dialog.removeAttribute('open')
    window.matchMedia = ((query: string) => ({matches: query.includes('reduce'), media: query})) as unknown as typeof window.matchMedia
    initBookModal()
  })

  it('a plain click opens the dialog and prevents the navigation', () => {
    expect(clickTile()).toBe(true)
    expect(dialog.open).toBe(true)
    expect(document.querySelector('#bookModal')!.textContent).toContain('Known Title')
    expect(document.querySelector('.shelf-book-link')!.getAttribute('aria-haspopup'), 'the bound dialog marks the link').toBe('dialog')
  })

  // The click a browser fires for Enter on a link. The key press itself is
  // proved in a real engine (tests/browser/book-tile.browser.test.ts).
  it('a keyboard-style click (detail 0) on the link opens the dialog', () => {
    const link = document.querySelector<HTMLAnchorElement>('.shelf-book-link')!
    const event = new MouseEvent('click', {bubbles: true, cancelable: true, button: 0, detail: 0})
    link.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(dialog.open).toBe(true)
  })

  it.each(MODIFIED)('%s neither opens the dialog nor prevents the navigation', (_name, init) => {
    expect(clickTile(init)).toBe(false)
    expect(dialog.open).toBe(false)
  })

  it('closing the dialog returns focus to the link, not the tile', () => {
    const link = document.querySelector<HTMLAnchorElement>('.shelf-book-link')!
    clickTile()
    // Escape: the cancel event drives the close; reduced motion closes at once.
    dialog.dispatchEvent(new Event('cancel', {cancelable: true}))
    expect(dialog.open).toBe(false)
    expect(document.activeElement).toBe(link)
  })

  it('tiles rebuilt while the dialog was open: focus returns to the new link for the same book', () => {
    clickTile()
    // An updater rebuilds the shelf: every tile and link is a new element.
    document.getElementById('cardBooks')!.innerHTML = TILE
    const rebuilt = document.querySelector<HTMLAnchorElement>('.shelf-book-link')!
    dialog.dispatchEvent(new Event('cancel', {cancelable: true}))
    expect(dialog.open).toBe(false)
    expect(document.activeElement).toBe(rebuilt)
  })

  it('a tile without a link: focus never goes to the tile, which takes no focus', () => {
    document.getElementById('cardBooks')!.innerHTML = TILE.replace(/<a [^>]*>(.*?)<\/a>/, '$1')
    const tile = document.querySelector<HTMLElement>('.shelf-book')!
    tile.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, button: 0}))
    expect(dialog.open, 'control: the tile opened the dialog').toBe(true)
    dialog.dispatchEvent(new Event('cancel', {cancelable: true}))
    expect(dialog.open).toBe(false)
    expect(document.activeElement).not.toBe(tile)
  })
})

describe('bookshelf island: the tile link and the book-clicked event', () => {
  let events: unknown[]
  const record = (e: Event): void => {
    events.push((e as CustomEvent).detail)
  }

  beforeEach(() => {
    document.body.innerHTML = `<div id="island">${TILE}</div>`
    events = []
    document.addEventListener('book-clicked', record)
    initBookshelf(document.getElementById('island')!, {} as BookshelfProps)
  })

  afterEach(() => {
    document.removeEventListener('book-clicked', record)
  })

  it('a plain click dispatches book-clicked; with no listener claiming it, the link still navigates', () => {
    expect(clickTile()).toBe(false)
    expect(events).toEqual([BOOK])
  })

  it('a listener that claims book-clicked (preventDefault) cancels the navigation', () => {
    const claim = (e: Event): void => e.preventDefault()
    document.addEventListener('book-clicked', claim)
    try {
      expect(clickTile()).toBe(true)
      expect(events).toEqual([BOOK])
    } finally {
      document.removeEventListener('book-clicked', claim)
    }
  })

  it.each(MODIFIED)('%s neither dispatches nor prevents the navigation', (_name, init) => {
    expect(clickTile(init)).toBe(false)
    expect(events).toEqual([])
  })
})

describe('a payload that does not parse leaves the link to the browser', () => {
  beforeEach(() => {
    document.body.innerHTML = '<dialog id="bookDialog"><div id="bookModal"></div></dialog>' +
      `<div id="cardBooks">${TILE.replace(/data-book='[^']*'/, "data-book='{not json'")}</div>`
  })

  it('the dialog handler neither opens nor prevents the navigation', () => {
    initBookModal()
    expect(clickTile()).toBe(false)
    expect((document.getElementById('bookDialog') as HTMLDialogElement).open).toBe(false)
  })

  it('the island neither dispatches nor prevents the navigation', () => {
    const events: unknown[] = []
    const record = (e: Event): void => {
      events.push(e)
    }
    document.addEventListener('book-clicked', record)
    try {
      initBookshelf(document.getElementById('cardBooks')!, {} as BookshelfProps)
      expect(clickTile()).toBe(false)
      expect(events).toEqual([])
    } finally {
      document.removeEventListener('book-clicked', record)
    }
  })
})
