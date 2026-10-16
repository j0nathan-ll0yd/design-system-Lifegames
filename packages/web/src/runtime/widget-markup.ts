// Markup a template and a browser updater both write (atlas decision 0160).
// One string per element, so a card the browser fills matches the server's
// markup element for element. The styles for these classes are global, so
// they apply to client-written nodes too.
import {widgets} from '@j0nathan-ll0yd/copy'
import {esc, safeHttpsUrl} from './html-utils'
import type {RangeBand} from './widget-views'
import type {Article} from '../widgets/reading/ReadingFeed.types'

/** HeartRate's empty notice (copy key widgets.heartRate.empty). */
export function heartRateEmptyHtml(): string {
  return '<div class="hr-empty" data-state-notice="empty"><span class="hr-empty-label">' + esc(widgets.heartRate.empty) + '</span></div>'
}

/** MovementRings' empty notice. */
export function movementEmptyHtml(): string {
  return '<div class="mv-empty" data-state-notice="empty"><span class="mv-empty-label">' + esc(widgets.movement.empty) + '</span></div>'
}

/** A Hydration vessel's target-range band with its two bound labels. */
export function hydrationRangeHtml(kind: 'water' | 'coffee', band: RangeBand): string {
  const label = (edge: 'top' | 'bottom', text: string): string =>
    '<div class="hydra-range-label hydra-range-label-' + edge + ' hydra-range-label-' + kind + '">' + esc(text) + '</div>'
  return '<div class="hydra-range hydra-range-' +
    kind +
    '" style="bottom: ' +
    band.bottomPct +
    '%; height: ' +
    band.heightPct +
    '%">' +
    label('top', band.hi) +
    label('bottom', band.lo) +
    '</div>'
}

/** A relative date in <time datetime> when its ISO source is known. */
export function timeHtml(className: string, label: string, datetime: string | null | undefined): string {
  return datetime
    ? '<time class="' + className + '" datetime="' + esc(datetime) + '">' + esc(label) + '</time>'
    : '<span class="' + className + '">' + esc(label) + '</span>'
}

const ARTICLE_NOTE_ICON = '<svg class="article-list-note-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
  '<path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5l-3 3V3z" stroke="currentColor" stroke-width="1.2"/>' +
  '<line x1="5" y1="6" x2="11" y2="6" stroke="currentColor" stroke-width="1"/>' +
  '<line x1="5" y1="8.5" x2="9" y2="8.5" stroke="currentColor" stroke-width="1"/>' +
  '</svg>'

/**
 * The children of one ReadingFeed row (`li.article-list-item`): the notes
 * icon with its tooltip, the title (a link when the URL is https), the
 * source, and the date. No whitespace between the inline children: a
 * whitespace text node renders as a space.
 */
export function articleRowHtml(a: Article): string {
  let html = ''
  if (a.hasNotes) {
    html += '<span class="article-list-note" title="' + esc(a.noteText) + '">' + ARTICLE_NOTE_ICON + '</span>'
  }
  // An empty title (e.g. Hoodline) promotes the source into the title slot so
  // the row never renders blank-left; the parenthetical source is then
  // suppressed to avoid duplicating it.
  const titleText = a.title || a.source
  // Only an https article URL becomes an href, as in the other widgets.
  const href = safeHttpsUrl(a.url)
  html += href
    ? '<a class="article-list-title" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(titleText) + '</a>'
    : '<span class="article-list-title">' + esc(titleText) + '</span>'
  if (a.title) {
    html += '<span class="article-list-source">(' + esc(a.source) + ')</span>'
  }
  return html + timeHtml('article-list-date', a.date, a.datetime)
}

/** The five rating stars of a Bookshelf book, with no whitespace between them. */
export function ratingStarsHtml(rating: number): string {
  let html = ''
  for (let s = 1; s <= 5; s++) {
    html += '<span class="' + (s <= rating ? 'star-on' : 'star-off') + '">' + (s <= rating ? '\u2605' : '\u2606') + '</span>'
  }
  return html
}
