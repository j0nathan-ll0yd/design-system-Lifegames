// Card-state DOM writers shared by the runtime updaters (atlas decision 0160).
//
// INTERNAL to this package: no key of the package.json exports map reaches
// src/internal/, so no consumer can import this module. The public
// entry points are revealLiveData, renderWidgetEmpty, renderWidgetUnavailable
// and releaseSuppression in runtime/updater-empty.
import {stateNoticeHtml, stateRootAttrs, type WidgetState, widgetTimestampView} from '../runtime/widget-state'

/** Rewrite every header timestamp to the server's markup for `state`. */
export function writeHeaderTimestamps(card: Element, state: WidgetState, generatedAt: string | null | undefined): void {
  card.querySelectorAll<HTMLElement>('.widget-timestamp[data-live-label]').forEach((ts) => {
    const label = ts.dataset.liveLabel ?? ''
    const view = widgetTimestampView(label, state, generatedAt)
    const el = document.createElement(view.kind === 'asOf' ? 'time' : 'span')
    el.className = view.kind === 'asOf' ? 'widget-timestamp widget-timestamp-stale' : 'widget-timestamp'
    if (ts.id) {
      el.id = ts.id
    }
    if (view.kind === 'asOf') {
      el.setAttribute('datetime', view.datetime)
    }
    el.dataset.liveLabel = label
    el.textContent = view.text
    ts.replaceWith(el)
  })
}

/** Record `state` (and its timestamp, in a data state) on the card root, as stateRootAttrs does. */
export function writeRootState(card: Element, state: WidgetState, generatedAt: string | null | undefined): void {
  if (!(card instanceof HTMLElement) || card.dataset.ssrState === undefined) {
    return
  }
  const attrs = stateRootAttrs(state, generatedAt)
  card.dataset.ssrState = state
  if (attrs['data-generated-at']) {
    card.dataset.generatedAt = attrs['data-generated-at']
  } else {
    delete card.dataset.generatedAt
  }
}

/**
 * Drop every state notice, and the loading <noscript> note: the card has left
 * `loading`. Only the <noscript> that carries the loading note goes; with
 * scripting on, its content is raw text, so the marker is matched as text.
 */
export function removeStateNotices(card: Element): void {
  card.querySelectorAll('noscript').forEach((n) => {
    if (n.querySelector('[data-state-notice="loading"]') || (n.textContent ?? '').includes('data-state-notice="loading"')) {
      n.remove()
    }
  })
  card.querySelectorAll('[data-state-notice]').forEach((n) => n.remove())
}

/**
 * Insert a state notice where the templates render it: right after the
 * body's skeleton, else first in the body, else first in the card.
 */
export function insertStateNotice(card: Element, html: string): void {
  const body = card.querySelector('.widget-body')
  const skeleton = body?.querySelector(':scope > .skeleton-state')
  if (skeleton) {
    skeleton.insertAdjacentHTML('afterend', html)
  } else {
    ;(body ?? card).insertAdjacentHTML('afterbegin', html)
  }
}

/**
 * Put a card in the server's `unavailable` state: the notice from the
 * `widgets.widgetState` copy (stateNoticeHtml, the markup WidgetStateNotice
 * renders), the value-free scaffold hidden, no header label,
 * `data-ssr-state="unavailable"`, no `data-generated-at`, no skeleton.
 * The public entry point is renderWidgetUnavailable; an updater that has
 * cleared its own values calls this for a readable export that lacks the
 * card's primary measurement.
 */
export function enterUnavailable(card: HTMLElement): void {
  removeStateNotices(card)
  insertStateNotice(card, stateNoticeHtml('unavailable'))
  card.querySelectorAll<HTMLElement>('[data-state-scaffold]').forEach((s) => {
    s.hidden = true
  })
  writeHeaderTimestamps(card, 'unavailable', null)
  writeRootState(card, 'unavailable', null)
  card.classList.remove('is-loading', 'is-paused')
}
