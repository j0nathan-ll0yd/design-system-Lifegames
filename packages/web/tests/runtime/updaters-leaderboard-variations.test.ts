// @vitest-environment jsdom
import {beforeEach, describe, expect, it} from 'vitest'
import {widgets} from '@j0nathan-ll0yd/copy'
import {updatePlaceLeaderboardV3} from '../../src/runtime/updaters-leaderboard-variations'
import {getCategoryColor} from '../../src/runtime/updaters'
import type {LocationExport} from '../../src/runtime/location-types'

type TopPlace = LocationExport['topPlaces'][number]

function place(name: string, visitCount: number, category: string | null = 'Dining'): TopPlace {
  return {name, category, visitCount, totalDurationMinutes: visitCount * 30, lastVisitAt: null}
}

function makeExport(topPlaces: TopPlace[]): LocationExport {
  return {
    generatedAt: '2026-03-18T12:00:00.000Z',
    totalVisits: topPlaces.reduce((n, p) => n + p.visitCount, 0),
    totalPlaces: topPlaces.length,
    totalDurationHours: 0,
    citiesVisited: 1,
    currentCity: null,
    lastSeen: null,
    last90Days: [],
    topPlaces,
    cityBreakdown: [],
    categoryBreakdown: [],
    streaks: {currentStreak: 0, longestStreak: 0, totalActiveDays: 0},
    explorationStats: {totalNeighborhoods: 0, totalCities: 1, totalStates: 1}
  }
}

const TEN_PLACES = [
  place('Blue Bottle', 48),
  place('Golden Gate Park', 41, 'Fitness & Outdoors'),
  place('Ferry Building', 33, 'Shopping'),
  place('Tartine', 27),
  place('Crissy Field', 22, 'Fitness & Outdoors'),
  place('City Lights', 18, 'Shopping'),
  place('Library', 12, 'Education'),
  place('Zuni', 9),
  place('Ninth', 5),
  place('Tenth', 2)
]

// The slots PlaceLeaderboardV3.astro server-renders, with its podium placeholder.
function setup() {
  document.body.innerHTML = `
    <div class="tri-card is-loading" id="cardPlaceLeaderboardV3">
      <div data-loc="lb-v3-podium"><div class="skeleton-bar"></div></div>
      <div data-loc="lb-v3-list"></div>
    </div>
  `
}

const card = () => document.getElementById('cardPlaceLeaderboardV3')!
const podiumRows = () => [...document.querySelectorAll<HTMLElement>('.lb-v3-podium-row')]
const listRows = () => [...document.querySelectorAll<HTMLElement>('.lb-v3-list-row')]

describe('updatePlaceLeaderboardV3', () => {
  beforeEach(setup)

  it('does not throw when the card is missing', () => {
    document.body.innerHTML = ''
    expect(() => updatePlaceLeaderboardV3(makeExport(TEN_PLACES))).not.toThrow()
  })

  it('removes is-loading and renders nothing when the podium or list slot is missing', () => {
    document.querySelector('[data-loc="lb-v3-list"]')!.remove()
    updatePlaceLeaderboardV3(makeExport(TEN_PLACES))
    expect(card().classList.contains('is-loading')).toBe(false)
    expect(podiumRows()).toHaveLength(0)
  })

  it('shows the empty notice, clears the list, and removes is-loading when there are no places', () => {
    document.querySelector('[data-loc="lb-v3-list"]')!.innerHTML = '<div class="lb-v3-list-row">old</div>'
    updatePlaceLeaderboardV3(makeExport([]))
    expect(document.querySelector('[data-loc="lb-v3-podium"]')!.textContent).toBe(widgets.topPlaces.empty)
    expect(document.querySelector('[data-loc="lb-v3-list"]')!.innerHTML).toBe('')
    expect(document.querySelector('.skeleton-bar')).toBeNull()
    expect(card().classList.contains('is-loading')).toBe(false)
  })

  it('puts the top three on the podium and ranks 4–8 in the list, replacing the skeleton', () => {
    updatePlaceLeaderboardV3(makeExport(TEN_PLACES.slice(0, 8)))
    expect(
      podiumRows().map((r) => [r.dataset.rank, r.querySelector('.lb-v3-podium-name')!.textContent, r.querySelector('.lb-v3-podium-count')!.textContent])
    ).toEqual([
      ['1', 'Blue Bottle', '48'],
      ['2', 'Golden Gate Park', '41'],
      ['3', 'Ferry Building', '33']
    ])
    expect(listRows().map((r) => [r.dataset.rank, r.querySelector('.lb-v3-list-name')!.textContent])).toEqual([
      ['4', 'Tartine'],
      ['5', 'Crissy Field'],
      ['6', 'City Lights'],
      ['7', 'Library'],
      ['8', 'Zuni']
    ])
    expect(document.querySelector('.skeleton-bar')).toBeNull()
    expect(card().classList.contains('is-loading')).toBe(false)
  })

  it('shows at most eight places', () => {
    updatePlaceLeaderboardV3(makeExport(TEN_PLACES))
    expect(podiumRows().length + listRows().length).toBe(8)
    expect(document.body.textContent).not.toContain('Ninth')
    expect(document.body.textContent).not.toContain('Tenth')
  })

  it('leaves the list empty when there are three places or fewer', () => {
    updatePlaceLeaderboardV3(makeExport(TEN_PLACES.slice(0, 2)))
    expect(podiumRows()).toHaveLength(2)
    expect(listRows()).toHaveLength(0)
  })

  it('colours the podium ranks gold, silver and bronze, and only the first count gold', () => {
    updatePlaceLeaderboardV3(makeExport(TEN_PLACES.slice(0, 4)))
    const rankColors = podiumRows().map((r) => r.querySelector<HTMLElement>('.lb-v3-podium-rank')!.style.color)
    expect(rankColors).toEqual(['rgb(255, 215, 0)', 'rgb(192, 192, 192)', 'rgb(205, 127, 50)'])
    const countColors = podiumRows().map((r) => r.querySelector<HTMLElement>('.lb-v3-podium-count')!.style.color)
    expect(countColors).toEqual(['rgb(255, 215, 0)', '', ''])
  })

  it('draws a category badge in the category colour, and none for a place with no category', () => {
    updatePlaceLeaderboardV3(
      makeExport([place('Golden Gate Park', 41, 'Fitness & Outdoors'), place('Somewhere', 3, null), place('Third', 2), place('Fourth', 1, null)])
    )
    const badge = podiumRows()[0]!.querySelector<HTMLElement>('.lb-v3-podium-cat')!
    expect(badge.textContent).toBe('Fitness & Outdoors')
    const probe = document.createElement('span')
    probe.style.color = getCategoryColor('Fitness & Outdoors')
    expect(badge.style.color).toBe(probe.style.color)
    expect(podiumRows()[1]!.querySelector('.lb-v3-podium-cat')).toBeNull()
    expect(listRows()[0]!.querySelector('.lb-v3-list-cat')).toBeNull()
  })

  it('escapes place names, so markup in a name is text and never an element', () => {
    updatePlaceLeaderboardV3(makeExport([place('<img src=x onerror=alert(1)>', 9), place('A & B', 8), place('C', 7), place('<b>D</b>', 6)]))
    expect(podiumRows()[0]!.querySelector('.lb-v3-podium-name')!.textContent).toBe('<img src=x onerror=alert(1)>')
    expect(podiumRows()[1]!.querySelector('.lb-v3-podium-name')!.textContent).toBe('A & B')
    expect(listRows()[0]!.querySelector('.lb-v3-list-name')!.textContent).toBe('<b>D</b>')
    expect(document.querySelector('img, b')).toBeNull()
  })

  it('re-running replaces the previous rows rather than appending', () => {
    updatePlaceLeaderboardV3(makeExport(TEN_PLACES))
    updatePlaceLeaderboardV3(makeExport(TEN_PLACES.slice(0, 5)))
    expect(podiumRows()).toHaveLength(3)
    expect(listRows()).toHaveLength(2)
  })
})
