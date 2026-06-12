// Runtime init for the BookModal widget. Ports the consumer-side inline script
// to a typed module. Handles: click/keyboard event delegation on the Bookshelf
// trigger (#cardBooks), HTML generation, overlay open/close with aria management,
// focus trap, click-outside-to-close.
//
// This is intentionally a near-verbatim port of the j0nathan-ll0yd.github.io
// inline script (proven to ship). Refactor opportunities exist (template
// strings, named functions) but the port-first approach minimizes regression
// risk for the cross-repo migration.

import { widgets, a11y } from '@lifegames/copy';
import { esc } from './html-utils';

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
    String(s).split(',').forEach((part) => {
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
  const fallbackAttr =
    b.cover && cover !== b.cover
      ? ` data-fallback="${esc(b.cover)}" onerror="this.src=this.dataset.fallback;this.onerror=null"`
      : '';
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
  html += '<button class="book-modal-close" id="bookModalClose" aria-label="' + a11y.modal.close + '">&times;</button>';
  html += '</div>';
  html += '<div class="book-modal-body">';
  html += '<div class="book-modal-stats">';
  html += `<div class="book-modal-stat"><div class="book-modal-stat-val">${b.pages || '—'}</div><div class="book-modal-stat-label">${widgets.bookModal.pages}</div></div>`;
  html += `<div class="book-modal-stat"><div class="book-modal-stat-val">${b.year || '—'}</div><div class="book-modal-stat-label">${widgets.bookModal.published}</div></div>`;
  html += `<div class="book-modal-stat"><div class="book-modal-stat-val shelf-book-status shelf-status-${b.status}" style="font-size:0.7rem;margin:0">${b.statusLabel || ''}</div><div class="book-modal-stat-label">${widgets.bookModal.status}</div></div>`;
  html += '</div>';
  if (b.status === 'in_progress' && b.progress !== undefined) {
    html += `<div><div class="book-modal-progress"><div class="book-modal-progress-fill" style="width:${b.progress}%"></div></div>`;
    html += `<div class="book-modal-progress-label">${widgets.bookModal.progressSuffix.replace('{percent}', String(b.progress))}</div></div>`;
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
  if (b.status === 'completed' && b.notes) {
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

function trapFocus(container: HTMLElement, closeModal: () => void): void {
  interface ContainerWithGuard extends HTMLElement {
    _trapBound?: boolean;
  }
  const cwg = container as ContainerWithGuard;
  if (cwg._trapBound) return;
  cwg._trapBound = true;
  container.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

export function initBookModal(): void {
  const overlay = document.getElementById('bookOverlay') as HTMLElement | null;
  const modal = document.getElementById('bookModal') as HTMLElement | null;
  if (!overlay || !modal) return;

  // Idempotency guard.
  interface OverlayWithGuard extends HTMLElement {
    _bookModalInit?: boolean;
  }
  const ovg = overlay as OverlayWithGuard;
  if (ovg._bookModalInit) return;
  ovg._bookModalInit = true;

  let triggerElement: HTMLElement | null = null;

  function openModal(b: BookData): void {
    modal!.innerHTML = renderModalHtml(b);
    overlay!.classList.add('visible');
    overlay!.setAttribute('aria-hidden', 'false');
    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.setAttribute('aria-hidden', 'true');
    if (typeof window.sa_event === 'function') {
      window.sa_event('book_open', { title: b.title });
    }
    const closeBtn = document.getElementById('bookModalClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => closeModal());
      closeBtn.focus();
    }
    trapFocus(overlay!, closeModal);
  }

  function closeModal(): void {
    overlay!.classList.remove('visible');
    overlay!.setAttribute('aria-hidden', 'true');
    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.removeAttribute('aria-hidden');
    if (triggerElement) {
      triggerElement.focus();
      triggerElement = null;
    }
  }

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

  overlay.addEventListener('click', (e: Event) => {
    if (e.target === overlay) closeModal();
  });
}
