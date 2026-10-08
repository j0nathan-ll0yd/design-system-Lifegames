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
  // A suppressed card refuses: nothing is written.
  if (!revealLiveData(card, 'empty')) {
    return
  }
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

/** True when the card is in the suppressed state (a hiding focus mode). */
export function isSuppressedCard(card: Element | null): boolean {
  return card instanceof HTMLElement && card.dataset.ssrState === 'suppressed'
}

/**
 * Leave the suppressed state, on the focus gate's word only. Call it when the
 * caller has learned that the hiding focus mode ended; it records the card as
 * `unavailable` (no data yet) so the next update can reveal it.
 */
export function releaseSuppression(card: Element | null): void {
  if (isSuppressedCard(card)) {
    ;(card as HTMLElement).dataset.ssrState = 'unavailable'
  }
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
 * It REFUSES to leave `suppressed` and returns false: a hiding focus mode is
 * the gate's decision, never a data update's. The caller must then write
 * nothing. Pass `{leaveSuppressed: true}` only from the focus gate's own
 * transition (or call releaseSuppression first).
 */
export function revealLiveData(card: Element | null, state: 'live' | 'empty' = 'live', opts: {leaveSuppressed?: boolean} = {}): boolean {
  if (!card) {
    return true
  }
  if (isSuppressedCard(card) && !opts.leaveSuppressed) {
    return false
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
  return true
}
