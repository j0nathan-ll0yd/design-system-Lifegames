import {describe, expect, it} from 'vitest'
import {composeSystemLines, formatAge, toDashboardViewModels, toReadingArticles, toWorkoutsList} from '../../src/runtime/view-models'
import type {AdaptedArticle, WorkoutEntry} from '../../src/runtime/adapters'

const NOW = Date.parse('2026-03-18T12:00:00.000Z')

describe('toWorkoutsList', () => {
  it('returns [] for null and for an empty list', () => {
    expect(toWorkoutsList(null)).toEqual([])
    expect(toWorkoutsList([])).toEqual([])
  })

  it('renames to snake_case and coalesces activityUrl into link', () => {
    const entries: WorkoutEntry[] = [
      {activityType: "Barry's Bootcamp", activityUrl: 'https://example.com/b', duration: 3000, energyBurned: 500, distance: null, source: 'watch'},
      {activityType: 'Outdoor Walk', duration: 1200, energyBurned: 90, distance: 1500, source: 'watch'}
    ]
    expect(toWorkoutsList(entries)).toEqual([
      {activity_type: "Barry's Bootcamp", duration: 3000, energy_burned: 500, distance: null, link: 'https://example.com/b'},
      {activity_type: 'Outdoor Walk', duration: 1200, energy_burned: 90, distance: 1500, link: null}
    ])
  })

  it('keeps a missing measurement null (never 0)', () => {
    const [w] = toWorkoutsList([{activityType: 'Yoga', duration: null, energyBurned: null, distance: null, source: 'watch'}])
    expect(w).toMatchObject({duration: null, energy_burned: null, distance: null})
  })
})

describe('toReadingArticles', () => {
  const article = (i: number): AdaptedArticle => ({
    title: `T${i}`,
    url: `https://example.com/${i}`,
    source: 'S',
    date: '1h ago',
    datetime: '2026-03-18T11:00:00Z',
    hasNotes: false,
    noteText: null
  })

  it('projects title, source, date and datetime only', () => {
    expect(toReadingArticles([article(1)])).toEqual([{title: 'T1', source: 'S', date: '1h ago', datetime: '2026-03-18T11:00:00Z'}])
  })

  it('caps the server render at 10 articles (one client page)', () => {
    expect(toReadingArticles(Array.from({length: 30}, (_, i) => article(i)))).toHaveLength(10)
    expect(toReadingArticles([])).toEqual([])
  })
})

describe('composeSystemLines', () => {
  it('drops the retired Location row and keeps a fixed order', () => {
    const lines = composeSystemLines({location: '2026-03-18T11:00:00Z'}, NOW)
    expect(lines.map((l) => l.source)).toEqual(['health', 'sleep', 'books', 'articles', 'githubEvents', 'starredRepos', 'theatreReviews'])
    expect(lines.some((l) => l.key === 'Location')).toBe(false)
  })

  it('marks a source with a timestamp ACTIVE with its age in <time datetime>', () => {
    const [health] = composeSystemLines({health: '2026-03-18T10:00:00.000Z'}, NOW)
    expect(health).toMatchObject({key: 'Health', dotClass: 'sys-dot-red', keyClass: 'sys-key sys-key-red', valClass: 'sys-val-green'})
    expect(health?.value).toBe('ACTIVE <span class="sys-val">(<time datetime="2026-03-18T10:00:00.000Z">2h ago</time>)</span>')
  })

  it('marks a missing or invalid timestamp OFFLINE', () => {
    const lines = composeSystemLines({health: null, sleep: 'not a date'}, NOW)
    expect(lines[0]).toMatchObject({value: 'OFFLINE', valClass: 'sys-val-red', dotClass: 'sys-dot-red'})
    expect(lines[1]).toMatchObject({value: 'OFFLINE'})
  })

  it('escapes the timestamp it echoes into HTML', () => {
    const [health] = composeSystemLines({health: '2026-03-18T10:00:00Z"><b>x'}, NOW)
    expect(health?.value).not.toContain('<b>')
  })

  it('formatAge never reports a negative age', () => {
    expect(formatAge('2026-03-18T12:05:00Z', NOW)).toBe('0m ago')
    expect(formatAge('2026-03-16T12:00:00Z', NOW)).toBe('2d ago')
  })
})

describe('toDashboardViewModels', () => {
  it('turns every missing export into unavailable, with no data', () => {
    const vm = toDashboardViewModels({}, NOW)
    expect(vm.suppressed).toBe(false)
    for (
      const key of [
        'heartRate',
        'movementRings',
        'hydration',
        'nightSummary',
        'workouts',
        'devActivityLog',
        'starredRepoList',
        'readingFeed',
        'bookshelf',
        'theatreReviews'
      ] as const
    ) {
      expect(vm[key].state, key).toBe('unavailable')
    }
    expect(vm.heartRate).not.toHaveProperty('health')
    expect(vm.systemStatus.system.lines.every((l) => l.value === 'OFFLINE')).toBe(true)
  })

  it('suppresses every gated domain and drops its data in a hiding focus mode', () => {
    const health = {date: '2026-03-18', generatedAt: '2026-03-18T11:59:00Z', quantities: {heartRate: {value: 61, unit: 'count/min'}}} as never
    const vm = toDashboardViewModels({focus: {data: {currentFocus: 'Work', generatedAt: '2026-03-18T11:59:00Z'} as never}, health: {data: health}}, NOW)
    expect(vm.suppressed).toBe(true)
    expect(vm.heartRate).toEqual({state: 'suppressed', generatedAt: null})
    // Every row stays, naming no timestamp, age or status.
    expect(vm.systemStatus.system.lines).toHaveLength(7)
    expect(vm.systemStatus.system.lines.every((l) => l.value === '—' && !l.value.includes('time'))).toBe(true)
    expect(vm.focusOverlay.currentFocus).toBe('Work')
  })

  it('a loader verdict of unavailable with data present still drops the data', () => {
    const health = {date: '2026-03-18', generatedAt: '2026-03-18T11:59:00Z', quantities: {heartRate: {value: 61, unit: 'count/min'}}} as never
    const vm = toDashboardViewModels({health: {data: health, state: 'unavailable'}}, NOW)
    expect(vm.heartRate).toEqual({state: 'unavailable', generatedAt: null})
  })

  it('passes the loader stale verdict and the export generatedAt through', () => {
    const health = {date: '2026-03-18', generatedAt: '2026-03-18T09:00:00Z', quantities: {heartRate: {value: 61, unit: 'count/min'}}} as never
    const vm = toDashboardViewModels({health: {data: health, state: 'stale'}}, NOW)
    expect(vm.heartRate.state).toBe('stale')
    expect(vm.heartRate.generatedAt).toBe('2026-03-18T09:00:00Z')
    expect(vm.heartRate.health?.quantities.heartRate?.value).toBe(61)
  })
})
