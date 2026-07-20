// @vitest-environment jsdom
import {beforeEach, describe, expect, it} from 'vitest'
import {renderWidgetEmpty} from '../../src/runtime/updater-empty'

describe('renderWidgetEmpty', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="card" class="is-loading"><div class="widget-body"><span>stale</span></div></div>'
  })

  it('renders single-line empty state with message text, removes stale content and is-loading', () => {
    renderWidgetEmpty('card', {message: 'Nothing here'})
    const body = document.querySelector('#card .widget-body')
    const empty = body!.querySelector('.widget-empty')
    expect(empty).not.toBeNull()
    expect(empty!.textContent).toBe('Nothing here')
    expect(body!.querySelector('span')).toBeNull()
    expect(document.getElementById('card')!.classList.contains('is-loading')).toBe(false)
  })

  it('renders stacked variant with widget-empty--stack class, title span, and body span', () => {
    renderWidgetEmpty('card', {title: 'T', body: 'B'})
    const empty = document.querySelector('#card .widget-body .widget-empty')
    expect(empty).not.toBeNull()
    expect(empty!.classList.contains('widget-empty--stack')).toBe(true)
    expect(empty!.querySelector('.widget-empty-title')!.textContent).toBe('T')
    expect(empty!.querySelector('.widget-empty-body')!.textContent).toBe('B')
  })

  it('HTML-escapes message so no raw HTML elements are injected into the DOM', () => {
    renderWidgetEmpty('card', {message: '<x>&"'})
    expect(document.querySelector('#card x')).toBeNull()
    expect(document.querySelector('#card .widget-empty')!.textContent).toBe('<x>&"')
  })

  it('does not throw and removes is-loading when widget-body is absent', () => {
    document.body.innerHTML = '<div id="card2" class="is-loading"></div>'
    expect(() => renderWidgetEmpty('card2', {message: 'x'})).not.toThrow()
    expect(document.getElementById('card2')!.classList.contains('is-loading')).toBe(false)
  })

  it('does not throw when card id does not exist in the document', () => {
    expect(() => renderWidgetEmpty('nope', {message: 'x'})).not.toThrow()
  })
})
