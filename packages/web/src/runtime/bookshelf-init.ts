import type {BookshelfProps} from '../widgets/reading/Bookshelf.types'
import {installImageFallbacks} from './image-utils'

export function initBookshelf(container: HTMLElement, _fixture: BookshelfProps): void {
  // Idempotency guard: prevent duplicate click listeners and onerror attachments.
  if (container.dataset.bookshelfInit === '1') {
    return
  }
  container.dataset.bookshelfInit = '1'

  installImageFallbacks(container)

  // Wire click/keyboard handlers on book items to dispatch detail event
  const books = container.querySelectorAll<HTMLElement>('.shelf-book')
  books.forEach((bookEl) => {
    const handler = (): void => {
      const raw = bookEl.getAttribute('data-book')
      if (!raw) {
        return
      }
      try {
        const bookData: unknown = JSON.parse(raw)
        bookEl.dispatchEvent(new CustomEvent('book-clicked', {bubbles: true, detail: bookData}))
      } catch {
        // Invalid JSON in data-book attribute — skip silently
      }
    }

    bookEl.addEventListener('click', handler)
    bookEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handler()
      }
    })
  })

  // Remove loading state
  const card = container.querySelector<HTMLElement>('.tri-card')
  if (card) {
    card.classList.remove('is-loading')
  }
}
