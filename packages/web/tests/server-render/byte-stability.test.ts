/// <reference path="../../src/astro-shim.d.ts" />
// Byte stability under a moving clock (atlas decision 0164 D5, "stable bytes").
//
// Measurer. Property: the same export data composes to the same bytes. Seam:
// the widget renderer across a moving clock (toDashboardViewModels at `now`,
// then each production `.astro` component through the Astro Container API).
// The website's composer renders these thirteen fragments, in this order, and
// the runner skips a Workers KV write when a fragment's bytes are unchanged.
// No other test renders the same data at two clocks and compares the bytes.
//
// It FAILS when any fragment's markup depends on the render clock: a relative
// label ("5m ago"), a time of day (the overlay clocks), or any other clock read.
// A second block proves the clock move is large enough to matter: the browser's
// load pass (fillRelativeTimes) at each clock DOES produce different text, and
// it turns the server's absolute text into the relative label.
import {experimental_AstroContainer as AstroContainer} from 'astro/container'
import {JSDOM} from 'jsdom'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {beforeAll, describe, expect, it} from 'vitest'
import {
  Bookshelf,
  DevActivityLog,
  DndOverlay,
  FocusOverlay,
  HeartRate,
  Hydration,
  MovementRings,
  NightSummary,
  ReadingFeed,
  StarredRepoList,
  SystemStatus,
  TheatreReviews,
  Workouts
} from '../../src/production/index'
import {EXPORT_FRESHNESS, type FreshnessDomain} from '../../src/runtime/freshness'
import {type RelativeStyle, relativeTimeLabel} from '../../src/runtime/relative-time'
import {fillRelativeTimes} from '../../src/runtime/relative-time-fill'
import {type DashboardExports, type DashboardViewModels, toDashboardViewModels} from '../../src/runtime/view-models'

const GENERATED = join(__dirname, '../../../fixtures/src/generated')
const raw = (dir: string, variation: string): any => JSON.parse(readFileSync(join(GENERATED, dir, `${variation}.json`), 'utf8'))
const KA = 'ssrKnownAnswer'

// The fixtures' reference time is the known answer's `generatedAt`. The two
// render clocks sit one and eleven minutes after it: ten minutes apart, and
// every live export stays live at both.
const GENERATED_AT = Date.parse('2026-03-18T12:00:00.000Z')
const MINUTE = 60_000
const CLOCK_A = GENERATED_AT + 1 * MINUTE
const CLOCK_B = CLOCK_A + 10 * MINUTE
// A stale export stays stale at any later clock, so the stale scenario also
// renders eight days on: a gap that crosses the day and week boundaries of
// every label form (starred repos and articles age in days and weeks).
const CLOCK_C = CLOCK_A + 8 * 24 * 60 * MINUTE

const DOMAINS = {
  health: 'health',
  sleep: 'sleep',
  workouts: 'workouts',
  githubEvents: 'github-events',
  starredRepos: 'github-starred-repos',
  articles: 'articles',
  books: 'books',
  theatreReviews: 'theatre-reviews'
} as const satisfies Record<FreshnessDomain, string>

// The known-answer events carry date-only values; these carry timestamps 5, 35
// and 65 minutes before CLOCK_A, so their relative labels cross a minute and an
// hour boundary between the two clocks.
function timestampedEvents(): any {
  const ka = raw('github-events', KA)
  return {...ka, events: ka.events.map((e: any, i: number) => ({...e, date: new Date(CLOCK_A - (5 + i * 30) * MINUTE).toISOString()}))}
}

function liveExports(currentFocus: string): DashboardExports {
  const out: Record<string, unknown> = {focus: {data: {generatedAt: new Date(GENERATED_AT).toISOString(), currentFocus}}}
  for (const [domain, dir] of Object.entries(DOMAINS)) {
    out[domain] = {data: domain === 'githubEvents' ? timestampedEvents() : raw(dir, KA)}
  }
  return out as DashboardExports
}

/** Every export one hour past its registry `audit.warn` age at CLOCK_A: stale at both clocks. */
function staleExports(): DashboardExports {
  const out: Record<string, unknown> = {focus: {data: {generatedAt: new Date(GENERATED_AT).toISOString(), currentFocus: 'None'}}}
  for (const [domain, dir] of Object.entries(DOMAINS)) {
    const data = domain === 'githubEvents' ? timestampedEvents() : raw(dir, KA)
    out[domain] = {data: {...data, generatedAt: new Date(CLOCK_A - EXPORT_FRESHNESS[domain as FreshnessDomain].warnMs - 60 * MINUTE).toISOString()}}
  }
  return out as DashboardExports
}

// The composer's thirteen fragments (website src/lib/composed/compose.ts renderFragments).
const FRAGMENTS: readonly [string, unknown, (vm: DashboardViewModels) => object][] = [
  ['focusOverlay', FocusOverlay, (vm) => vm.focusOverlay],
  ['dndOverlay', DndOverlay, (vm) => vm.dndOverlay],
  ['cardSystem', SystemStatus, (vm) => vm.systemStatus],
  ['cardHR', HeartRate, (vm) => vm.heartRate],
  ['cardMovement', MovementRings, (vm) => vm.movementRings],
  ['cardHydration', Hydration, (vm) => vm.hydration],
  ['cardSleep', NightSummary, (vm) => vm.nightSummary],
  ['cardWorkouts', Workouts, (vm) => vm.workouts],
  ['cardDevLog', DevActivityLog, (vm) => vm.devActivityLog],
  ['cardReading', ReadingFeed, (vm) => vm.readingFeed],
  ['cardStarredRepos', StarredRepoList, (vm) => vm.starredRepoList],
  ['cardBooks', Bookshelf, (vm) => ({...vm.bookshelf, localCovers: []})],
  ['cardTheatreReviews', TheatreReviews, (vm) => vm.theatreReviews]
]

let container: AstroContainer
beforeAll(async () => {
  container = await AstroContainer.create()
})

async function compose(exports: DashboardExports, now: number): Promise<Record<string, string>> {
  const vm = toDashboardViewModels(exports, now)
  const out: Record<string, string> = {}
  for (const [id, Component, props] of FRAGMENTS) {
    out[id] = await container.renderToString(Component as never, {props: props(vm) as never})
  }
  return out
}

/** The visible text of every <time data-relative> after the browser's load pass at `now`. */
function filledTimes(html: string, now: number): string[] {
  const doc = new JSDOM(`<!doctype html><body>${html}</body>`).window.document
  fillRelativeTimes(doc, now)
  return [...doc.querySelectorAll('time[data-relative]')].map((t) => t.textContent ?? '')
}

const SCENARIOS: readonly [string, () => DashboardExports][] = [
  ['live, focus visible', () => liveExports('None')],
  ['live, Work focus (overlay shown)', () => liveExports('Work')],
  ['live, Do Not Disturb (overlay shown)', () => liveExports('Do Not Disturb')],
  ['stale: every card shows its "as of" header', staleExports]
]

// covers: widget-contract#A live web widget's server markup does not depend on the render clock
describe('byte stability under a moving clock (atlas decision 0164 D5)', () => {
  it.each(SCENARIOS)('%s: the same data at two clocks ten minutes apart composes byte-equal fragments', async (_name, exports) => {
    const a = await compose(exports(), CLOCK_A)
    const b = await compose(exports(), CLOCK_B)
    expect(Object.keys(b)).toEqual(FRAGMENTS.map(([id]) => id))
    for (const [id] of FRAGMENTS) {
      expect(b[id], id).toBe(a[id])
    }
  })

  it('stale: the same data eight days apart composes byte-equal fragments', async () => {
    const a = await compose(staleExports(), CLOCK_A)
    const c = await compose(staleExports(), CLOCK_C)
    for (const [id] of FRAGMENTS) {
      expect(c[id], id).toBe(a[id])
    }
  })

  it('the stale scenario is stale at every clock, and the live one live at both of its clocks', async () => {
    for (const now of [CLOCK_A, CLOCK_B, CLOCK_C]) {
      for (const [key, vm] of Object.entries(toDashboardViewModels(staleExports(), now))) {
        if (vm && typeof vm === 'object' && 'state' in vm) {
          expect((vm as {state: string}).state, `${key} at ${now}`).toBe('stale')
        }
      }
    }
    for (const now of [CLOCK_A, CLOCK_B]) {
      expect(toDashboardViewModels(liveExports('None'), now).devActivityLog.state).toBe('live')
    }
  })

  // Can-fail proof: the move is large enough to change every kind of relative
  // label the server used to write, so equal bytes above are not an accident
  // of a clock move too small to matter.
  it('the browser load pass at each clock writes different relative labels from the same bytes', async () => {
    const a = await compose(liveExports('None'), CLOCK_A)
    for (const id of ['cardSystem', 'cardDevLog']) {
      const atA = filledTimes(a[id]!, CLOCK_A)
      const atB = filledTimes(a[id]!, CLOCK_B)
      expect(atA.length, id).toBeGreaterThan(0)
      expect(atB, id).not.toEqual(atA)
    }
    // The eight-day gap moves the day- and week-scale labels too.
    const stale = await compose(staleExports(), CLOCK_A)
    for (const id of ['cardSystem', 'cardDevLog', 'cardReading', 'cardStarredRepos']) {
      const atA = filledTimes(stale[id]!, CLOCK_A)
      const atC = filledTimes(stale[id]!, CLOCK_C)
      expect(atA.length, id).toBeGreaterThan(0)
      expect(atC, id).not.toEqual(atA)
    }
  })
})

// The behavioral half of decision 0164 D5 Phase 1.1: a DOM-level assertion, not a screenshot.
describe('the server writes absolute text; the browser writes the relative label', () => {
  const UTC_TEXT = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC$/
  const RELATIVE = /^(\d+[mhdw] ago|\d+ (day|week)s? ago)$/
  const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/

  it.each(['cardSystem', 'cardDevLog', 'cardReading', 'cardStarredRepos'])(
    '%s: <time data-relative> text changes from absolute UTC to the relative label once fillRelativeTimes runs',
    async (id) => {
      const html = (await compose(liveExports('None'), CLOCK_A))[id]!
      expect(html).not.toMatch(/\bago\b/)
      const doc = new JSDOM(`<!doctype html><body>${html}</body>`).window.document
      const times = [...doc.querySelectorAll<HTMLTimeElement>('time[data-relative]')]
      expect(times.length).toBeGreaterThan(0)
      const before = times.map((t) => (t.textContent ?? '').trim())
      for (const text of before) {
        expect(text).toMatch(UTC_TEXT)
      }
      fillRelativeTimes(doc, CLOCK_A)
      times.forEach((t, i) => {
        const datetime = t.getAttribute('datetime')!
        // The `datetime` attribute keeps the ISO instant; only the text changes.
        expect(datetime).toMatch(ISO_INSTANT)
        expect(t.textContent).toMatch(RELATIVE)
        expect(t.textContent).toBe(relativeTimeLabel(datetime, t.dataset.relative as RelativeStyle, CLOCK_A))
        expect(t.textContent).not.toBe(before[i])
      })
    }
  )

  it('the overlay clocks render the placeholder; the client writes the time', async () => {
    const fragments = await compose(liveExports('Work'), CLOCK_A)
    const focus = new JSDOM(fragments.focusOverlay!).window.document
    const dnd = new JSDOM(fragments.dndOverlay!).window.document
    expect(focus.getElementById('focusClock')?.textContent).toBe('--:--:--')
    expect(dnd.getElementById('dndClock')?.textContent).toBe('--:--:--')
    expect(focus.getElementById('focusOverlay')?.getAttribute('style')).toBe('display: flex')
  })
})
