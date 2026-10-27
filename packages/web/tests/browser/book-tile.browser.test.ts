// A Bookshelf tile in a real engine. jsdom neither fires a click for a key
// press nor lays out or hit-tests, so only a real browser proves these paths.
//
// Keyboard: the title link replaced the tile's own keydown handler. Enter on
// the focused link makes the browser fire a click, and the dialog takes that
// click over.
// Pointer: the link wraps the title text only; its overlay (components.css
// .shelf-book-link::after) stretches the hit area over the tile, so a click
// on the cover or on the author still reaches the link.
import {afterEach, describe, expect, it} from 'vitest'
import {userEvent} from 'vitest/browser'
// The tokens first: the ring colour is a token.
import '@j0nathan-ll0yd/tokens/css'
import '../../src/styles/components.css'
import '../../src/styles/a11y.css'
import {initBookModal} from '../../src/runtime/book-modal-init'

const BOOK = {title: 'Keyboard Title', author: 'Fixture', asin: 'KEYBOARD-1', status: 'finished', link: 'https://www.amazon.com/dp/KEYBOARD-1'}

const roots: HTMLElement[] = []
afterEach(() => {
  while (roots.length) {
    roots.pop()!.remove()
  }
})

function mount(active = false): HTMLElement {
  const root = document.createElement('div')
  document.body.append(root)
  root.innerHTML =
    `<div id="cardBooks"><ul class="shelf-row"><li class="shelf-book${active ? ' shelf-book-active' : ''}" data-book='${JSON.stringify(BOOK)}'>` +
    '<div class="shelf-cover-wrapper"><img alt="" width="80" height="120" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></div>' +
    `<div class="shelf-book-title"><a class="shelf-book-link" href="${BOOK.link}" target="_blank" rel="sponsored noopener noreferrer">` +
    '<span>Keyboard Title</span></a></div><div class="shelf-book-author">Fixture</div></li></ul></div>' +
    '<dialog id="bookDialog"><div id="bookModal"></div></dialog>'
  roots.push(root)
  return root
}

describe('Bookshelf tile: the keyboard reaches the dialog through the link', () => {
  it('Enter on the focused link opens the dialog and cancels the navigation; Escape returns focus to the link', async () => {
    const root = mount()
    initBookModal()
    const link = root.querySelector<HTMLAnchorElement>('.shelf-book-link')!
    const dialog = root.querySelector<HTMLDialogElement>('#bookDialog')!
    // The click the browser fires for Enter reaches the document after the
    // card's handler: record whether that handler cancelled the navigation.
    const clicks: Array<{prevented: boolean; detail: number}> = []
    const record = (e: MouseEvent): void => {
      clicks.push({prevented: e.defaultPrevented, detail: e.detail})
    }
    document.addEventListener('click', record)
    try {
      link.focus()
      expect(document.activeElement).toBe(link)
      await userEvent.keyboard('{Enter}')
      expect(clicks, 'Enter fires one keyboard click (detail 0)').toEqual([{prevented: true, detail: 0}])
      expect(dialog.open).toBe(true)
      expect(root.querySelector('#bookModal')!.textContent).toContain('Keyboard Title')

      await userEvent.keyboard('{Escape}')
      await expect.poll(() => dialog.open, {timeout: 2000}).toBe(false)
      await expect.poll(() => document.activeElement, {timeout: 2000}).toBe(link)
    } finally {
      document.removeEventListener('click', record)
    }
  })
})

describe('Bookshelf tile: a click anywhere on the tile reaches the link', () => {
  // The active (reading) tile is the riskiest case: its cover wrapper is
  // positioned and clips, and its scan line carries a z-index and will-change.
  it.each([
    ['.shelf-cover-wrapper', false],
    ['.shelf-book-author', false],
    ['.shelf-cover-wrapper', true],
    ['.shelf-book-author', true]
  ] as const)('the hit target over %s (active tile: %s) is the title link', (selector, active) => {
    const root = mount(active)
    const link = root.querySelector<HTMLAnchorElement>('.shelf-book-link')!
    const box = root.querySelector(selector)!.getBoundingClientRect()
    expect(box.width * box.height, 'control: the element has a box').toBeGreaterThan(0)
    expect(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)).toBe(link)
  })

  it('a real click on the cover opens the dialog and cancels the navigation', async () => {
    const root = mount()
    initBookModal()
    const clicks: boolean[] = []
    const record = (e: MouseEvent): void => {
      clicks.push(e.defaultPrevented)
    }
    document.addEventListener('click', record)
    try {
      // Playwright's actionability check reports that the link's overlay
      // intercepts the cover, which is the pattern under test; `force` clicks
      // at the cover's centre all the same.
      await userEvent.click(root.querySelector('.shelf-cover-wrapper')!, {force: true})
      expect(clicks).toEqual([true])
      expect(root.querySelector<HTMLDialogElement>('#bookDialog')!.open).toBe(true)
    } finally {
      document.removeEventListener('click', record)
      root.querySelector<HTMLDialogElement>('#bookDialog')!.close()
    }
  })
})

describe('Bookshelf tile: the keyboard focus ring outlines the tile', () => {
  afterEach(() => {
    delete document.documentElement.dataset.inputModality
  })

  it('the link draws no ring; its overlay draws the green ring 3px outside the tile padding edge, and pointer input suppresses it', async () => {
    const root = mount()
    const link = root.querySelector<HTMLAnchorElement>('.shelf-book-link')!
    ;(document.activeElement as HTMLElement | null)?.blur()
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(link)
    expect(link.matches(':focus-visible'), 'control: keyboard focus is focus-visible').toBe(true)
    expect(getComputedStyle(link).outlineStyle, 'the link itself draws no ring').toBe('none')
    const ring = getComputedStyle(link, '::after')
    expect(ring.outlineStyle).toBe('solid')
    expect(ring.outlineWidth).toBe('2px')
    expect(ring.outlineOffset).toBe('3px')
    expect(ring.outlineColor, 'the green token').toBe('rgb(6, 214, 160)')
    // The overlay covers the tile's padding box.
    const tile = root.querySelector('.shelf-book')!.getBoundingClientRect()
    const overlay = {w: parseFloat(ring.width), h: parseFloat(ring.height)}
    expect(overlay.w).toBeCloseTo(tile.width - 2, 0)
    expect(overlay.h).toBeCloseTo(tile.height - 2, 0)

    document.documentElement.dataset.inputModality = 'pointer'
    expect(getComputedStyle(link, '::after').outlineStyle, 'pointer input suppresses the ring').toBe('none')
  })
})
