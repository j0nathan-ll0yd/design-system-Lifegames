// Runtime init for the BookModal widget. Handles: click/keyboard event
// delegation on the Bookshelf trigger (#cardBooks), HTML generation, native
// <dialog> open/close via showModal()/close(), backdrop-click-to-close,
// focus store/restore, and image-cover fallback (external listener, CSP-safe).
//
// The native <dialog> element provides: background inert (no manual focus
// trap needed), automatic Escape-to-close (cancel→close events), top-layer
// rendering (no z-index required), and UA margin:auto centering.

import {a11y, widgets} from '@j0nathan-ll0yd/copy'
import {esc} from './html-utils'
import {imgFallbackAttrs, installImageFallbacks, PLACEHOLDER_IMAGE_SRC, sanitizeImageUrl} from './image-utils'
import {formatFinishedDate} from './updaters'

interface BookData {
  asin?: string
  // Export contract field names (books.json emits `mainImage*`) — the
  // `data-book` payload the Bookshelf writes uses the same names.
  mainImage?: string
  mainImageAvif?: string
  title?: string
  series?: string
  seriesNumber?: number
  seriesTotal?: number
  author?: string
  rating?: number
  pages?: number
  year?: number
  status?: string
  statusLabel?: string
  progress?: number
  desc?: string
  genres?: string | string[]
  notes?: string
  link?: string
  finishedAt?: string | null
}

declare global {
  interface Window {
    sa_event?: (name: string, props?: Record<string, unknown>) => void
  }
}

function normalizeGenres(g: BookData['genres']): string[] {
  if (!g) {
    return []
  }
  const items = Array.isArray(g) ? g : typeof g === 'string' ? [g] : []
  const result: string[] = []
  for (const s of items) {
    String(s).split(',').forEach((part) => {
      const t = part.trim()
      if (t.length > 0) {
        result.push(t)
      }
    })
  }
  return result
}

function renderModalHtml(b: BookData): string {
  // No cover in the export → the first-party placeholder. Never a synthesized
  // third-party URL (atlas decision 0086).
  const cover = sanitizeImageUrl(b.mainImage) || PLACEHOLDER_IMAGE_SRC
  const avif = sanitizeImageUrl(b.mainImageAvif, {onReject: 'omit'})
  let html = '<div class="book-modal-header">'
  // data-fallback is a data attribute (CSP-safe); the error listener is wired
  // externally in openModal() after innerHTML assignment (D3 — no inline onerror).
  const fallbackAttr = imgFallbackAttrs(cover, avif !== null)
  const avifSrc = avif ? `<source srcset="${esc(avif)}" type="image/avif">` : ''
  const imgTag = `<img class="book-modal-cover" src="${esc(cover)}" width="140" height="210" alt="${
    esc(b.title || '')
  } cover" decoding="async"${fallbackAttr}>`
  html += avifSrc ? `<picture>${avifSrc}${imgTag}</picture>` : imgTag
  html += '<div class="book-modal-info">'
  html += `<div class="book-modal-title">${esc(b.title || '')}</div>`
  if (b.series) {
    let seriesHtml = esc(b.series)
    if (b.seriesNumber) {
      seriesHtml += ` <span style="color:var(--neon-green)">&middot; Book ${b.seriesNumber}`
      if (b.seriesTotal) {
        seriesHtml += ` of ${b.seriesTotal}`
      }
      seriesHtml += '</span>'
    }
    html += `<div class="book-modal-series">${seriesHtml}</div>`
  }
  html += `<div class="book-modal-author">${esc(b.author || '')}</div>`
  if (b.rating) {
    html += '<div class="book-modal-stars">'
    for (let s = 1; s <= 5; s++) {
      html += `<span class="${s <= b.rating ? 'star-on' : 'star-off'}">${s <= b.rating ? '★' : '☆'}</span>`
    }
    html += '</div>'
  }
  html += '</div>'
  html += '<button class="book-modal-close" id="bookModalClose" aria-label="' + a11y.modal.close + '">&times;</button>'
  html += '</div>'
  html += '<div class="book-modal-body">'
  html += '<div class="book-modal-stats">'
  html += `<div class="book-modal-stat"><div class="book-modal-stat-val">${
    b.pages || '—'
  }</div><div class="book-modal-stat-label">${widgets.bookModal.pages}</div></div>`
  html += `<div class="book-modal-stat"><div class="book-modal-stat-val">${
    b.year || '—'
  }</div><div class="book-modal-stat-label">${widgets.bookModal.published}</div></div>`
  html += `<div class="book-modal-stat"><div class="book-modal-stat-val shelf-book-status shelf-status-${b.status}" style="font-size:0.7rem;margin:0">${
    b.statusLabel || ''
  }</div><div class="book-modal-stat-label">${widgets.bookModal.status}</div></div>`
  html += '</div>'
  if (b.status === 'reading' && b.progress !== undefined) {
    html += `<div><div class="book-modal-progress"><div class="book-modal-progress-fill" style="width:${b.progress}%"></div></div>`
    html += `<div class="book-modal-progress-label">${widgets.bookModal.progressSuffix.replace('{percent}', String(b.progress))}</div></div>`
  }
  if (b.status === 'finished' && b.finishedAt) {
    html += `<div class="book-modal-finished-date">${esc(widgets.bookshelf.finishedDate.replace('{date}', formatFinishedDate(b.finishedAt)))}</div>`
  }
  if (b.desc) {
    html += `<div class="book-modal-desc">${esc(b.desc)}</div>`
  }
  const genreList = normalizeGenres(b.genres)
  if (genreList.length) {
    html += '<div class="book-modal-tags">'
    genreList.forEach((g, i) => {
      if (i > 0) {
        html += '<span class="book-modal-tag-sep">,</span>'
      }
      html += `<span class="book-modal-tag">${esc(g)}</span>`
    })
    html += '</div>'
  }
  if (b.status === 'finished' && b.notes) {
    html += '<div class="book-modal-notes">'
    html += `<div class="book-modal-notes-label">${widgets.bookModal.notes}</div>`
    html += `<div class="book-modal-notes-text">${esc(b.notes)}</div>`
    html += '</div>'
  }
  if (b.link) {
    html += `<div><a href="${esc(b.link)}" target="_blank" rel="noopener" class="book-modal-amazon">${widgets.bookModal.amazonCta}</a></div>`
  }
  html += '</div>'
  return html
}

export function initBookModal(): void {
  const dialog = document.getElementById('bookDialog') as HTMLDialogElement | null
  const modal = document.getElementById('bookModal') as HTMLElement | null
  if (!dialog || !modal) {
    return
  }

  // Idempotency guard — anchored to the dialog element.
  interface DialogWithGuard extends HTMLDialogElement {
    _bookModalInit?: boolean
  }
  const dwg = dialog as DialogWithGuard
  if (dwg._bookModalInit) {
    return
  }
  dwg._bookModalInit = true

  let triggerElement: HTMLElement | null = null

  function openModal(b: BookData): void {
    modal!.innerHTML = renderModalHtml(b)

    // Wire image-cover fallback via external listener (CSP-safe; replaces
    // inline onerror — D3). Shared with the Bookshelf so the fallback target
    // is the first-party placeholder in exactly one place.
    installImageFallbacks(modal!)

    // Open the dialog and fire analytics only on an ACTUAL open — never on a
    // content-swap while already open (which would double-count book_open).
    // The guard also prevents showModal() throwing InvalidStateError when open.
    if (!dialog!.open) {
      if (typeof window.sa_event === 'function') {
        window.sa_event('book_open', {title: b.title})
      }
      dialog!.showModal()
    }

    // The card entry animation is pure CSS (bookModalIn on
    // dialog.book-dialog[open] .book-modal), and dismiss uses a CSS exit
    // animation (closeBookModal). We deliberately do NOT wrap open/close in a
    // same-document View Transition: snapshotting the backdrop-filtered
    // .book-modal flattened the live blur into a static image that glared as it
    // faded on dismiss. CSS enter/exit animations avoid that artifact entirely.
    const closeBtn = document.getElementById('bookModalClose')
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        closeBookModal()
      })
      closeBtn.focus()
    }
  }

  // Single unified close path — covers close-button click, backdrop click, and
  // native Escape (cancel). The card animates out via a CSS exit animation
  // (bookModalOut), applied inline so it overrides the [open] bookModalIn rule,
  // then the dialog is closed. No view transition: snapshotting the
  // backdrop-filtered card produced a glossy glare on dismiss.
  //
  // Focus is restored to the trigger for accessibility; whether a :focus-visible
  // ring shows is decided by the global input-modality tracker (a11y.css) —
  // keyboard dismiss (Escape) keeps the ring, pointer dismiss suppresses it.
  //
  // The trigger is captured into a LOCAL and the shared `triggerElement` detached
  // synchronously so a rapid reopen cannot null a freshly-set trigger mid-close.
  function closeBookModal(): void {
    if (!dialog!.open) {
      return
    }
    const trigger = triggerElement
    triggerElement = null

    const finish = (): void => {
      modal!.style.animation = ''
      dialog!.close()
      if (trigger) {
        trigger.focus()
      }
    }

    // Reduced motion: close immediately, no exit animation.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish()
      return
    }

    let done = false
    const onEnd = (): void => {
      if (done) {
        return
      }
      done = true
      modal!.removeEventListener('animationend', onEnd)
      finish()
    }
    modal!.addEventListener('animationend', onEnd)
    // Fallback in case animationend never fires (animation dropped/interrupted).
    window.setTimeout(onEnd, 300)
    // Inline animation overrides the [open] bookModalIn rule (inline beats any
    // selector / cascade layer), so the card animates out without a view transition.
    modal!.style.animation = 'bookModalOut 0.2s ease-in forwards'
  }

  // Intercept Escape (cancel event) to drive the reverse close transition
  // before the browser natively closes the dialog. preventDefault() suppresses
  // the native close; closeBookModal() calls dialog.close() inside the
  // transition callback so the UA still processes the close correctly.
  dialog.addEventListener('cancel', (e: Event) => {
    e.preventDefault()
    closeBookModal()
  })

  // Backdrop-click-to-close. The <dialog> element fills the viewport and
  // centers the visible card (.book-modal) via grid place-items (see
  // components.css). A click on the empty area around the card therefore lands
  // on the <dialog> element itself, while a click on the card lands on a
  // descendant of #bookModal. So `e.target === dialog` cleanly distinguishes a
  // backdrop click from a click inside the card.
  //
  // The previous getBoundingClientRect() approach could never fire: with a
  // fit-content dialog the empty area was ::backdrop, and ::backdrop clicks
  // fall through to <html> — they never reach this listener at all.
  dialog.addEventListener('click', (e: MouseEvent) => {
    if (e.target === dialog) {
      closeBookModal()
    }
  })

  const cardBooks = document.getElementById('cardBooks')
  if (cardBooks) {
    cardBooks.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement
      const book = target.closest<HTMLElement>('.shelf-book[data-book]')
      if (book) {
        triggerElement = book
        const data = JSON.parse(book.getAttribute('data-book') || '{}') as BookData
        openModal(data)
      }
    })
    cardBooks.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const target = e.target as HTMLElement
        const book = target.closest<HTMLElement>('.shelf-book[data-book]')
        if (book) {
          e.preventDefault()
          triggerElement = book
          const data = JSON.parse(book.getAttribute('data-book') || '{}') as BookData
          openModal(data)
        }
      }
    })
  }
}
