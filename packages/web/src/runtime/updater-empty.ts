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
