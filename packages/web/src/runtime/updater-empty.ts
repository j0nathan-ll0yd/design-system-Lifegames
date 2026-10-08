import {esc} from './html-utils'

/**
 * Options for {@link renderWidgetEmpty}: either a single centered line, or a
 * stacked title + body (two-line, GitHub-style empty state).
 */
export type WidgetEmptyOptions = {message: string} | {title: string; body: string}

/**
 * Render a widget's empty state.
 *
 * Resolves the card by id, replaces its `.widget-body` with a centered
 * `.widget-empty` placeholder, and clears the skeleton (`is-loading`). This is
 * the shared implementation behind the empty branches; bookshelf and theatre
 * adopt it (dev-log / reading / starred keep their inline copies for now).
 *
 * NOTE: replacing `.widget-body` destroys any child container that a widget's
 * populated path re-queries by id (e.g. `#dashShelfRow`, `#theatreRow`,
 * `.gh-starred-list`). Callers whose active path targets such a child MUST
 * recreate it when absent so an empty -> populated transition still renders.
 */
export function renderWidgetEmpty(cardId: string, opts: WidgetEmptyOptions): void {
  const card = document.getElementById(cardId)
  if (!card) {
    return
  }
  // The card now shows its empty state: its header and state attribute say so.
  revealLiveData(card, 'empty')
  const body = card.querySelector('.widget-body')
  if (body) {
    body.innerHTML = 'message' in opts
      ? '<div class="widget-empty">' + esc(opts.message) + '</div>'
      : '<div class="widget-empty widget-empty--stack">' +
        '<span class="widget-empty-title">' +
        esc(opts.title) +
        '</span>' +
        '<span class="widget-empty-body">' +
        esc(opts.body) +
        '</span>' +
        '</div>'
  }
  card.classList.remove('is-loading')
}

/**
 * Reveal a widget's live data after a server-rendered non-data state
 * (atlas decision 0160). The server renders `unavailable` and `suppressed`
 * with the value-free scaffold hidden (`[data-state-scaffold][hidden]`) and a
 * `[data-state-notice]` notice, and `stale` with an "as of" header time. An
 * updater that writes fresh values calls this first: it removes the notices,
 * un-hides the scaffold, restores the header's live label and records the
 * card's new state (`live`, or `empty` from an empty branch).
 *
 * Precondition: the caller has fresh, admitted data. Never call it while a
 * hiding focus mode is active — the site's focus gate owns that rule
 * (the site's live-data.ts suppresses polling first).
 */
export function revealLiveData(card: Element | null, state: 'live' | 'empty' = 'live'): void {
  if (!card) {
    return
  }
  card.querySelectorAll('[data-state-notice]').forEach((n) => n.remove())
  card.querySelectorAll<HTMLElement>('[data-state-scaffold]').forEach((s) => {
    s.hidden = false
  })
  // A stale <time> or a blank notice-state label becomes the live label again.
  card.querySelectorAll<HTMLElement>('.widget-timestamp[data-live-label]').forEach((ts) => {
    const span = document.createElement('span')
    span.className = 'widget-timestamp'
    if (ts.id) {
      span.id = ts.id
    }
    span.dataset.liveLabel = ts.dataset.liveLabel ?? ''
    span.textContent = ts.dataset.liveLabel ?? ''
    ts.replaceWith(span)
  })
  if (card instanceof HTMLElement && card.dataset.ssrState !== undefined) {
    card.dataset.ssrState = state
    delete card.dataset.generatedAt
  }
}
