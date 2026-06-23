// Runtime init for the BookModal widget. Handles: click/keyboard event
// delegation on the Bookshelf trigger (#cardBooks), HTML generation, native
// <dialog> open/close via showModal()/close(), backdrop-click-to-close,
// focus store/restore, and image-cover fallback (external listener, CSP-safe).
//
// The native <dialog> element provides: background inert (no manual focus
// trap needed), automatic Escape-to-close (cancel→close events), top-layer
// rendering (no z-index required), and UA margin:auto centering.

import { widgets, a11y } from '@lifegames/copy';
import { esc } from './html-utils';
import { formatFinishedDate } from './updaters';
import { withViewTransition } from './view-transition';

interface BookData {
  asin?: string;
  cover?: string;
  coverAvif?: string;
  title?: string;
  series?: string;
  seriesNumber?: number;
  seriesTotal?: number;
  author?: string;
  rating?: number;
  pages?: number;
  year?: number;
  status?: string;
  statusLabel?: string;
  progress?: number;
  desc?: string;
  genres?: string | string[];
  notes?: string;
  link?: string;
  finishedAt?: string | null;
}

declare global {
  interface Window {
    sa_event?: (name: string, props?: Record<string, unknown>) => void;
  }
}

function normalizeGenres(g: BookData['genres']): string[] {
  if (!g) return [];
  const items = Array.isArray(g) ? g : typeof g === 'string' ? [g] : [];
  const result: string[] = [];
  for (const s of items) {
    String(s)
      .split(',')
      .forEach((part) => {
        const t = part.trim();
        if (t.length > 0) result.push(t);
      });
  }
  return result;
}

function renderModalHtml(b: BookData): string {
  const asin = b.asin || '';
  const cover = b.cover || `https://m.media-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_SX160_.jpg`;
  let html = '<div class="book-modal-header">';
  // data-fallback is a data attribute (CSP-safe); the error listener is wired
  // externally in openModal() after innerHTML assignment (D3 — no inline onerror).
  const fallbackAttr = b.cover && cover !== b.cover ? ` data-fallback="${esc(b.cover)}"` : '';
  const avifSrc = b.coverAvif ? `<source srcset="${esc(b.coverAvif)}" type="image/avif">` : '';
  const imgTag = `<img class="book-modal-cover" src="${esc(cover)}" width="140" height="210" alt="${esc(b.title || '')} cover" decoding="async"${fallbackAttr}>`;
  html += avifSrc ? `<picture>${avifSrc}${imgTag}</picture>` : imgTag;
  html += '<div class="book-modal-info">';
  html += `<div class="book-modal-title">${esc(b.title || '')}</div>`;
  if (b.series) {
    let seriesHtml = esc(b.series);
    if (b.seriesNumber) {
      seriesHtml += ` <span style="color:var(--neon-green)">&middot; Book ${b.seriesNumber}`;
      if (b.seriesTotal) seriesHtml += ` of ${b.seriesTotal}`;
      seriesHtml += '</span>';
    }
    html += `<div class="book-modal-series">${seriesHtml}</div>`;
  }
  html += `<div class="book-modal-author">${esc(b.author || '')}</div>`;
  if (b.rating) {
    html += '<div class="book-modal-stars">';
    for (let s = 1; s <= 5; s++) {
      html += `<span class="${s <= b.rating ? 'star-on' : 'star-off'}">${s <= b.rating ? '★' : '☆'}</span>`;
    }
    html += '</div>';
  }
  html += '</div>';
  html +=
    '<button class="book-modal-close" id="bookModalClose" aria-label="' +
    a11y.modal.close +
    '">&times;</button>';
  html += '</div>';
  html += '<div class="book-modal-body">';
  html += '<div class="book-modal-stats">';
  html += `<div class="book-modal-stat"><div class="book-modal-stat-val">${b.pages || '—'}</div><div class="book-modal-stat-label">${widgets.bookModal.pages}</div></div>`;
  html += `<div class="book-modal-stat"><div class="book-modal-stat-val">${b.year || '—'}</div><div class="book-modal-stat-label">${widgets.bookModal.published}</div></div>`;
  html += `<div class="book-modal-stat"><div class="book-modal-stat-val shelf-book-status shelf-status-${b.status}" style="font-size:0.7rem;margin:0">${b.statusLabel || ''}</div><div class="book-modal-stat-label">${widgets.bookModal.status}</div></div>`;
  html += '</div>';
  if (b.status === 'reading' && b.progress !== undefined) {
    html += `<div><div class="book-modal-progress"><div class="book-modal-progress-fill" style="width:${b.progress}%"></div></div>`;
    html += `<div class="book-modal-progress-label">${widgets.bookModal.progressSuffix.replace('{percent}', String(b.progress))}</div></div>`;
  }
  if (b.status === 'finished' && b.finishedAt) {
    html += `<div class="book-modal-finished-date">${esc(widgets.bookshelf.finishedDate.replace('{date}', formatFinishedDate(b.finishedAt)))}</div>`;
  }
  if (b.desc) html += `<div class="book-modal-desc">${esc(b.desc)}</div>`;
  const genreList = normalizeGenres(b.genres);
  if (genreList.length) {
    html += '<div class="book-modal-tags">';
    genreList.forEach((g, i) => {
      if (i > 0) html += '<span class="book-modal-tag-sep">,</span>';
      html += `<span class="book-modal-tag">${esc(g)}</span>`;
    });
    html += '</div>';
  }
  if (b.status === 'finished' && b.notes) {
    html += '<div class="book-modal-notes">';
    html += `<div class="book-modal-notes-label">${widgets.bookModal.notes}</div>`;
    html += `<div class="book-modal-notes-text">${esc(b.notes)}</div>`;
    html += '</div>';
  }
  if (b.link) {
    html += `<div><a href="${esc(b.link)}" target="_blank" rel="noopener" class="book-modal-amazon">${widgets.bookModal.amazonCta}</a></div>`;
  }
  html += '</div>';
  return html;
}

export function initBookModal(): void {
  const dialog = document.getElementById('bookDialog') as HTMLDialogElement | null;
  const modal = document.getElementById('bookModal') as HTMLElement | null;
  if (!dialog || !modal) return;

  // Idempotency guard — anchored to the dialog element.
  interface DialogWithGuard extends HTMLDialogElement {
    _bookModalInit?: boolean;
  }
  const dwg = dialog as DialogWithGuard;
  if (dwg._bookModalInit) return;
  dwg._bookModalInit = true;

  let triggerElement: HTMLElement | null = null;
  // Tracks the view-transition-name set on #bookModal for the current open
  // book so backdrop-click and Escape can drive the reverse (close) transition.
  let currentVtName = '';

  function openModal(b: BookData): void {
    // Derive a stable transition name from the book's ASIN so that concurrent
    // books do not share the same view-transition-name (duplicate names cause
    // the browser to silently skip the transition). The name is scoped to the
    // inner container (bookModal), not the <dialog> element itself — top-layer
    // elements cannot carry view-transition-name reliably across browsers.
    // We also ensure the name is unset before the update and set inside it,
    // so the browser captures old/new states correctly.
    const vtName = b.asin ? 'book-modal-' + b.asin : 'book-modal-content';

    withViewTransition(() => {
      modal!.style.viewTransitionName = '';
      modal!.innerHTML = renderModalHtml(b);

      // Wire image-cover fallback via external listener (CSP-safe; replaces
      // inline onerror — D3). The cover element carries data-fallback when the
      // computed Amazon URL differs from the stored custom cover.
      const cover = modal!.querySelector<HTMLImageElement>('.book-modal-cover');
      if (cover && cover.dataset.fallback) {
        cover.addEventListener('error', function onErr() {
          cover.src = cover.dataset.fallback!;
          cover.removeEventListener('error', onErr);
        });
      }

      // Open the dialog and fire analytics only on an ACTUAL open — never on a
      // content-swap while already open (which would double-count book_open).
      // The guard also prevents showModal() throwing InvalidStateError when open.
      if (!dialog!.open) {
        if (typeof window.sa_event === 'function') {
          window.sa_event('book_open', { title: b.title });
        }
        modal!.style.viewTransitionName = vtName;
        currentVtName = vtName;
        dialog!.showModal();
      }

      const closeBtn = document.getElementById('bookModalClose');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          closeWithTransition();
        });
        closeBtn.focus();
      }
    });
  }

  function closeWithTransition(): void {
    const vtName = currentVtName;
    withViewTransition(() => {
      if (vtName) modal!.style.viewTransitionName = vtName;
      dialog!.close();
      // Clear the name after close so the element does not retain a
      // view-transition-name while hidden (would affect subsequent opens).
      modal!.style.viewTransitionName = '';
      currentVtName = '';
    });
  }

  // Single unified close handler — covers button click, backdrop click, and
  // native Escape (cancel→close). Focus is always restored to the trigger for
  // accessibility, but we suppress the :focus-visible ring that an Escape/
  // backdrop dismiss would otherwise leave lingering on the book tile. The ring
  // is restored the instant the user keyboard-navigates or moves focus away, so
  // genuine keyboard focus visibility (WCAG 2.4.7) is preserved for shelf nav.
  dialog.addEventListener('close', () => {
    const trigger = triggerElement;
    triggerElement = null;
    if (!trigger) return;
    trigger.style.outline = 'none';
    trigger.focus();
    const restoreRing = () => {
      trigger.style.outline = '';
      trigger.removeEventListener('blur', restoreRing);
      trigger.removeEventListener('keydown', restoreRing);
      trigger.removeEventListener('pointerdown', restoreRing);
    };
    trigger.addEventListener('blur', restoreRing, { once: true });
    trigger.addEventListener('keydown', restoreRing, { once: true });
    trigger.addEventListener('pointerdown', restoreRing, { once: true });
  });

  // Intercept Escape (cancel event) to drive the reverse close transition
  // before the browser natively closes the dialog. preventDefault() suppresses
  // the native close; closeWithTransition() calls dialog.close() inside the
  // transition callback so the UA still processes the close correctly.
  dialog.addEventListener('cancel', (e: Event) => {
    e.preventDefault();
    closeWithTransition();
  });

  // Backdrop-click-to-close. Using getBoundingClientRect() because
  // e.target === dialog is unreliable (::backdrop clicks also target the
  // dialog element). Any click outside the dialog box bounds closes it.
  dialog.addEventListener('click', (e: MouseEvent) => {
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
      closeWithTransition();
    }
  });

  const cardBooks = document.getElementById('cardBooks');
  if (cardBooks) {
    cardBooks.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      const book = target.closest<HTMLElement>('.shelf-book[data-book]');
      if (book) {
        triggerElement = book;
        const data = JSON.parse(book.getAttribute('data-book') || '{}') as BookData;
        openModal(data);
      }
    });
    cardBooks.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const target = e.target as HTMLElement;
        const book = target.closest<HTMLElement>('.shelf-book[data-book]');
        if (book) {
          e.preventDefault();
          triggerElement = book;
          const data = JSON.parse(book.getAttribute('data-book') || '{}') as BookData;
          openModal(data);
        }
      }
    });
  }
}
