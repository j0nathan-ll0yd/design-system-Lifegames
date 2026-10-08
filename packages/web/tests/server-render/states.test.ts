/// <reference path="../../src/astro-shim.d.ts" />
// W4 blocking test (atlas decision 0160, plan Step 7.4).
//
// Renders every live widget in every state through the Astro Container API,
// from the same view models the server page uses (toDashboardViewModels), and
// asserts on the parsed DOM. It FAILS on:
//   - a missing state: the card root must carry the expected data-ssr-state;
//   - a fixture value: no distinctive value of any OTHER fixture variation may
//     appear in rendered output, and no known-answer value may appear in a
//     non-data state (unavailable, suppressed, loading, empty);
//   - a null rendered as 0: the `sparse` health export must render the
//     no-reading mark in every slot whose measurement it lacks.
//
// Known-answer inputs are the raw `ssrKnownAnswer` variations of
// @j0nathan-ll0yd/fixtures; their distinctive values appear in no other
// variation (packages/fixtures/tests/ssr-known-answer.test.ts proves it), so a
// rendered value can only have come from the input (H04).
import {experimental_AstroContainer as AstroContainer} from 'astro/container'
import {JSDOM} from 'jsdom'
import {readdirSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import {beforeAll, describe, expect, it} from 'vitest'
import Bookshelf from '../../src/widgets/reading/Bookshelf.astro'
import DevActivityLog from '../../src/widgets/github/DevActivityLog.astro'
import DndOverlay from '../../src/widgets/other/DndOverlay.astro'
import FocusOverlay from '../../src/widgets/other/FocusOverlay.astro'
import HeartRate from '../../src/widgets/health/HeartRate.astro'
import Hydration from '../../src/widgets/health/Hydration.astro'
import HydrationProduction from '../../src/production/Hydration.astro'
import MovementRings from '../../src/widgets/health/MovementRings.astro'
import NightSummary from '../../src/widgets/health/NightSummary.astro'
import ReadingFeed from '../../src/widgets/reading/ReadingFeed.astro'
import StarredRepoList from '../../src/widgets/github/StarredRepoList.astro'
import SystemStatus from '../../src/widgets/other/SystemStatus.astro'
import TheatreReviews from '../../src/widgets/reading/TheatreReviews.astro'
import Workouts from '../../src/widgets/health/Workouts.astro'
import {a11y, widgets} from '@j0nathan-ll0yd/copy'
import {adaptHealth, adaptSleep} from '../../src/runtime/adapters'
import {LANG_COLORS, STATUS_LABELS} from '../../src/runtime/constants'
import {pendingCopy} from '../../src/runtime/pending-copy'
import {type DashboardExports, type DashboardViewModels, type DomainInput, toDashboardViewModels} from '../../src/runtime/view-models'
import {NO_READING, type WidgetState} from '../../src/runtime/widget-state'

// ── Fixture inputs (read from the fixtures package's generated JSON) ──

const GENERATED = join(__dirname, '../../../fixtures/src/generated')
const POST_ADAPTER = join(__dirname, '../../../fixtures/src/post-adapter')
const KNOWN_ANSWER = 'ssrKnownAnswer'

// Export domain → generated directory.
const DOMAIN_DIRS = {
  focus: 'focus',
  health: 'health',
  sleep: 'sleep',
  workouts: 'workouts',
  githubEvents: 'github-events',
  starredRepos: 'github-starred-repos',
  articles: 'articles',
  books: 'books',
  theatreReviews: 'theatre-reviews'
} as const
type Domain = keyof typeof DOMAIN_DIRS

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, 'utf8'))
}
function raw(domain: Domain, variation: string): any {
  return readJson(join(GENERATED, DOMAIN_DIRS[domain], `${variation}.json`))
}

// The render clock: the fixtures package's fixed reference time.
const NOW = '2026-03-18T12:00:00.000Z'

function exportsFor(variation: string, state?: WidgetState): DashboardExports {
  const out: DashboardExports = {}
  for (const domain of Object.keys(DOMAIN_DIRS) as Domain[]) {
    const input: DomainInput<any> = {data: raw(domain, variation), ...(state ? {state} : {})}
    ;(out as Record<string, DomainInput<any>>)[domain] = domain === 'focus' ? {data: input.data} : input
  }
  return out
}

// ── Distinctive-token extraction ─────────────────────────────────────
//
// The string half of the fixtures package's rule
// (packages/fixtures/tests/ssr-known-answer.test.ts): a string leaf is a token
// unless its key is shared vocabulary, it is an ISO date or timestamp, or it
// has 3 or fewer characters. Two additions for RENDERED output: a relative-time
// label ("2d ago") is computed at render time and proves nothing, and a string
// the design system itself authors (copy, status labels) is chrome, not data.
// Numbers are asserted through exact slot projections instead (see SLOTS).
const SHARED_VOCABULARY_KEYS = new Set(['type', 'unit', 'status', 'source', 'rating', 'licenseKey', 'licenseName', 'licenseSpdxId', 'language'])
const ISO = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/
const RELATIVE_TIME = /^\d+\s?\w+ ago$/
function stringTokens(value: unknown, out: Set<string>, key = ''): Set<string> {
  if (typeof value === 'string') {
    if (!SHARED_VOCABULARY_KEYS.has(key) && value.length >= 4 && !ISO.test(value) && !RELATIVE_TIME.test(value)) {
      out.add(value)
    }
  } else if (Array.isArray(value)) {
    value.forEach((v) => stringTokens(v, out, key))
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([k, v]) => stringTokens(v, out, k))
  }
  return out
}

// Every string the design system authors: chrome, never provenance.
const AUTHORED = stringTokens({widgets, a11y, STATUS_LABELS, LANG_COLORS}, new Set())

let knownAnswerTokens: Set<string>
let legacyTokens: Set<string>

beforeAll(() => {
  knownAnswerTokens = new Set()
  const others = new Set<string>()
  for (const domain of Object.keys(DOMAIN_DIRS) as Domain[]) {
    const dir = join(GENERATED, DOMAIN_DIRS[domain])
    for (const file of readdirSync(dir)) {
      const tokens = stringTokens(readJson(join(dir, file)), new Set())
      const target = file === `${KNOWN_ANSWER}.json` ? knownAnswerTokens : others
      tokens.forEach((t) => target.add(t))
    }
  }
  for (const file of readdirSync(POST_ADAPTER).filter((f) => f.endsWith('.json'))) {
    stringTokens(readJson(join(POST_ADAPTER, file)), others)
  }
  // Legacy markers by difference: every distinctive value of another variation
  // that the known-answer input does not also carry and the design system does
  // not author.
  legacyTokens = new Set([...others].filter((t) => !knownAnswerTokens.has(t) && !AUTHORED.has(t)))
})

// ── Rendering ────────────────────────────────────────────────────────

let container: AstroContainer
beforeAll(async () => {
  container = await AstroContainer.create()
})

interface Rendered {
  html: string
  doc: Document
  root: HTMLElement
  text: string
}

async function render(component: any, props: Record<string, unknown>, rootId: string): Promise<Rendered> {
  const html = await container.renderToString(component, {props})
  const doc = new JSDOM(html).window.document
  const root = doc.getElementById(rootId)
  if (!root) {
    throw new Error(`#${rootId} not rendered`)
  }
  // Rendered text plus every content-bearing attribute value (a value hidden
  // in data-*, aria-label, href or alt still reaches every client). Structural
  // attributes (class, id) and the dev-only data-astro-* annotations are not content.
  const attrs = [...root.querySelectorAll('*'), root].flatMap((el) => [...el.attributes].filter((a) => !STRUCTURAL_ATTR.test(a.name)).map((a) => a.value))
  return {html, doc, root, text: root.textContent + '\n' + attrs.join('\n')}
}
const STRUCTURAL_ATTR = /^(class|id|data-astro-.*)$/

// Whole-token match: "Work" must not match inside "Workouts".
function contains(text: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^A-Za-z0-9])${escaped}($|[^A-Za-z0-9])`).test(text)
}

function leaked(rendered: Rendered, tokens: Set<string>, chrome = ''): string[] {
  return [...tokens].filter((t) => contains(rendered.text, t) && !contains(chrome, t))
}

// A widget's chrome: everything its data-free renders contain. A token found
// there is the widget's own label, not a value from a fixture.
const chromeCache = new Map<string, string>()
async function chromeOf(component: any, id: string): Promise<string> {
  if (!chromeCache.has(id)) {
    const parts = await Promise.all((['unavailable', 'empty', 'loading'] as const).map((state) => render(component, {state}, id)))
    chromeCache.set(id, parts.map((p) => p.text).join('\n'))
  }
  return chromeCache.get(id) ?? ''
}

// A data state must carry the known answer: the exact slot values for the
// numeric health widgets, at least one distinctive string for the others.
function expectKnownAnswer(r: Rendered, id: string): void {
  const slots = SLOTS[id]
  if (slots) {
    for (const [selector, value] of Object.entries(slots())) {
      expect(r.root.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim(), selector).toBe(value)
    }
  } else {
    expect(leaked(r, knownAnswerTokens).length).toBeGreaterThan(0)
  }
}

// Numeric known-answer values a non-data state must never carry.
function expectNoKnownAnswerSlots(r: Rendered, id: string): void {
  const slots = SLOTS[id]
  if (slots) {
    for (const [selector, value] of Object.entries(slots())) {
      expect(r.root.querySelector(selector)?.textContent?.trim() ?? '', selector).not.toBe(value)
    }
  }
}

// Exact projections of the known-answer exports into rendered slots. Health
// values are numbers, so each widget names the slots that must carry them.
const KA = {
  health: () => adaptHealth(raw('health', KNOWN_ANSWER), raw('sleep', KNOWN_ANSWER)),
  sleep: () => adaptSleep(raw('sleep', KNOWN_ANSWER), raw('health', KNOWN_ANSWER))
}
const SLOTS: Record<string, () => Record<string, string>> = {
  cardHR: () => {
    const h = KA.health()
    return {'#pulseBpm': String(Math.round(h.quantities.heartRate!.value)), '#hrHrvValue': String(Math.round(h.quantities.hrvSDNN!.value))}
  },
  cardMovement: () => {
    const h = KA.health()
    return {
      '[data-mv-metric="steps"]': Math.round(h.quantities.stepCount!.value).toLocaleString('en-US'),
      '#legendMove': `${Math.round(h.quantities.activeEnergyBurned!.value)}/${h.goals!.moveKcal}`,
      '#legendExercise': `${Math.round(h.quantities.exerciseTime!.value)}/${h.goals!.exerciseMin}`,
      '#mvSunrise': h.solar!.sunriseHHmm,
      '#mvSunset': h.solar!.sunsetHHmm
    }
  },
  cardHydration: () => {
    const h = KA.health()
    return {'#hydraWaterVal': `${h.hydration.waterOz} oz`, '#hydraCoffeeVal': `${h.hydration.caffeineMg} mg`}
  },
  cardSleep: () => {
    const sl = KA.sleep()
    return {'#sleepScoreVal': String(sl.sleepScore), '#sleepDuration': sl.sleepDurationFormatted}
  }
}

// One entry per live widget: its component, card id, and view-model key.
const LIVE_WIDGETS = [
  {name: 'HeartRate', component: HeartRate, id: 'cardHR', vm: 'heartRate'},
  {name: 'MovementRings', component: MovementRings, id: 'cardMovement', vm: 'movementRings'},
  {name: 'Hydration', component: Hydration, id: 'cardHydration', vm: 'hydration'},
  {name: 'NightSummary', component: NightSummary, id: 'cardSleep', vm: 'nightSummary'},
  {name: 'Workouts', component: Workouts, id: 'cardWorkouts', vm: 'workouts'},
  {name: 'DevActivityLog', component: DevActivityLog, id: 'cardDevLog', vm: 'devActivityLog'},
  {name: 'StarredRepoList', component: StarredRepoList, id: 'cardStarredRepos', vm: 'starredRepoList'},
  {name: 'ReadingFeed', component: ReadingFeed, id: 'cardReading', vm: 'readingFeed'},
  {name: 'Bookshelf', component: Bookshelf, id: 'cardBooks', vm: 'bookshelf'},
  {name: 'TheatreReviews', component: TheatreReviews, id: 'cardTheatreReviews', vm: 'theatreReviews'}
] as const satisfies readonly {name: string; component: unknown; id: string; vm: keyof DashboardViewModels}[]

function vmFor(exports: DashboardExports, key: keyof DashboardViewModels): Record<string, unknown> {
  return toDashboardViewModels(exports, NOW)[key] as unknown as Record<string, unknown>
}

// ── The matrix ───────────────────────────────────────────────────────

// covers: widget-contract#A live web widget renders real data or an honest state in its server markup
describe.each(LIVE_WIDGETS)('$name renders every state honestly', ({component, id, vm}) => {
  it('live: known-answer values, provenance, no fixture value', async () => {
    const props = vmFor(exportsFor(KNOWN_ANSWER), vm)
    const r = await render(component, props, id)
    expect(r.root.getAttribute('data-ssr-state')).toBe('live')
    expect(r.root.getAttribute('data-generated-at')).toBe(props.generatedAt)
    expect(leaked(r, legacyTokens, await chromeOf(component, id))).toEqual([])
    expectKnownAnswer(r, id)
  })

  it('stale: the data plus an absolute "as of" time', async () => {
    const props = vmFor(exportsFor(KNOWN_ANSWER, 'stale'), vm)
    const r = await render(component, props, id)
    expect(r.root.getAttribute('data-ssr-state')).toBe('stale')
    if (id !== 'cardTheatreReviews') {
      // TheatreReviews' header slot is its review-count link, not a timestamp.
      const asOf = r.root.querySelector('time.widget-timestamp-stale')
      expect(asOf?.getAttribute('datetime')).toBe(props.generatedAt)
      expect(asOf?.textContent).toMatch(/^as of /)
    }
    expect(leaked(r, legacyTokens, await chromeOf(component, id))).toEqual([])
    expectKnownAnswer(r, id)
  })

  it('unavailable: a notice, no value', async () => {
    const props = vmFor({}, vm)
    const r = await render(component, props, id)
    expect(r.root.getAttribute('data-ssr-state')).toBe('unavailable')
    expect(r.root.querySelector('[data-state-notice="unavailable"]')?.textContent?.trim()).toBe(pendingCopy.widgetState.unavailable)
  })

  it('suppressed: a notice and NO data, even when data is passed in', async () => {
    const exports = exportsFor(KNOWN_ANSWER)
    exports.focus = {data: {currentFocus: 'Work', generatedAt: NOW} as any}
    const props = vmFor(exports, vm)
    const r = await render(component, props, id)
    expect(r.root.getAttribute('data-ssr-state')).toBe('suppressed')
    expect(r.root.querySelector('[data-state-notice="suppressed"]')?.textContent?.trim()).toBe(pendingCopy.widgetState.suppressed)
    expect(leaked(r, knownAnswerTokens)).toEqual([])
    expectNoKnownAnswerSlots(r, id)
    // Defense in depth: a caller that passes data WITH state suppressed still renders none of it.
    const forced = await render(component, {...vmFor(exportsFor(KNOWN_ANSWER), vm), state: 'suppressed'}, id)
    expect(forced.root.getAttribute('data-ssr-state')).toBe('suppressed')
    expect(leaked(forced, knownAnswerTokens)).toEqual([])
    expectNoKnownAnswerSlots(forced, id)
  })

  it('loading: the skeleton and a <noscript> note, no value', async () => {
    const r = await render(component, {...vmFor(exportsFor(KNOWN_ANSWER), vm), state: 'loading'}, id)
    expect(r.root.getAttribute('data-ssr-state')).toBe('loading')
    expect(r.root.classList.contains('is-loading')).toBe(true)
    expect(r.root.querySelector('.skeleton-state')).not.toBeNull()
    expect(r.html).toContain(pendingCopy.widgetState.needsJavaScript)
    expect(leaked(r, knownAnswerTokens)).toEqual([])
    expectNoKnownAnswerSlots(r, id)
  })

  it('no state prop: the compatibility mapper keeps the pre-0160 call signature', async () => {
    const {state: _state, generatedAt: _generatedAt, ...legacy} = vmFor(exportsFor(KNOWN_ANSWER), vm)
    const r = await render(component, legacy, id)
    expect(['live', 'empty']).toContain(r.root.getAttribute('data-ssr-state'))
  })
})

describe('empty states', () => {
  const EMPTY_WIDGETS = LIVE_WIDGETS.filter((w) => !['cardHR', 'cardHydration'].includes(w.id))
  it.each(EMPTY_WIDGETS)('$name renders empty from the empty exports', async ({component, id, vm}) => {
    const r = await render(component, vmFor(exportsFor('empty'), vm), id)
    expect(r.root.getAttribute('data-ssr-state')).toBe('empty')
    expect(leaked(r, knownAnswerTokens)).toEqual([])
    expect(leaked(r, legacyTokens, await chromeOf(component, id))).toEqual([])
  })

  it('NightSummary renders zero sleep as the empty state, not "0h 0m" and a score of 0', async () => {
    const exports = exportsFor(KNOWN_ANSWER)
    exports.sleep = {data: {...raw('sleep', KNOWN_ANSWER), rem: {seconds: 0}, deep: {seconds: 0}, core: {seconds: 0}, awake: {seconds: 0}}}
    const r = await render(NightSummary, vmFor(exports, 'nightSummary'), 'cardSleep')
    expect(r.root.getAttribute('data-ssr-state')).toBe('empty')
    expect(r.root.querySelector('#sleepDuration')?.textContent?.trim()).toBe('--')
    expect(r.root.querySelector('#sleepScoreVal')?.textContent?.trim()).toBe('--')
    expect(r.text).not.toContain('0h 0m')
  })
})

// ── Measured versus missing (H03) ────────────────────────────────────

// covers: widget-contract#A live web widget renders real data or an honest state in its server markup
describe('a null measurement renders as no reading, never 0', () => {
  async function renderSparse(component: any, vm: keyof DashboardViewModels, id: string) {
    const exports = exportsFor(KNOWN_ANSWER)
    exports.health = {data: raw('health', 'sparse')}
    return render(component, vmFor(exports, vm), id)
  }

  it('Hydration: water and caffeine', async () => {
    const r = await renderSparse(Hydration, 'hydration', 'cardHydration')
    expect(r.root.getAttribute('data-ssr-state')).toBe('live')
    expect(r.root.querySelector('#hydraWaterVal')?.textContent?.trim()).toBe(NO_READING)
    expect(r.root.querySelector('#hydraCoffeeVal')?.textContent?.trim()).toBe(NO_READING)
  })

  it('MovementRings: exercise and move calories', async () => {
    const r = await renderSparse(MovementRings, 'movementRings', 'cardMovement')
    expect(r.root.querySelector('#legendMove')?.textContent?.trim()).toMatch(new RegExp(`^${NO_READING}/\\d+$`))
    expect(r.root.querySelector('#legendExercise')?.textContent?.trim()).toMatch(new RegExp(`^${NO_READING}/\\d+$`))
    expect(r.root.querySelector('#ringCenterPct')?.textContent?.trim()).toBe(NO_READING)
  })

  it('NightSummary: the sleep score', async () => {
    const r = await renderSparse(NightSummary, 'nightSummary', 'cardSleep')
    expect(r.root.querySelector('#sleepScoreVal')?.textContent?.trim()).toBe(NO_READING)
  })

  it('the adapter itself carries null, not 0, for each missing measurement', () => {
    const h = adaptHealth(raw('health', 'sparse'), null)
    expect(h.hydration.waterOz).toBeNull()
    expect(h.hydration.caffeineMg).toBeNull()
    expect(h.derived.totalCalories).toBeNull()
    expect(h.sleepScore).toBeNull()
    expect(h.quantities).not.toHaveProperty('exerciseTime')
  })

  it('HeartRate: a missing heart rate renders unavailable instead of throwing', async () => {
    const r = await render(HeartRate, {health: {quantities: {}}}, 'cardHR')
    expect(r.root.getAttribute('data-ssr-state')).toBe('unavailable')
    expect(r.root.querySelector('#pulseBpm')?.textContent?.trim() ?? '').toBe('')
  })

  it('MovementRings: no invented sunrise, sunset or sun position without solar', async () => {
    const health = adaptHealth(raw('health', KNOWN_ANSWER), null)
    const r = await render(MovementRings, {health: {quantities: health.quantities}}, 'cardMovement')
    expect(r.root.querySelector('#mvSunrise')?.textContent?.trim()).toBe(NO_READING)
    expect(r.root.querySelector('#mvSunset')?.textContent?.trim()).toBe(NO_READING)
    expect(r.root.querySelector('#mvSunDot')?.getAttribute('style')).toBe('display: none')
    expect(r.text).not.toContain('06:30')
    expect(r.text).not.toContain('20:15')
  })
})

// ── Card-specific contracts ──────────────────────────────────────────

describe('card-specific contracts', () => {
  it('NightSummary carries the OLDEST input generatedAt and the WORST input state', async () => {
    const exports = exportsFor(KNOWN_ANSWER)
    exports.sleep = {data: raw('sleep', KNOWN_ANSWER), state: 'stale'}
    const vm = toDashboardViewModels(exports, NOW).nightSummary
    const healthAt = Date.parse(raw('health', KNOWN_ANSWER).generatedAt)
    const sleepAt = Date.parse(raw('sleep', KNOWN_ANSWER).generatedAt)
    expect(vm.state).toBe('stale')
    expect(vm.generatedAt).toBe(healthAt <= sleepAt ? raw('health', KNOWN_ANSWER).generatedAt : raw('sleep', KNOWN_ANSWER).generatedAt)
  })

  it('Workouts is visible by default and carries its own generatedAt', async () => {
    const props = vmFor(exportsFor(KNOWN_ANSWER), 'workouts')
    const r = await render(Workouts, props, 'cardWorkouts')
    expect(r.root.getAttribute('style') ?? '').not.toContain('display: none')
    expect(r.root.getAttribute('data-generated-at')).toBe(raw('workouts', KNOWN_ANSWER).generatedAt)
  })

  it('TheatreReviews renders review cards from props', async () => {
    const data = raw('theatreReviews', KNOWN_ANSWER)
    const r = await render(TheatreReviews, vmFor(exportsFor(KNOWN_ANSWER), 'theatreReviews'), 'cardTheatreReviews')
    expect(r.root.querySelectorAll('#theatreRow .theatre-card').length).toBe(data.reviews.length)
    expect(r.root.querySelector('#theatreCount')?.textContent?.trim()).toBe(`${data.totalReviews} reviews`)
  })

  it('relative times render as <time datetime> from the page clock', async () => {
    const cases = [
      {component: ReadingFeed, vm: 'readingFeed', id: 'cardReading', selector: 'time.article-list-date', label: /^\d+[mhdw] ago$/},
      {component: StarredRepoList, vm: 'starredRepoList', id: 'cardStarredRepos', selector: 'time.gh-sl-date', label: /^(\d+h ago|\d+ (day|week)s? ago)$/},
      // The events export carries date-only values; they keep their ISO form.
      {component: DevActivityLog, vm: 'devActivityLog', id: 'cardDevLog', selector: 'time.gh-dal-date', label: /^(\d+[mhdw] ago|\d{4}-\d{2}-\d{2})$/}
    ] as const
    for (const c of cases) {
      const r = await render(c.component, vmFor(exportsFor(KNOWN_ANSWER), c.vm), c.id)
      const times = [...r.root.querySelectorAll(c.selector)]
      expect(times.length, c.id).toBeGreaterThan(0)
      for (const t of times) {
        expect(Number.isFinite(Date.parse(t.getAttribute('datetime') ?? '')), c.id).toBe(true)
        expect(t.textContent?.trim(), c.id).toMatch(c.label)
      }
    }
  })

  it('Hydration: values in markup; the carrier holds only hydration fields, only in live and stale', async () => {
    const props = vmFor(exportsFor(KNOWN_ANSWER), 'hydration')
    const live = await container.renderToString(HydrationProduction, {props})
    const doc = new JSDOM(live).window.document
    const carrier = doc.getElementById('cardHydrationData')
    expect(Object.keys(JSON.parse(carrier?.getAttribute('data-hydration-fixture') ?? '{}').health)).toEqual(['hydration'])
    expect(doc.getElementById('hydraWaterVal')?.textContent?.trim()).toMatch(/^\d+ oz$/)
    expect(doc.getElementById('cardHydration')?.classList.contains('is-loading')).toBe(false)
    for (const state of ['unavailable', 'suppressed', 'loading', 'empty'] as const) {
      const out = await container.renderToString(HydrationProduction, {props: {...props, state}})
      expect(out, state).not.toContain('data-hydration-fixture')
    }
  })

  it('DndOverlay carries none of the five fabricated rows, and renders visible during Do Not Disturb', async () => {
    const vm = toDashboardViewModels({focus: {data: {currentFocus: 'Do Not Disturb', generatedAt: NOW} as any}}, NOW)
    const r = await render(DndOverlay, vm.dndOverlay, 'dndOverlay')
    for (const fabricated of ['Heart Rate: 72 BPM', 'Location: San Francisco, CA', 'Daily Steps: 8,421', 'Sleep Duration: 7h 23m', 'Status: Online']) {
      expect(r.html).not.toContain(fabricated)
    }
    expect(r.root.getAttribute('style')).toBe('display: flex')
    expect(r.root.querySelectorAll('.data-row-bar').length).toBe(5)
    expect(r.root.querySelector('.data-rows')?.textContent?.trim()).toBe('')
  })

  it('FocusOverlay renders visible during Work and hidden otherwise', async () => {
    const work = await render(FocusOverlay, {currentFocus: 'Work', now: NOW}, 'focusOverlay')
    expect(work.root.getAttribute('style')).toBe('display: flex')
    const none = await render(FocusOverlay, {currentFocus: raw('focus', KNOWN_ANSWER).currentFocus, now: NOW}, 'focusOverlay')
    expect(none.root.getAttribute('style')).toBeNull()
  })

  it('SystemStatus renders composeSystemLines rows without the retired Location row', async () => {
    const vm = toDashboardViewModels(exportsFor(KNOWN_ANSWER), NOW)
    const r = await render(SystemStatus, {...vm.systemStatus, compact: true}, 'cardSystem')
    const keys = [...r.root.querySelectorAll('.sys-line')].map((l) => l.getAttribute('data-source'))
    expect(keys).toEqual(['health', 'sleep', 'books', 'articles', 'githubEvents', 'starredRepos', 'theatreReviews'])
    expect(r.text).not.toContain('Location')
    expect(r.root.querySelectorAll('.sys-line time[datetime]').length).toBe(7)
  })
})
