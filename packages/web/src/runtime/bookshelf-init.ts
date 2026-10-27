import type {BookshelfProps} from '../widgets/reading/Bookshelf.types'
import {installImageFallbacks} from './image-utils'
import {isPlainPrimaryClick} from './click-intent'

export function initBookshelf(container: HTMLElement, _fixture: BookshelfProps): void {
  // Idempotency guard: prevent duplicate click listeners and onerror attachments.
  if (container.dataset.bookshelfInit === '1') {
    return
  }
  container.dataset.bookshelfInit = '1'

  installImageFallbacks(container)

  // Each tile's title is a real link to the book on Amazon, stretched over the
  // tile. A plain primary click (Enter on the link fires one too) dispatches a
  // cancelable `book-clicked` event. A listener that takes the click over (a
  // dialog, say) calls preventDefault() on it, and only then does the link not
  // navigate: with no listener, the link still works. Every other click keeps
  // the browser's default.
  const books = container.querySelectorAll<HTMLElement>('.shelf-book')
  books.forEach((bookEl) => {
    bookEl.addEventListener('click', (e: MouseEvent) => {
      if (!isPlainPrimaryClick(e)) {
        return
      }
      const raw = bookEl.getAttribute('data-book')
      if (!raw) {
        return
      }
      // A payload that does not parse leaves the link to the browser.
      let bookData: unknown
      try {
        bookData = JSON.parse(raw)
      } catch {
        return
      }
      const claimed = !bookEl.dispatchEvent(new CustomEvent('book-clicked', {bubbles: true, cancelable: true, detail: bookData}))
      if (claimed) {
        e.preventDefault()
      }
    })
  })

  // Remove loading state
  const card = container.querySelector<HTMLElement>('.tri-card')
  if (card) {
    card.classList.remove('is-loading')
  }
}
