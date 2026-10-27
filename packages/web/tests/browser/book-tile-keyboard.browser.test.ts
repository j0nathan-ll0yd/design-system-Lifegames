// The keyboard path of a Bookshelf tile, in a real engine. The tile's link
// replaced the tile's own keydown handler: Enter on a focused link makes the
// browser fire a click, and the dialog takes that click over. jsdom fires no
// click for a key press, so only a real browser can prove the path.
import {afterEach, describe, expect, it} from 'vitest'
import {userEvent} from 'vitest/browser'
import {initBookModal} from '../../src/runtime/book-modal-init'

const BOOK = {title: 'Keyboard Title', author: 'Fixture', asin: 'KEYBOARD-1', status: 'finished', link: 'https://www.amazon.com/dp/KEYBOARD-1'}

const roots: HTMLElement[] = []
afterEach(() => {
  while (roots.length) {
    roots.pop()!.remove()
  }
})

function mount(): HTMLElement {
  const root = document.createElement('div')
  document.body.append(root)
  root.innerHTML = `<div id="cardBooks"><ul class="shelf-row"><li class="shelf-book" data-book='${JSON.stringify(BOOK)}'>` +
    `<a class="shelf-book-link" href="${BOOK.link}" target="_blank" rel="sponsored noopener noreferrer" aria-label="Keyboard Title by Fixture">` +
    '<div class="shelf-book-title"><span>Keyboard Title</span></div></a></li></ul></div>' +
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
