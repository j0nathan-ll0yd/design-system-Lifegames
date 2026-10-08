// Updater behavior for the honest widget states (atlas decision 0160):
// a null measurement renders the no-reading mark, never 0; a server-rendered
// unavailable or suppressed card recovers when live data arrives; relative
// times render as <time datetime>.
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {initHydration} from '../../src/runtime/hydration-init'
import {releaseSuppression, revealLiveData} from '../../src/runtime/updater-empty'
import {
  updateBookshelf,
  updateDevActivityLog,
  updateHeartRate,
  updateHydration,
  updateNightSummary,
  updateReadingFeed,
  updateStarredRepos,
  updateSystemStatus,
  updateWorkouts
} from '../../src/runtime/updaters'
import {updateHeartRateFooter, updateMovementRings} from '../../src/runtime/updaters-movement'
import {THEATRE_SITE, theatreCardsHtml, updateTheatreReviews} from '../../src/runtime/updaters-theatre'
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
      <div id="cardHydration" class="is-loading" data-ssr-state="unavailable">
        <div data-state-notice="unavailable">Data unavailable</div>
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

  it('recovers a server-unavailable card and clears the skeleton', () => {
    updateHydration(health({waterOz: 60, caffeineMg: 153}))
    expect(el('cardHydration').dataset.ssrState).toBe('live')
    expect(document.querySelector('[data-state-notice]')).toBeNull()
    expect(el('cardHydration').classList.contains('is-loading')).toBe(false)
    expect(el('hydraWaterVal').textContent).toBe('60 oz')
  })

  it('never un-suppresses a suppressed card: the update writes nothing (M4)', () => {
    el('cardHydration').dataset.ssrState = 'suppressed'
    updateHydration(health({waterOz: 60, caffeineMg: 153}))
    expect(el('cardHydration').dataset.ssrState).toBe('suppressed')
    expect(document.querySelector('[data-state-notice]')).not.toBeNull()
    expect(el('hydraWaterVal').textContent).toBe('')
    expect((document.querySelector('[data-state-scaffold]') as HTMLElement).hidden).toBe(true)
  })

  it('updates again once the focus gate releases the suppression', () => {
    el('cardHydration').dataset.ssrState = 'suppressed'
    releaseSuppression(el('cardHydration'))
    updateHydration(health({waterOz: 60, caffeineMg: 153}))
    expect(el('cardHydration').dataset.ssrState).toBe('live')
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

describe('review fixes: header, state attribute and fabricated values', () => {
  it('revealLiveData restores the live label over a stale "as of" time and drops the old provenance', () => {
    document.body.innerHTML = `
      <div id="card" data-ssr-state="stale" data-generated-at="2026-03-18T09:00:00Z">
        <div class="widget-header"><time class="widget-timestamp widget-timestamp-stale" id="ts" datetime="2026-03-18T09:00:00Z" data-live-label="live">as of Mar 18, 2:00 AM PDT</time></div>
      </div>`
    revealLiveData(el('card'))
    const ts = el('ts')
    expect(ts.tagName).toBe('SPAN')
    expect(ts.textContent).toBe('live')
    expect(ts.hasAttribute('datetime')).toBe(false)
    expect(el('card').dataset.ssrState).toBe('live')
    expect(el('card').dataset.generatedAt).toBeUndefined()
  })

  it('an empty update records the card as empty, not live', () => {
    document.body.innerHTML = `
      <div id="cardReading" data-ssr-state="unavailable"><div class="widget-body"><div data-state-notice="unavailable"></div></div></div>
      <div id="cardBooks" data-ssr-state="unavailable"><div class="widget-body"></div></div>`
    updateReadingFeed([])
    expect(el('cardReading').dataset.ssrState).toBe('empty')
    updateBookshelf({books: [], bookMeta: {}, statusLabels: {}, stats: {total: 0, reading: 0, completed: 0, upcoming: 0}})
    expect(el('cardBooks').dataset.ssrState).toBe('empty')
  })

  it('HeartRate stays unavailable when the update carries no heart rate', () => {
    document.body.innerHTML = `
      <div id="cardHR" data-ssr-state="unavailable"><div data-state-notice="unavailable"></div><div class="hr-data" data-state-scaffold hidden><span id="pulseBpm"></span></div></div>`
    updateHeartRate({...health({}), quantities: {}})
    expect(el('cardHR').dataset.ssrState).toBe('unavailable')
    expect(document.querySelector('[data-state-notice]')).not.toBeNull()
  })

  it('MovementRings keeps a server-rendered empty notice for an all-zero update', () => {
    document.body.innerHTML = `
      <div id="cardMovement" class="is-loading" data-ssr-state="empty"><div class="mv-empty" data-state-notice="empty"></div><div class="mv-data" data-state-scaffold hidden></div></div>`
    const zero = {value: 0, unit: 'count'}
    updateMovementRings({...health({}), quantities: {stepCount: zero, distanceWalkingRunning: zero, activeEnergyBurned: zero}})
    expect(document.querySelector('[data-state-notice="empty"]')).not.toBeNull()
    expect((document.querySelector('.mv-data') as HTMLElement).hidden).toBe(true)
    expect(el('cardMovement').classList.contains('is-loading')).toBe(false)
  })

  it('Dev Log renders no "+0 -0" for a commit without line counts', () => {
    document.body.innerHTML = '<div id="cardDevLog"><div class="widget-body"></div></div>'
    updateDevActivityLog([{type: 'commit', repo: 'r', title: 't', date: '2h ago', hash: 'abc1234', url: ''}])
    expect(document.querySelector('.gh-dal-detail')).toBeNull()
    updateDevActivityLog([{type: 'commit', repo: 'r', title: 't', date: '2h ago', hash: 'abc1234', additions: 12, deletions: 3, url: ''}])
    expect(document.querySelector('.gh-dal-detail')?.textContent).toBe('+12 -3')
  })

  it('NightSummary renders a missing phase as no reading and drops the caption', () => {
    document.body.innerHTML = `
      <div id="cardSleep"><div id="sleepDuration"></div><div id="sleepScoreVal"></div><div id="sleepScoreFill"></div>
      <div data-phase="deep"><span class="sleep-moon-pill-val"></span></div><div id="sleepInsight">old caption</div><div id="sleepTimestamp"></div></div>`
    updateNightSummary({
      isEmpty: false,
      date: '2026-03-18',
      sleepScore: 80,
      sleepDurationFormatted: '4h 30m',
      sleepPhaseFormatted: {deep: '', rem: '1h 30m', core: '3h', awake: ''},
      derived: {deepPct: null, remPct: null, corePct: null},
      phases: {deep: null, rem: 5400, core: 10800, awake: null}
    })
    expect(document.querySelector('[data-phase="deep"] .sleep-moon-pill-val')?.textContent).toBe(NO_READING)
    expect(el('sleepInsight').innerHTML).toBe('')
  })
})

describe('theatre cards link only to https', () => {
  it('drops a javascript: review URL from the href', () => {
    const html = theatreCardsHtml([{
      title: 'T',
      url: 'javascript:alert(1)',
      rating: null,
      imageUrl: null,
      imageUrlAvif: null,
      imageUrlCard: null,
      imageUrlCardAvif: null
    }])
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('href=')
    expect(
      theatreCardsHtml([{
        title: 'T',
        url: 'https://example.com/r',
        rating: null,
        imageUrl: null,
        imageUrlAvif: null,
        imageUrlCard: null,
        imageUrlCardAvif: null
      }])
    ).toContain('href="https://example.com/r"')
  })
})

describe('revealLiveData and suppression (M4)', () => {
  it('refuses to leave suppressed without the flag, and leaves it with the flag', () => {
    document.body.innerHTML = '<div id="c" data-ssr-state="suppressed"><div data-state-notice="suppressed"></div></div>'
    expect(revealLiveData(el('c'))).toBe(false)
    expect(el('c').dataset.ssrState).toBe('suppressed')
    expect(document.querySelector('[data-state-notice]')).not.toBeNull()
    expect(revealLiveData(el('c'), 'live', {leaveSuppressed: true})).toBe(true)
    expect(el('c').dataset.ssrState).toBe('live')
  })

  it('every updater skips writes on a suppressed card', () => {
    document.body.innerHTML = `
      <div id="cardReading" data-ssr-state="suppressed"><div class="widget-body"><span id="marker">kept</span></div></div>
      <div id="cardBooks" data-ssr-state="suppressed"><div class="widget-body"><span id="marker2">kept</span></div></div>`
    updateReadingFeed([])
    updateBookshelf({books: [], bookMeta: {}, statusLabels: {}, stats: {total: 0, reading: 0, completed: 0, upcoming: 0}})
    expect(el('marker').textContent).toBe('kept')
    expect(el('marker2').textContent).toBe('kept')
    expect(el('cardReading').dataset.ssrState).toBe('suppressed')
  })
})

// ── Review of PR #289, H1: client updaters render the no-reading mark per field ──

describe('client: a field the update omits renders the no-reading mark', () => {
  it('HeartRate with only a heart rate: HRV, RHR, RR and temperature read "—"', () => {
    document.body.innerHTML = `
      <div id="cardHR"><span id="pulseBpm"></span><span id="hrZoneBadge"></span><span id="hrHrvValue"></span>
      <span id="hrFooterRhr"></span><span id="hrFooterRr"></span><span id="hrFooterTemp"></span></div>`
    const h = {...health({}), quantities: {heartRate: {value: 97, unit: 'count/min'}}}
    updateHeartRate(h)
    updateHeartRateFooter(h)
    expect(el('pulseBpm').textContent).toBe('97')
    for (const id of ['hrHrvValue', 'hrFooterRhr', 'hrFooterRr', 'hrFooterTemp']) {
      expect(el(id).textContent, id).toBe(NO_READING)
    }
  })

  it('HeartRate with a heart rate of 0 and an HRV: the BPM reads "—", as on the server', () => {
    document.body.innerHTML = '<div id="cardHR"><span id="pulseBpm"></span><span id="hrHrvValue"></span></div>'
    updateHeartRate({...health({}), quantities: {heartRate: {value: 0, unit: 'count/min'}, hrvSDNN: {value: 40, unit: 'ms'}}})
    expect(el('pulseBpm').textContent).toBe(NO_READING)
    expect(el('hrHrvValue').textContent).toBe('40')
  })

  it('MovementRings with only steps: every other slot reads "—"', () => {
    document.body.innerHTML = `
      <div id="cardMovement"><div class="mv-rings"><svg role="img"></svg></div>
      <span id="ringCenterPct"></span><span data-mv-metric="steps"></span><span data-mv-metric="distance"></span>
      <span data-mv-metric="flights"></span><span id="legendMove"></span><span id="legendExercise"></span>
      <span id="legendStand"></span><span id="mvDaylightMin"></span><span id="mvDaylightHit"></span>
      <span id="mvSunrise"></span><span id="mvSunset"></span><div id="mvSunDot"></div></div>`
    updateMovementRings({...health({}), quantities: {stepCount: {value: 12345, unit: 'count'}}})
    expect(document.querySelector('[data-mv-metric="steps"]')?.textContent).toBe('12,345')
    expect(document.querySelector('[data-mv-metric="distance"]')?.textContent).toBe(`${NO_READING}km`)
    expect(document.querySelector('[data-mv-metric="flights"]')?.textContent).toBe(NO_READING)
    for (const id of ['ringCenterPct', 'mvDaylightMin', 'mvSunrise', 'mvSunset']) {
      expect(el(id).textContent, id).toBe(NO_READING)
    }
    for (const id of ['legendMove', 'legendExercise', 'legendStand']) {
      expect(el(id).textContent, id).toMatch(new RegExp(`^${NO_READING}/\\d+$`))
    }
  })

  it('MovementRings without steps: the steps slot reads "—"', () => {
    document.body.innerHTML = '<div id="cardMovement"><span data-mv-metric="steps"></span><span data-mv-metric="flights"></span></div>'
    updateMovementRings({...health({}), quantities: {flightsClimbed: {value: 12, unit: 'count'}}})
    expect(document.querySelector('[data-mv-metric="steps"]')?.textContent).toBe(NO_READING)
    expect(document.querySelector('[data-mv-metric="flights"]')?.textContent).toBe('12')
  })

  it('NightSummary missing one stage: the total reads "—"', () => {
    document.body.innerHTML = `
      <div id="cardSleep"><div id="sleepDuration"></div><div id="sleepScoreVal"></div><div id="sleepScoreFill"></div>
      <div data-phase="deep"><span class="sleep-moon-pill-val"></span></div><div id="sleepInsight"></div><div id="sleepTimestamp"></div></div>`
    updateNightSummary({
      isEmpty: false,
      date: '2026-03-18',
      sleepScore: 80,
      sleepDurationFormatted: '',
      sleepPhaseFormatted: {deep: '', rem: '1h 30m', core: '3h', awake: ''},
      derived: {deepPct: null, remPct: null, corePct: null},
      phases: {deep: null, rem: 5400, core: 10800, awake: null}
    })
    expect(el('sleepDuration').textContent).toBe(NO_READING)
    expect(document.querySelector('[data-phase="deep"] .sleep-moon-pill-val')?.textContent).toBe(NO_READING)
  })

  it('an empty sleep update records the card as empty, not live', () => {
    document.body.innerHTML =
      '<div id="cardSleep" data-ssr-state="unavailable"><div id="sleepDuration"></div><div id="sleepScoreVal"></div><div id="sleepInsight"></div><div id="sleepTimestamp"></div></div>'
    updateNightSummary({
      isEmpty: true,
      date: '2026-03-18',
      sleepScore: null,
      sleepDurationFormatted: '',
      sleepPhaseFormatted: {},
      derived: {deepPct: null, remPct: null, corePct: null},
      phases: {}
    })
    expect(el('cardSleep').dataset.ssrState).toBe('empty')
  })

  it('Starred repos: a non-https repository URL renders no href', () => {
    document.body.innerHTML = '<div id="cardStarredRepos"><div class="widget-body"><div class="gh-starred-list"></div></div></div>'
    updateStarredRepos([{owner: 'o', name: 'n', url: 'javascript:alert(1)', stars: 3, language: 'Go', languageColor: '#00ADD8', starredAt: '2 days ago'}])
    expect(document.querySelector('.gh-sl-name')?.hasAttribute('href')).toBe(false)
  })
})

describe('TheatreReviews header slot', () => {
  it('a live update turns the empty non-data slot back into the review-site link', () => {
    document.body.innerHTML = `
      <div id="cardTheatreReviews" data-ssr-state="unavailable"><div class="widget-header"><span class="widget-timestamp theatre-count-link" id="theatreCount"></span></div>
      <div class="widget-body"><div id="theatreRow" data-state-scaffold hidden></div></div></div>`
    updateTheatreReviews({
      generatedAt: '2026-03-18T12:00:00Z',
      source: 'coasttocoastreviews.com',
      totalReviews: 3,
      reviews: [{
        title: 'T',
        slug: 't',
        url: 'https://example.com/t',
        author: 'a',
        publishedAt: '2026-03-01',
        rating: null,
        ratingNumeric: null,
        excerpt: '',
        imageVersion: null,
        imageUrl: null,
        imageWidth: null,
        imageHeight: null,
        imageUrlAvif: null,
        imageUrlCard: null,
        imageUrlCardAvif: null
      }]
    })
    const link = el('theatreCount')
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe(THEATRE_SITE)
    expect(link.textContent).toBe('3 reviews')
  })
})
