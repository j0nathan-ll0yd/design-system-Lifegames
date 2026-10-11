// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {updateExplorationOdometerV3} from '../../src/runtime/updaters-odometer-variations'
import type {LocationExport} from '../../src/runtime/location-types'

function makeExport(overrides: Partial<LocationExport> = {}): LocationExport {
  return {
    generatedAt: '2026-03-18T12:00:00.000Z',
    totalVisits: 1850,
    totalPlaces: 35,
    totalDurationHours: 180,
    citiesVisited: 12,
    currentCity: 'San Francisco',
    lastSeen: null,
    last90Days: [],
    topPlaces: [],
    cityBreakdown: [],
    categoryBreakdown: [],
    streaks: {currentStreak: 0, longestStreak: 0, totalActiveDays: 0},
    explorationStats: {totalNeighborhoods: 18, totalCities: 12, totalStates: 3},
    ...overrides
  }
}

// The slots ExplorationOdometerV3.astro server-renders, with its placeholders.
function setup() {
  document.body.innerHTML = `
    <div class="tri-card is-loading" id="cardExplorationOdometerV3">
      <span data-loc="odo-v3-visits">---</span>
      <span data-loc="odo-v3-places">---</span>
      <span data-loc="odo-v3-cities">---</span>
      <span data-loc="odo-v3-states">---</span>
      <span data-loc="odo-v3-city">San Francisco</span>
      <span data-loc="odo-v3-days">---</span>
    </div>
  `
}

function slot(name: string): string | null {
  return document.querySelector(`[data-loc="odo-v3-${name}"]`)!.textContent
}

describe('updateExplorationOdometerV3', () => {
  beforeEach(() => {
    setup()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-18T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not throw when the card is missing', () => {
    document.body.innerHTML = ''
    expect(() => updateExplorationOdometerV3(makeExport())).not.toThrow()
  })

  it('writes every counter, grouped, and replaces the --- placeholders', () => {
    updateExplorationOdometerV3(makeExport())
    expect(slot('visits')).toBe('1,850')
    expect(slot('places')).toBe('35')
    expect(slot('cities')).toBe('12')
    expect(slot('states')).toBe('3')
    expect(slot('city')).toBe('San Francisco')
    expect(document.body.textContent).not.toContain('---')
  })

  it('removes is-loading after the update', () => {
    updateExplorationOdometerV3(makeExport())
    expect(document.getElementById('cardExplorationOdometerV3')!.classList.contains('is-loading')).toBe(false)
  })

  it('clears the server-rendered city when the export has no current city', () => {
    updateExplorationOdometerV3(makeExport({currentCity: null}))
    expect(slot('city')).toBe('')
  })

  it('renders an export with no visits as zero counters, not placeholders', () => {
    updateExplorationOdometerV3(makeExport({totalVisits: 0, totalPlaces: 0, explorationStats: {totalNeighborhoods: 0, totalCities: 0, totalStates: 0}}))
    expect([slot('visits'), slot('places'), slot('cities'), slot('states')]).toEqual(['0', '0', '0', '0'])
    expect(document.getElementById('cardExplorationOdometerV3')!.classList.contains('is-loading')).toBe(false)
  })

  it('shows a city name with markup characters as written, not as entities', () => {
    updateExplorationOdometerV3(makeExport({currentCity: 'Saint-Jean & "Les <Bains>"'}))
    expect(slot('city')).toBe('Saint-Jean & "Les <Bains>"')
    expect(document.querySelector('[data-loc="odo-v3-city"]')!.children).toHaveLength(0)
  })

  it('leaves a missing slot alone and still fills the others', () => {
    document.querySelector('[data-loc="odo-v3-days"]')!.remove()
    updateExplorationOdometerV3(makeExport())
    expect(slot('visits')).toBe('1,850')
    expect(document.getElementById('cardExplorationOdometerV3')!.classList.contains('is-loading')).toBe(false)
  })

  describe('days since tracking started (midnight 2 March 2026, America/Los_Angeles)', () => {
    it('counts whole days', () => {
      vi.setSystemTime(new Date('2026-03-18T12:00:00Z'))
      updateExplorationOdometerV3(makeExport())
      expect(slot('days')).toBe('16 days')
    })

    it('reads 0 days one second before the first Los Angeles midnight', () => {
      vi.setSystemTime(new Date('2026-03-03T07:59:59Z'))
      updateExplorationOdometerV3(makeExport())
      expect(slot('days')).toBe('0 days')
    })

    it('uses the singular at exactly one day', () => {
      vi.setSystemTime(new Date('2026-03-03T08:00:00Z'))
      updateExplorationOdometerV3(makeExport())
      expect(slot('days')).toBe('1 day')
    })
  })
})

describe('updateExplorationOdometerV3 day count is independent of the host time zone', () => {
  const hostZone = process.env.TZ

  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
    if (hostZone === undefined) {
      delete process.env.TZ
    } else {
      process.env.TZ = hostZone
    }
  })

  // TRACKING_START is computed at import, so each zone re-imports the module.
  for (const zone of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles']) {
    it(`reads 0 days at 07:59:59Z on 3 March with the host in ${zone}`, async () => {
      process.env.TZ = zone
      vi.resetModules()
      const mod = await import('../../src/runtime/updaters-odometer-variations')
      setup()
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-03-03T07:59:59Z'))
      mod.updateExplorationOdometerV3(makeExport())
      expect(slot('days')).toBe('0 days')
    })
  }
})
