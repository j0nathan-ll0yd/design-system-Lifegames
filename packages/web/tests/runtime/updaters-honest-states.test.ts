// Updater behavior for the honest widget states (atlas decision 0160):
// a null measurement renders the no-reading mark, never 0; a server-rendered
// unavailable or suppressed card recovers when live data arrives; relative
// times render as <time datetime>.
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {initHydration} from '../../src/runtime/hydration-init'
import {revealLiveData} from '../../src/runtime/updater-empty'
import {
  updateDevActivityLog,
  updateHydration,
  updateNightSummary,
  updateReadingFeed,
  updateStarredRepos,
  updateSystemStatus,
  updateWorkouts
} from '../../src/runtime/updaters'
import type {AdaptedHealth, AdaptedSleep} from '../../src/runtime/adapters'
import {NO_READING} from '../../src/runtime/widget-state'

function el(id: string): HTMLElement {
  const e = document.getElementById(id)
  if (!e) {
    throw new Error(`Missing #${id}`)
  }
  return e
}

function health(hydration: Partial<AdaptedHealth['hydration']>): AdaptedHealth {
  return {
    date: '2026-03-18',
    quantities: {},
    derived: {totalCalories: null, deepPct: null, remPct: null, corePct: null},
    sleepScore: null,
    sleepDurationFormatted: '',
    sleepPhaseFormatted: {},
    hydration: {
      waterOz: null,
      caffeineMg: null,
      waterMax: 140,
      caffeineMax: 500,
      waterRangeLo: 74,
      waterRangeHi: 125,
      caffeineRangeLo: 200,
      caffeineRangeHi: 400,
      ...hydration
    }
  }
}

describe('revealLiveData', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="card" class="tri-card" data-ssr-state="unavailable">
        <div class="widget-body">
          <div class="widget-empty" data-state-notice="unavailable">Data unavailable</div>
          <div id="scaffold" data-state-scaffold hidden></div>
        </div>
      </div>`
  })

  it('removes the notice, reveals the scaffold and records the card as live', () => {
    revealLiveData(el('card'))
    expect(document.querySelector('[data-state-notice]')).toBeNull()
    expect(el('scaffold').hidden).toBe(false)
    expect(el('card').dataset.ssrState).toBe('live')
  })

  it('is a no-op for null and for a card that never carried a state', () => {
    expect(() => revealLiveData(null)).not.toThrow()
    document.body.innerHTML = '<div id="plain"></div>'
    revealLiveData(el('plain'))
    expect(el('plain').dataset.ssrState).toBeUndefined()
  })
})

describe('updateHydration with missing measurements', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="cardHydration" class="is-loading" data-ssr-state="suppressed">
        <div data-state-notice="suppressed">Hidden during focus</div>
        <div data-state-scaffold hidden>
          <div id="hydraWaterLiq"></div><div id="hydraWaterVal"></div>
          <div id="hydraCoffeeLiq"></div><div id="hydraCoffeeVal"></div><div id="hydraCoffeeLabel"></div>
        </div>
      </div>`
  })

  it('renders the no-reading mark for null water and caffeine, never 0', () => {
    updateHydration(health({}))
    expect(el('hydraWaterVal').textContent).toBe(NO_READING)
    expect(el('hydraCoffeeVal').textContent).toBe(NO_READING)
    expect(el('hydraWaterLiq').style.clipPath).toBe('inset(100% 0 0 0)')
  })

  it('renders a measured zero as 0 oz', () => {
    updateHydration(health({waterOz: 0, caffeineMg: 0}))
    expect(el('hydraWaterVal').textContent).toBe('0 oz')
    expect(el('hydraCoffeeVal').textContent).toBe('0 mg')
  })

  it('recovers a server-suppressed card and clears the skeleton', () => {
    updateHydration(health({waterOz: 60, caffeineMg: 153}))
    expect(el('cardHydration').dataset.ssrState).toBe('live')
    expect(document.querySelector('[data-state-notice]')).toBeNull()
    expect(el('cardHydration').classList.contains('is-loading')).toBe(false)
    expect(el('hydraWaterVal').textContent).toBe('60 oz')
  })
})

describe('initHydration keeps a server-rendered value', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({matches: false}))
    // A frame clock that advances 1.3 s per frame: the 1.2 s count-up finishes
    // in two frames.
    let clock = 0
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      clock += 1300
      cb(clock)
      return 0
    })
  })

  function mount(ssrState: string, value: string): HTMLElement {
    document.body.innerHTML = `
      <div id="cardHydration" class="tri-card" data-ssr-state="${ssrState}">
        <div class="hydra-bottle-body"><div class="hydra-range"></div></div>
        <div class="hydra-mug-body"><div class="hydra-range"></div></div>
        <div id="hydraWaterLiq"></div><div id="hydraWaterVal">${value}</div>
        <div id="hydraCoffeeLiq"></div><div id="hydraCoffeeVal">153 mg</div>
      </div>`
    return el('cardHydration')
  }
  const fixture = {
    state: 'live' as const,
    health: {
      hydration: {
        waterOz: 60,
        caffeineMg: 153,
        waterMax: 140,
        waterRangeLo: 74,
        waterRangeHi: 125,
        caffeineMax: 500,
        caffeineRangeLo: 200,
        caffeineRangeHi: 400
      }
    }
  }

  it('does not count up from 0 and marks the values as already updated', () => {
    const card = mount('live', '60 oz')
    initHydration(card, fixture)
    expect(el('hydraWaterVal').textContent).toBe('60 oz')
    expect(el('hydraWaterVal').dataset.liveUpdated).toBe('1')
    expect(el('hydraCoffeeVal').dataset.liveUpdated).toBe('1')
    expect(card.querySelectorAll('.hydra-range').length).toBe(2)
  })

  it('still counts up for a pre-0160 server render with no state', () => {
    document.body.innerHTML = `
      <div id="cardHydration" class="tri-card is-loading">
        <div class="hydra-bottle-body"></div><div class="hydra-mug-body"></div>
        <div id="hydraWaterLiq"></div><div id="hydraWaterVal"></div>
        <div id="hydraCoffeeLiq"></div><div id="hydraCoffeeVal"></div>
      </div>`
    initHydration(el('cardHydration'), {health: fixture.health})
    expect(el('hydraWaterVal').textContent).toBe('60 oz')
    expect(el('cardHydration').querySelectorAll('.hydra-range').length).toBe(2)
    expect(el('cardHydration').classList.contains('is-loading')).toBe(false)
  })

  it('shows no reading for a null measurement instead of counting to 0', () => {
    document.body.innerHTML = `
      <div id="cardHydration" class="tri-card is-loading">
        <div id="hydraWaterLiq"></div><div id="hydraWaterVal"></div>
        <div id="hydraCoffeeLiq"></div><div id="hydraCoffeeVal"></div>
      </div>`
    initHydration(el('cardHydration'), {health: {hydration: {...fixture.health.hydration, waterOz: null, caffeineMg: null}}})
    expect(el('hydraWaterVal').textContent).toBe(NO_READING)
    expect(el('hydraCoffeeVal').textContent).toBe(NO_READING)
  })

  it('returns without touching the DOM when no hydration is supplied', () => {
    const card = mount('suppressed', '')
    initHydration(card, {state: 'suppressed'})
    expect(el('hydraWaterVal').textContent).toBe('')
  })
})

describe('updateWorkouts and updateNightSummary with missing measurements', () => {
  it('Workouts: null duration and calories render the no-reading mark', () => {
    document.body.innerHTML = '<div id="cardWorkouts"><div class="widget-body"></div></div>'
    updateWorkouts([{activityType: 'Yoga', duration: null, energyBurned: null, distance: null, source: 'watch'}])
    const values = [...document.querySelectorAll('.workout-stat-value')].map((v) => v.textContent)
    expect(values).toEqual([NO_READING, NO_READING])
  })

  it('NightSummary: a null sleep score renders the no-reading mark and an empty bar', () => {
    document.body.innerHTML =
      '<div id="cardSleep"><div id="sleepDuration"></div><div id="sleepScoreVal"></div><div id="sleepScoreFill"></div><div id="sleepInsight"></div><div id="sleepTimestamp"></div></div>'
    const sleep: AdaptedSleep = {
      isEmpty: false,
      date: '2026-03-18',
      sleepScore: null,
      sleepDurationFormatted: '7h 0m',
      sleepPhaseFormatted: {deep: '1h', rem: '1h', core: '4h', awake: '1h'},
      derived: {deepPct: 14, remPct: 14, corePct: 57},
      phases: {deep: 3600, rem: 3600, core: 14400, awake: 3600}
    }
    updateNightSummary(sleep)
    expect(el('sleepScoreVal').textContent).toBe(NO_READING)
    expect(el('sleepScoreFill').style.width).toBe('0%')
  })
})

describe('relative times render as <time datetime>', () => {
  it('Dev Log, Reading Feed and Starred Repos', () => {
    document.body.innerHTML = `
      <div id="cardDevLog"><div class="widget-body"></div></div>
      <div id="cardReading"><div class="widget-body"></div></div>
      <div id="cardStarredRepos"><div class="widget-body"><div class="gh-starred-list" data-state-scaffold hidden></div></div></div>`
    updateDevActivityLog([{type: 'commit', repo: 'r', title: 't', date: '2h ago', datetime: '2026-03-18T10:00:00Z', url: ''}])
    updateReadingFeed([{title: 'a', url: '', source: 's', date: '3h ago', datetime: '2026-03-18T09:00:00Z', hasNotes: false, noteText: null}])
    updateStarredRepos([{
      owner: 'o',
      name: 'n',
      url: 'https://example.com',
      stars: 3,
      language: 'Go',
      languageColor: '#00ADD8',
      starredAt: '2 days ago',
      datetime: '2026-03-16T12:00:00Z'
    }])
    expect(document.querySelector('time.gh-dal-date')?.getAttribute('datetime')).toBe('2026-03-18T10:00:00Z')
    expect(document.querySelector('time.article-list-date')?.getAttribute('datetime')).toBe('2026-03-18T09:00:00Z')
    expect(document.querySelector('time.gh-sl-date')?.getAttribute('datetime')).toBe('2026-03-16T12:00:00Z')
    // The server hid the empty list scaffold; live data reveals it.
    expect((document.querySelector('.gh-starred-list') as HTMLElement).hidden).toBe(false)
  })
})

describe('updateSystemStatus shares composeSystemLines', () => {
  it('writes the composed row into the matching server-rendered line', () => {
    document.body.innerHTML = `
      <div id="systemStatus">
        <div class="sys-line" data-source="health"><div class="sys-dot"></div><span class="sys-key">Health:</span><span class="sys-val"></span></div>
      </div>`
    updateSystemStatus({health: '2026-03-18T10:00:00.000Z'}, Date.parse('2026-03-18T12:00:00.000Z'))
    expect(document.querySelector('.sys-line .sys-val-green')?.innerHTML).toBe(
      'ACTIVE <span class="sys-val">(<time datetime="2026-03-18T10:00:00.000Z">2h ago</time>)</span>'
    )
    expect(document.querySelector('.sys-dot')?.className).toBe('sys-dot sys-dot-red')
  })
})
