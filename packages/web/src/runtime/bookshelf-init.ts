import type {BookshelfProps} from '../widgets/reading/Bookshelf.types'
import {installImageFallbacks} from './image-utils'
import {isPlainPrimaryClick} from './input-modality'

export function initBookshelf(container: HTMLElement, _fixture: BookshelfProps): void {
  // Idempotency guard: prevent duplicate click listeners and onerror attachments.
  if (container.dataset.bookshelfInit === '1') {
    return
  }
  container.dataset.bookshelfInit = '1'

  installImageFallbacks(container)

  // Each tile is a real link to the book on Amazon. A plain primary click
  // (Enter on the link fires one too) dispatches the detail event instead of
  // following the link; every other click keeps the browser's default.
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
      e.preventDefault()
      bookEl.dispatchEvent(new CustomEvent('book-clicked', {bubbles: true, detail: bookData}))
    })
  })

  // Remove loading state
  const card = container.querySelector<HTMLElement>('.tri-card')
  if (card) {
    card.classList.remove('is-loading')
  }
}
