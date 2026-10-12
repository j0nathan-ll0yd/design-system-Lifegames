import {esc} from './html-utils'
import {enterUnavailable, insertStateNotice, removeStateNotices, writeHeaderTimestamps, writeRootState} from '../internal/card-state'

/**
 * Options for {@link renderWidgetEmpty}: either a single centered line, or a
 * stacked title + body (two-line, GitHub-style empty state).
 */
export type WidgetEmptyOptions = {message: string} | {title: string; body: string}

/**
 * Render a widget's empty state.
 *
 * Resolves the card by id, shows the server's centered `.widget-empty`
 * notice in place of the items, and clears the skeleton (`is-loading`). This is
 * the shared implementation behind the empty branches of the bookshelf,
 * theatre, dev-log, reading-feed and starred-repo updaters (Workouts has its
 * own recovery-day markup, workouts-markup.ts).
 *
 * The card keeps its server structure: the item scaffold (`[data-state-scaffold]`)
 * is emptied and hidden, as the server renders `empty`. A body with no
 * scaffold has its items replaced by the notice, so a populated path that
 * re-queries a container by id (e.g. `#dashShelfRow`, `#theatreRow`,
 * `.gh-starred-list`) MUST still recreate it when absent.
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
  const html = 'message' in opts
    ? '<div class="widget-empty" data-state-notice="empty">' + esc(opts.message) + '</div>'
    : '<div class="widget-empty widget-empty--stack" data-state-notice="empty">' +
      '<span class="widget-empty-title">' +
      esc(opts.title) +
      '</span>' +
      '<span class="widget-empty-body">' +
      esc(opts.body) +
      '</span>' +
      '</div>'
  const body = card.querySelector('.widget-body')
  const scaffolds = card.querySelectorAll<HTMLElement>('[data-state-scaffold]')
  if (scaffolds.length > 0) {
    // The server's empty state: the item scaffold kept, emptied and hidden,
    // and the notice WidgetStateNotice renders after the skeleton. The
    // populated path finds its container again.
    scaffolds.forEach((s) => {
      s.innerHTML = ''
      s.hidden = true
    })
    insertStateNotice(card, html)
  } else if (body) {
    // A body without a scaffold: the notice replaces the previous items.
    body.innerHTML = html
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

/** Options for {@link revealLiveData}. */
export interface RevealOptions {
  /** Only the focus gate's own transition may leave `suppressed`. */
  leaveSuppressed?: boolean
  /**
   * The export's `generatedAt`. A data state names it in
   * `data-generated-at` and a `stale` header shows it as "as of"; a missing
   * or invalid value shows neither. Omitted → no timestamp (pre-0160 calls).
   */
  generatedAt?: string | null
}

/**
 * Reveal a widget's live data after a server-rendered non-data state
 * (atlas decision 0160). The server renders `unavailable` and `suppressed`
 * with the value-free scaffold hidden (`[data-state-scaffold][hidden]`) and a
 * `[data-state-notice]` notice, and `stale` with an "as of" header time. An
 * updater that writes fresh values calls this first: it removes the notices
 * (and the loading <noscript> note), un-hides the scaffold, writes the header
 * the server renders for the new state (the live label, or "as of" for
 * `stale`, through `widgetTimestampView`) and records the state (`live`,
 * `stale`, or `empty` from an empty branch) and, in a data state, the
 * export's `generatedAt`.
 *
 * It REFUSES to leave `suppressed` and returns false: a hiding focus mode is
 * the gate's decision, never a data update's. The caller must then write
 * nothing. Pass `{leaveSuppressed: true}` only from the focus gate's own
 * transition (or call releaseSuppression first).
 */
export function revealLiveData(card: Element | null, state: 'live' | 'stale' | 'empty' = 'live', opts: RevealOptions = {}): boolean {
  if (!card) {
    return true
  }
  if (isSuppressedCard(card) && !opts.leaveSuppressed) {
    return false
  }
  removeStateNotices(card)
  card.querySelectorAll<HTMLElement>('[data-state-scaffold]').forEach((s) => {
    s.hidden = false
  })
  writeHeaderTimestamps(card, state, opts.generatedAt)
  writeRootState(card, state, opts.generatedAt)
  return true
}

/**
 * After a failed FIRST read of a card's export: render exactly the server's
 * `unavailable` state (enterUnavailable, src/internal/card-state). Returns true when the card
 * shows `unavailable`.
 *
 * It acts only on a card that has shown no data yet: `loading`, or a card the
 * focus gate released (`unavailable` with the suppressed notice still shown).
 * It is a no-op on a card that already shows the unavailable notice. It REFUSES, writes nothing and
 * returns false for:
 *   - a suppressed card: only the focus gate releases it;
 *   - a card that shows a reading (`live`, `stale`, `empty`): a later failed
 *     read keeps the last reading, as a null export does in every updater.
 * A later successful read fills the card through its updater (revealLiveData).
 */
export function renderWidgetUnavailable(card: Element | null): boolean {
  if (!(card instanceof HTMLElement)) {
    return false
  }
  const state = card.dataset.ssrState
  // A card the focus gate released (releaseSuppression) records `unavailable`
  // but still shows the suppressed notice: it is not yet in the server's
  // unavailable markup, so it is rendered like a loading card.
  const showsUnavailable = state === 'unavailable' && card.querySelector('[data-state-notice="unavailable"]') !== null
  if (showsUnavailable) {
    return true
  }
  if (state !== 'loading' && state !== 'unavailable') {
    return false
  }
  enterUnavailable(card)
  return true
}
