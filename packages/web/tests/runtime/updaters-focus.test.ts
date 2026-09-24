// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {updateFocusOverlay} from '../../src/runtime/updaters-focus'
import {HIDING_FOCUS_MODES} from '@j0nathan-ll0yd/portal-contract/constants'
import type {FocusExport} from '@j0nathan-ll0yd/portal-contract/schemas'

const GENERATED_AT = '2026-01-01T00:00:00Z'
const HIDING_SINCE = '2025-12-31T09:00:00Z'

/**
 * portal-contract 2.7.0 requires `hidingSince` whenever `currentFocus` names a hiding
 * mode, so a hiding payload built without it describes a state the producer cannot
 * emit. Every payload below is built here so these cases stay on-contract even though
 * updateFocusOverlay reads only `currentFocus`.
 */
function focusPayload(currentFocus: string): FocusExport {
  const payload: FocusExport = {generatedAt: GENERATED_AT, currentFocus}
  if ((HIDING_FOCUS_MODES as readonly string[]).includes(currentFocus)) {
    payload.hidingSince = HIDING_SINCE
  }
  return payload
}

function setup() {
  document.body.innerHTML = `
    <div id="focusOverlay" style="display:none">
      <div id="focusClock"></div>
    </div>
    <div id="dndOverlay" style="display:none">
      <div id="dndClock"></div>
    </div>
  `
}

describe('updateFocusOverlay', () => {
  beforeEach(() => {
    setup()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('hides both overlays when data is null', () => {
    updateFocusOverlay(null)
    expect((document.getElementById('focusOverlay') as HTMLElement).style.display).toBe('none')
    expect((document.getElementById('dndOverlay') as HTMLElement).style.display).toBe('none')
  })

  it('hides both overlays when focus is unrecognized', () => {
    updateFocusOverlay(focusPayload('Personal'))
    expect((document.getElementById('focusOverlay') as HTMLElement).style.display).toBe('none')
    expect((document.getElementById('dndOverlay') as HTMLElement).style.display).toBe('none')
  })

  it('shows focusOverlay when focus is "Work"', () => {
    updateFocusOverlay(focusPayload('Work'))
    expect((document.getElementById('focusOverlay') as HTMLElement).style.display).toBe('flex')
  })

  it('keeps dndOverlay hidden when focus is "Work"', () => {
    updateFocusOverlay(focusPayload('Work'))
    expect((document.getElementById('dndOverlay') as HTMLElement).style.display).toBe('none')
  })

  it('shows dndOverlay when focus is "Do Not Disturb"', () => {
    updateFocusOverlay(focusPayload('Do Not Disturb'))
    expect((document.getElementById('dndOverlay') as HTMLElement).style.display).toBe('flex')
  })

  it('keeps focusOverlay hidden when focus is "Do Not Disturb"', () => {
    updateFocusOverlay(focusPayload('Do Not Disturb'))
    expect((document.getElementById('focusOverlay') as HTMLElement).style.display).toBe('none')
  })

  it('sets clock text immediately when focus is "Work"', () => {
    updateFocusOverlay(focusPayload('Work'))
    const clock = document.getElementById('focusClock') as HTMLElement
    expect(clock.textContent).toMatch(/\d{2}:\d{2}:\d{2}/)
  })

  it('sets clock text immediately when focus is "Do Not Disturb"', () => {
    updateFocusOverlay(focusPayload('Do Not Disturb'))
    const clock = document.getElementById('dndClock') as HTMLElement
    expect(clock.textContent).toMatch(/\d{2}:\d{2}:\d{2}/)
  })

  it('does not throw when overlay elements are missing', () => {
    document.body.innerHTML = ''
    expect(() => updateFocusOverlay(focusPayload('Work'))).not.toThrow()
  })

  it('transitions from Work to null hiding the overlay', () => {
    updateFocusOverlay(focusPayload('Work'))
    expect((document.getElementById('focusOverlay') as HTMLElement).style.display).toBe('flex')
    updateFocusOverlay(null)
    expect((document.getElementById('focusOverlay') as HTMLElement).style.display).toBe('none')
  })
})
