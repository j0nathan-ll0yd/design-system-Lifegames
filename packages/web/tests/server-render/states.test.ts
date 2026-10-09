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
import {type DashboardExports, type DashboardViewModels, type DomainInput, toDashboardViewModels} from '../../src/runtime/view-models'
import {NO_READING, type WidgetState} from '../../src/runtime/widget-state'
import {heartRateState, hydrationState, movementRingsState, nightSummaryState, workoutsState} from '../../src/runtime/widget-rules'

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

// The number half of the fixtures rule: a numeric leaf is a token unless it is
// an integer below 10. Matched as a whole number in rendered text.
function numberTokens(value: unknown, out: Set<string>): Set<string> {
  if (typeof value === 'number') {
    if (Number.isFinite(value) && !(Number.isInteger(value) && Math.abs(value) < 10)) {
      out.add(String(value))
    }
  } else if (Array.isArray(value)) {
    value.forEach((v) => numberTokens(v, out))
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((v) => numberTokens(v, out))
  }
  return out
}

let knownAnswerTokens: Set<string>
let knownAnswerNumbers: Set<string>
let knownAnswerTimestamps: Set<string>
let legacyTokens: Set<string>

beforeAll(() => {
  knownAnswerTokens = new Set()
  knownAnswerNumbers = new Set()
  knownAnswerTimestamps = new Set()
  for (const domain of Object.keys(DOMAIN_DIRS) as Domain[]) {
    const ka = raw(domain, KNOWN_ANSWER)
    numberTokens(ka, knownAnswerNumbers)
    if (typeof ka.generatedAt === 'string') {
      knownAnswerTimestamps.add(ka.generatedAt)
    }
  }
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
  // and presentational attributes (class, id, style, SVG geometry) and the
  // dev-only data-astro-* annotations are not content.
  const attrs = [...root.querySelectorAll('*'), root].flatMap((el) =>
    [...el.attributes].filter((a) => CONTENT_ATTR.test(a.name) && !/^data-astro-/.test(a.name)).map((a) => a.value)
  )
  return {html, doc, root, text: root.textContent + '\n' + attrs.join('\n')}
}
const CONTENT_ATTR = /^(aria-.*|alt|title|href|src|srcset|datetime|content|value|data-.*)$/

// Whole-token match: "Work" must not match inside "Workouts".
function contains(text: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^A-Za-z0-9])${escaped}($|[^A-Za-z0-9])`).test(text)
}

function leaked(rendered: Rendered, tokens: Set<string>): string[] {
  return [...tokens].filter((t) => contains(rendered.text, t))
}

// The only exemption: a token that is a whole word of a string the design
// system authors (copy, status labels) cannot prove provenance. Nothing a
// widget renders on its own earns an exemption.
const AUTHORED_TEXT = (): string => [...AUTHORED].join('\n')
function leakedLegacy(rendered: Rendered): string[] {
  const authored = AUTHORED_TEXT()
  return [...legacyTokens].filter((t) => contains(rendered.text, t) && !contains(authored, t))
}

// A data state must carry the known answer: the exact slot values for the
// numeric health widgets, at least one distinctive string for the others.
function expectKnownAnswer(r: Rendered, id: string, opts: {healthStale?: boolean} = {}): void {
  const slots = SLOTS[id]
  if (slots) {
    const expected = slots()
    // NightSummary (owner decision Q3): a stale health export lends no score.
    if (id === 'cardSleep' && opts.healthStale) {
      expected['#sleepScoreVal'] = NO_READING
    }
    for (const [selector, value] of Object.entries(expected)) {
      expect(r.root.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim(), selector).toBe(value)
    }
  } else {
    expect(leaked(r, knownAnswerTokens).length).toBeGreaterThan(0)
  }
}

// Whole-number match: "33" must not match inside "133" or "3.33".
function containsNumber(text: string, n: string): boolean {
  const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^0-9.])${escaped}($|[^0-9.])`).test(text)
}

// A non-data state must carry no known-answer value at all: no distinctive
// string, no number from any known-answer export (outside the widget's own
// chrome), no export timestamp, and no derived value in a known slot.
async function expectNoInputValue(r: Rendered, _component: any, id: string): Promise<void> {
  expect(leaked(r, knownAnswerTokens)).toEqual([])
  expect([...knownAnswerNumbers].filter((n) => containsNumber(r.text, n))).toEqual([])
  expect([...knownAnswerTimestamps].filter((t) => r.text.includes(t))).toEqual([])
  expect(r.root.getAttribute('data-generated-at')).toBeNull()
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
    expect(leakedLegacy(r)).toEqual([])
    expectKnownAnswer(r, id)
  })

  it('stale: the data plus an absolute "as of" time', async () => {
    const props = vmFor(exportsFor(KNOWN_ANSWER, 'stale'), vm)
    const r = await render(component, props, id)
    expect(r.root.getAttribute('data-ssr-state')).toBe('stale')
    const asOf = r.root.querySelector('time.widget-timestamp-stale')
    expect(asOf?.getAttribute('datetime')).toBe(props.generatedAt)
    expect(asOf?.textContent).toMatch(/^as of /)
    expect(leakedLegacy(r)).toEqual([])
    // Every export is stale here, health included.
    expectKnownAnswer(r, id, {healthStale: true})
  })

  it('unavailable: a notice, no value', async () => {
    const props = vmFor({}, vm)
    const r = await render(component, props, id)
    expect(r.root.getAttribute('data-ssr-state')).toBe('unavailable')
    expect(r.root.querySelector('[data-state-notice="unavailable"]')?.textContent?.trim()).toBe(widgets.widgetState.unavailable)
    await expectNoInputValue(r, component, id)
    // A caller that passes data WITH state unavailable still renders none of it.
    const forced = await render(component, {...vmFor(exportsFor(KNOWN_ANSWER), vm), state: 'unavailable'}, id)
    expect(forced.root.getAttribute('data-ssr-state')).toBe('unavailable')
    await expectNoInputValue(forced, component, id)
  })

  it('suppressed: a notice and NO data, even when data is passed in', async () => {
    const exports = exportsFor(KNOWN_ANSWER)
    exports.focus = {data: {currentFocus: 'Work', generatedAt: NOW} as any}
    const props = vmFor(exports, vm)
    const r = await render(component, props, id)
    expect(r.root.getAttribute('data-ssr-state')).toBe('suppressed')
    expect(r.root.querySelector('[data-state-notice="suppressed"]')?.textContent?.trim()).toBe(widgets.widgetState.suppressed)
    await expectNoInputValue(r, component, id)
    // Defense in depth: a caller that passes data WITH state suppressed still renders none of it.
    const forced = await render(component, {...vmFor(exportsFor(KNOWN_ANSWER), vm), state: 'suppressed'}, id)
    expect(forced.root.getAttribute('data-ssr-state')).toBe('suppressed')
    await expectNoInputValue(forced, component, id)
  })

  it('loading: the skeleton and a <noscript> note, no value', async () => {
    const r = await render(component, {...vmFor(exportsFor(KNOWN_ANSWER), vm), state: 'loading'}, id)
    expect(r.root.getAttribute('data-ssr-state')).toBe('loading')
    expect(r.root.classList.contains('is-loading')).toBe(true)
    expect(r.root.querySelector('.skeleton-state')).not.toBeNull()
    expect(r.html).toContain(widgets.widgetState.needsJavaScript)
    await expectNoInputValue(r, component, id)
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
    expect(leakedLegacy(r)).toEqual([])
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
    const r = await render(HeartRate, {health: {quantities: {hrvSDNN: {value: 40, unit: 'ms'}}}}, 'cardHR')
    expect(r.root.getAttribute('data-ssr-state')).toBe('unavailable')
    expect(r.root.querySelector('#pulseBpm')?.textContent?.trim() ?? '').toBe('')
  })

  it('HeartRate: a readable export with no quantity at all is empty, not unavailable', async () => {
    const r = await render(HeartRate, {health: {quantities: {}}}, 'cardHR')
    expect(r.root.getAttribute('data-ssr-state')).toBe('empty')
    expect(r.root.querySelector('[data-state-notice="empty"]')?.textContent?.trim()).toBe(widgets.heartRate.empty)
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
  it("NightSummary follows the sleep export alone: its state and generatedAt, never the health export's", async () => {
    const exports = exportsFor(KNOWN_ANSWER)
    exports.sleep = {data: raw('sleep', KNOWN_ANSWER), state: 'stale'}
    exports.health = {data: {...raw('health', KNOWN_ANSWER), generatedAt: '2026-03-17T01:00:00.000Z'}}
    const vm = toDashboardViewModels(exports, NOW).nightSummary
    expect(vm.state).toBe('stale')
    expect(vm.generatedAt).toBe(raw('sleep', KNOWN_ANSWER).generatedAt)
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

// ── Review of PR #289, H1: non-data states are byte-identical to data-free ──
//
// A non-data render may differ from the data-free render of the same state by
// nothing at all: not a value, not an attribute. The data-free render itself
// carries no digit except the authored defaults (MovementRings' daylight goal
// "20") and only text the design system authors.

const NON_DATA_STATES = ['unavailable', 'suppressed', 'loading', 'empty'] as const

// Text a data-free render may show besides authored copy: the no-reading and
// empty marks, MovementRings' centre unit, the TheatreReviews count fallback,
// the solar glyphs and the daylight-goal check mark. Reviewed by hand.
const REVIEWED_CHROME_TEXT = new Set(['—', '--', 'cal', 'reviews', '☀', '☾', '✓', '·', '/'])
// The only digits a data-free render may carry: MovementRings' default daylight goal.
const ALLOWED_DATA_FREE_DIGITS = /goal 20 min/g

function textNodes(root: Element): string[] {
  const out: string[] = []
  const walk = (n: Node): void => {
    if (n.nodeType === 3) {
      const t = (n.textContent ?? '').replace(/\s+/g, ' ').trim()
      if (t) {
        out.push(t)
      }
    }
    n.childNodes.forEach(walk)
  }
  walk(root)
  return out
}

// Every authored string leaf, unfiltered (the token rule above skips short
// strings; chrome such as "BPM" or "km" is short).
function allStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    out.push(value)
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((v) => allStrings(v, out))
  }
  return out
}

function authoredPieces(): string[] {
  // Copy strings split on their ICU placeholders: a text node may hold one piece.
  return allStrings({widgets, a11y, STATUS_LABELS}).flatMap((v) => v.split(/\{[a-zA-Z]+\}/).map((p) => p.trim())).filter(Boolean)
}

describe.each(LIVE_WIDGETS)('$name: every non-data state is data-free', ({component, id, vm}) => {
  it.each(NON_DATA_STATES)('%s: byte-identical to the data-free render, whatever the caller passes', async (state) => {
    const dataFree = await render(component, {state}, id)
    const forcedLive = await render(component, {...vmFor(exportsFor(KNOWN_ANSWER), vm), state}, id)
    const forcedStale = await render(component, {...vmFor(exportsFor(KNOWN_ANSWER, 'stale'), vm), state, generatedAt: 'not-a-date'}, id)
    expect(forcedLive.html).toBe(dataFree.html)
    expect(forcedStale.html).toBe(dataFree.html)
    if (state === 'empty') {
      // The empty exports reach the same markup through the view model.
      const fromExports = await render(component, vmFor(exportsFor('empty'), vm), id)
      if (fromExports.root.getAttribute('data-ssr-state') === 'empty') {
        expect(fromExports.html).toBe(dataFree.html)
      }
    }
  })

  it.each(NON_DATA_STATES)('%s: the data-free render shows only authored text and no digit', async (state) => {
    const r = await render(component, {state}, id)
    const pieces = authoredPieces()
    // A text node may compose several authored pieces (the daylight caption):
    // strip every authored piece and reviewed mark; only separators may remain.
    const byLength = [...pieces, ...REVIEWED_CHROME_TEXT].sort((x, y) => y.length - x.length)
    const unreviewed = textNodes(r.root).filter((t) => {
      let rest = t
      for (const p of byLength) {
        rest = rest.split(p).join(' ')
      }
      return !/^[\s·:/%]*$/.test(rest.replace(/\b20\b/g, ''))
    })
    expect(unreviewed).toEqual([])
    expect(r.text.replace(ALLOWED_DATA_FREE_DIGITS, '').match(/\d/g) ?? []).toEqual([])
  })
})

// ── H1: each optional field absent renders the no-reading mark, server side ──

function kaHealthWith(keep: string[]): any {
  const h = raw('health', KNOWN_ANSWER)
  const quantities = Object.fromEntries(Object.entries(h.quantities).filter(([k]) => keep.includes(k)))
  return {date: h.date, generatedAt: h.generatedAt, quantities}
}

describe('a field the export omits renders the no-reading mark in its slot', () => {
  it('HeartRate with only a heart rate: HRV, RHR, RR and temperature read "—"', async () => {
    const r = await render(HeartRate, vmFor({health: {data: kaHealthWith(['heartRate'])}}, 'heartRate'), 'cardHR')
    expect(r.root.getAttribute('data-ssr-state')).toBe('live')
    for (const sel of ['#hrHrvValue', '#hrFooterRhr', '#hrFooterRr', '#hrFooterTemp']) {
      expect(r.root.querySelector(sel)?.textContent?.trim(), sel).toBe(NO_READING)
    }
  })

  it('HeartRate with a heart rate of 0 and an HRV: the BPM reads "—", as on the client', async () => {
    const h = kaHealthWith(['heartRate', 'heartRateVariabilitySDNN'])
    h.quantities.heartRate = {value: 0, unit: 'count/min'}
    const r = await render(HeartRate, vmFor({health: {data: h}}, 'heartRate'), 'cardHR')
    expect(r.root.querySelector('#pulseBpm')?.textContent?.trim()).toBe(NO_READING)
  })

  it('MovementRings with only steps: every other slot reads "—"', async () => {
    const r = await render(MovementRings, vmFor({health: {data: kaHealthWith(['stepCount'])}}, 'movementRings'), 'cardMovement')
    expect(r.root.getAttribute('data-ssr-state')).toBe('live')
    for (const sel of ['[data-mv-metric="flights"]', '#mvDaylightMin', '#ringCenterPct', '#mvSunrise', '#mvSunset']) {
      expect(r.root.querySelector(sel)?.textContent?.trim(), sel).toBe(NO_READING)
    }
    expect(r.root.querySelector('[data-mv-metric="distance"]')?.textContent?.replace(/\s+/g, '')).toBe(`${NO_READING}km`)
    for (const sel of ['#legendMove', '#legendExercise', '#legendStand']) {
      expect(r.root.querySelector(sel)?.textContent?.trim(), sel).toMatch(new RegExp(`^${NO_READING}/\\d+$`))
    }
  })

  it('Hydration with water and no caffeine: caffeine reads "—"', async () => {
    const r = await render(Hydration, vmFor({health: {data: kaHealthWith(['heartRate', 'dietaryWater'])}}, 'hydration'), 'cardHydration')
    expect(r.root.querySelector('#hydraWaterVal')?.textContent?.trim()).toBe('60 oz')
    expect(r.root.querySelector('#hydraCoffeeVal')?.textContent?.trim()).toBe(NO_READING)
  })

  it('Workouts with null duration, energy and distance: "—" and no distance stat', async () => {
    const w = raw('workouts', KNOWN_ANSWER)
    const data = {...w, workouts: [{...w.workouts[0], duration: null, energyBurned: null, distance: null}]}
    const r = await render(Workouts, vmFor({workouts: {data}}, 'workouts'), 'cardWorkouts')
    const values = [...r.root.querySelectorAll('.workout-stat-value')].map((v) => v.textContent?.trim())
    expect(values).toEqual([NO_READING, NO_READING])
  })

  it('DevActivityLog: a commit without line counts renders no "+0 -0"', async () => {
    const e = raw('githubEvents', KNOWN_ANSWER)
    const commit = e.events.find((ev: any) => ev.type === 'commit')
    const {additions: _a, deletions: _d, ...bare} = commit
    const r = await render(DevActivityLog, vmFor({githubEvents: {data: {...e, events: [bare]}}}, 'devActivityLog'), 'cardDevLog')
    expect(r.root.querySelectorAll('.gh-dal-line').length).toBe(1)
    expect(r.root.querySelector('.gh-dal-detail')).toBeNull()
    expect(r.root.textContent).not.toMatch(/\+\d+\s+-\d+/)
  })

  it('NightSummary missing one stage: that pill and the total read "—", no caption', async () => {
    const sl = raw('sleep', KNOWN_ANSWER)
    const {deep: _deep, ...partial} = sl
    const r = await render(NightSummary, vmFor({health: {data: raw('health', KNOWN_ANSWER)}, sleep: {data: partial}}, 'nightSummary'), 'cardSleep')
    expect(r.root.getAttribute('data-ssr-state')).toBe('live')
    expect(r.root.querySelector('[data-phase="deep"] .sleep-moon-pill-val')?.textContent?.trim()).toBe(NO_READING)
    expect(r.root.querySelector('#sleepDuration')?.textContent?.trim()).toBe(NO_READING)
    expect(r.root.querySelector('#sleepInsight')?.textContent?.trim()).toBe('')
  })
})

// ── M6: the matrix covers every widget that takes WidgetStateProps ──

describe('the matrix covers every live widget', () => {
  it('every *.types.ts whose Props extend WidgetStateProps has a matrix entry', () => {
    const WIDGETS_DIR = join(__dirname, '../../src/widgets')
    const live: string[] = []
    for (const group of readdirSync(WIDGETS_DIR)) {
      const dir = join(WIDGETS_DIR, group)
      for (const file of readdirSync(dir).filter((f) => f.endsWith('.types.ts'))) {
        if (/extends\s+[\w\s,]*\bWidgetStateProps\b/.test(readFileSync(join(dir, file), 'utf8'))) {
          live.push(file.replace('.types.ts', ''))
        }
      }
    }
    expect(live.length).toBeGreaterThanOrEqual(10)
    expect(live.sort()).toEqual(LIVE_WIDGETS.map((w) => w.name).sort())
  })
})

// ── M2: the view model and the markup agree on the state, for every variation ──

describe('the view-model state equals the rendered data-ssr-state', () => {
  it('NightSummary: every sleep variation crossed with every health state agrees, and follows sleep', async () => {
    const sleepVariations = readdirSync(join(GENERATED, DOMAIN_DIRS.sleep)).map((f) => f.replace(/\.json$/, ''))
    const healthInputs: Record<string, DomainInput<any>> = {
      live: {data: raw('health', KNOWN_ANSWER)},
      stale: {data: raw('health', KNOWN_ANSWER), state: 'stale'},
      unavailable: {data: null},
      noScore: {data: kaHealthWith(['heartRate'])}
    }
    for (const variation of sleepVariations) {
      for (const [healthName, healthInput] of Object.entries(healthInputs)) {
        const sleepInput = {data: raw('sleep', variation)}
        const vm = toDashboardViewModels({health: healthInput, sleep: sleepInput}, NOW).nightSummary
        const sleepOnly = toDashboardViewModels({sleep: sleepInput, health: {data: raw('health', KNOWN_ANSWER)}}, NOW).nightSummary
        const r = await render(NightSummary, vm as unknown as Record<string, unknown>, 'cardSleep')
        const where = `sleep/${variation} × health/${healthName}`
        expect(r.root.getAttribute('data-ssr-state'), where).toBe(vm.state)
        expect(r.root.getAttribute('data-generated-at'), where).toBe(vm.generatedAt ?? null)
        // The health export never changes the card's state or timestamp.
        expect(vm.state, where).toBe(sleepOnly.state)
        expect(vm.generatedAt, where).toBe(sleepOnly.generatedAt)
      }
    }
  })

  const variations = (domain: Domain): string[] => readdirSync(join(GENERATED, DOMAIN_DIRS[domain])).map((f) => f.replace(/\.json$/, ''))
  const DOMAINS = (Object.keys(DOMAIN_DIRS) as Domain[]).filter((d) => d !== 'focus')

  it.each(DOMAINS)('every %s variation, every widget', async (domain) => {
    for (const variation of variations(domain)) {
      const exports = exportsFor(KNOWN_ANSWER)
      ;(exports as Record<string, DomainInput<any>>)[domain] = {data: raw(domain, variation)}
      const vms = toDashboardViewModels(exports, NOW)
      for (const w of LIVE_WIDGETS) {
        const props = vms[w.vm] as unknown as Record<string, unknown>
        const r = await render(w.component, props, w.id)
        expect(r.root.getAttribute('data-ssr-state'), `${domain}/${variation} → ${w.name}`).toBe(props.state)
      }
    }
  })
})

// ── M3: a paused watch renders no value, and paused copy only when paused ──

describe('paused watch', () => {
  const paused = (): any => ({...raw('health', KNOWN_ANSWER), watch: {worn: false, since: null, source: 'hrGap'}})

  it.each([
    [HeartRate, 'heartRate', 'cardHR', '#hrPausedLabel', widgets.heartRate.paused.label],
    [MovementRings, 'movementRings', 'cardMovement', '#mvPausedLabel', widgets.movement.paused.label]
  ] as const)('%#: is-paused, the paused label, and no known-answer value in the markup', async (component, vm, id, labelSel, label) => {
    const r = await render(component, vmFor({health: {data: paused()}}, vm), id)
    expect(r.root.classList.contains('is-paused')).toBe(true)
    expect(r.root.querySelector(labelSel)?.textContent?.trim()).toBe(label)
    expect([...knownAnswerNumbers].filter((n) => containsNumber(r.text, n))).toEqual([])
    for (const value of Object.values(SLOTS[id]!())) {
      expect(textNodes(r.root)).not.toContain(value)
    }
  })

  it.each([
    [HeartRate, 'heartRate', 'cardHR', '#hrPausedLabel', '#hrPausedDesc'],
    [MovementRings, 'movementRings', 'cardMovement', '#mvPausedLabel', '#mvPausedDesc']
  ] as const)('%#: the paused copy is absent when the watch is worn', async (component, vm, id, labelSel, descSel) => {
    const r = await render(component, vmFor(exportsFor(KNOWN_ANSWER), vm), id)
    expect(r.root.querySelector(labelSel)?.textContent?.trim()).toBe('')
    expect(r.root.querySelector(descSel)?.textContent?.trim()).toBe('')
  })
})

// ── Header timestamp edge cases ──

describe('header timestamp', () => {
  it.each(LIVE_WIDGETS.filter((w) => w.id !== 'cardTheatreReviews'))(
    '$name: loading shows no "live" label and stale with a bad timestamp shows neither "live" nor the bad value',
    async ({component, id, vm}) => {
      const loading = await render(component, {state: 'loading'}, id)
      expect(loading.root.querySelector('.widget-timestamp')?.textContent?.trim()).toBe('')
      const props = vmFor(exportsFor(KNOWN_ANSWER, 'stale'), vm)
      for (const generatedAt of ['not-a-date', null]) {
        const r = await render(component, {...props, generatedAt}, id)
        expect(r.root.getAttribute('data-ssr-state')).toBe('stale')
        expect(r.root.getAttribute('data-generated-at')).toBeNull()
        expect(r.root.querySelector('.widget-timestamp')?.textContent?.trim()).toBe('')
      }
    }
  )
})

// ── Verifier on PR #289, L-2: the remaining slots of the null-as-0 class ──

describe('each template applies its own shared state rule (M2c)', () => {
  const sleepProps = (over: Record<string, unknown>) => ({
    health: {
      sleepScore: 80,
      sleepDurationFormatted: '7h 0m',
      sleepPhaseFormatted: {deep: '1h', rem: '1h', core: '5h', awake: '0m'},
      derived: {deepPct: 14, remPct: 14},
      ...over
    }
  })
  const CASES: [string, any, string, Record<string, unknown>, (p: any) => string, string][] = [
    [
      'HeartRate',
      HeartRate,
      'cardHR',
      {health: {quantities: {heartRate: {value: 0, unit: 'count/min'}, hrvSDNN: {value: 0, unit: 'ms'}}}},
      heartRateState,
      'empty'
    ],
    ['HeartRate', HeartRate, 'cardHR', {health: {quantities: {hrvSDNN: {value: 40, unit: 'ms'}}}}, heartRateState, 'unavailable'],
    ['MovementRings', MovementRings, 'cardMovement', {health: {quantities: {stepCount: {value: 0, unit: 'count'}}}}, movementRingsState, 'empty'],
    ['MovementRings', MovementRings, 'cardMovement', {health: {movement: {steps: 0}}}, movementRingsState, 'empty'],
    ['NightSummary', NightSummary, 'cardSleep', sleepProps({isEmpty: true}), nightSummaryState, 'empty'],
    ['NightSummary', NightSummary, 'cardSleep', sleepProps({isEmpty: false, sleepDurationFormatted: ''}), nightSummaryState, 'live'],
    ['Workouts', Workouts, 'cardWorkouts', {health: {workouts: []}}, workoutsState, 'empty'],
    ['Hydration', Hydration, 'cardHydration', {}, hydrationState, 'empty']
  ]
  it.each(CASES)("%s: raw props without a state render the rule's state (%#)", async (_name, component, id, props, rule, expected) => {
    expect(rule(props)).toBe(expected)
    const r = await render(component, props, id)
    expect(r.root.getAttribute('data-ssr-state')).toBe(expected)
  })
})

describe('null-as-0 slots the earlier tests did not pin', () => {
  it('MovementRings: a missing ring reads "no reading" in the ring group label, never 0%', async () => {
    const r = await render(MovementRings, vmFor({health: {data: kaHealthWith(['stepCount'])}}, 'movementRings'), 'cardMovement')
    const label = r.root.querySelector('.mv-rings svg[role="img"]')?.getAttribute('aria-label') ?? ''
    expect(label).not.toMatch(/\d+%/)
    expect(label.split(widgets.widgetState.noReading).length - 1).toBe(3)
  })

  it('HeartRate at a heart rate of 0: the zone badge reads "—" and neither BPM nor badge carries a zone colour', async () => {
    // A live card (HRV present) whose heart rate reads 0.
    const h = kaHealthWith(['heartRate', 'heartRateVariabilitySDNN'])
    h.quantities.heartRate = {value: 0, unit: 'count/min'}
    const r = await render(HeartRate, vmFor({health: {data: h}}, 'heartRate'), 'cardHR')
    expect(r.root.getAttribute('data-ssr-state')).toBe('live')
    expect(r.root.querySelector('#hrZoneBadge')?.textContent?.trim()).toBe(NO_READING)
    for (const sel of ['#pulseBpm', '#hrZoneBadge']) {
      expect(r.root.querySelector(sel)?.getAttribute('style'), `${sel} carries no zone colour`).toBeNull()
    }
  })

  it('HeartRate with a heart rate but no HRV: the HRV mark carries no low-HRV colour', async () => {
    const r = await render(HeartRate, vmFor({health: {data: kaHealthWith(['heartRate'])}}, 'heartRate'), 'cardHR')
    expect(r.root.querySelector('#hrHrvValue')?.textContent?.trim()).toBe(NO_READING)
    expect(r.root.querySelector('#hrHrvValue')?.getAttribute('style')).toBeNull()
    expect(r.root.querySelector('#pulseBpm')?.getAttribute('style')).toMatch(/color:/)
  })

  it('NightSummary: one share present and one missing renders no caption', async () => {
    const props = {
      health: {
        sleepScore: 80,
        sleepDurationFormatted: '7h 0m',
        sleepPhaseFormatted: {deep: '1h', rem: '1h', core: '5h', awake: '0m'},
        derived: {deepPct: 14, remPct: null},
        isEmpty: false
      }
    }
    const r = await render(NightSummary, props, 'cardSleep')
    expect(r.root.querySelector('#sleepInsight')?.textContent?.trim()).toBe('')
  })

  it('NightSummary: a missing REM or core stage also makes the total "—"', async () => {
    for (const drop of ['rem', 'core']) {
      const {[drop]: _gone, ...partial} = raw('sleep', KNOWN_ANSWER)
      const r = await render(NightSummary, vmFor({health: {data: raw('health', KNOWN_ANSWER)}, sleep: {data: partial}}, 'nightSummary'), 'cardSleep')
      expect(r.root.querySelector('#sleepDuration')?.textContent?.trim(), drop).toBe(NO_READING)
    }
  })

  it('StarredRepoList, DevActivityLog and Workouts link only https URLs on the server', async () => {
    const starred = await render(StarredRepoList, {
      repos: [{owner: 'o', name: 'n', url: 'javascript:alert(1)', stars: 3, language: 'Go', languageColor: '#00ADD8', starredAt: '2 days ago'}]
    }, 'cardStarredRepos')
    expect(starred.root.querySelector('.gh-sl-name')?.hasAttribute('href')).toBe(false)
    const devlog = await render(DevActivityLog, {
      events: [{type: 'pr_merged', repo: 'r', title: 't', date: '2h ago', hash: '', number: 6, url: 'javascript:alert(1)'}]
    }, 'cardDevLog')
    expect(devlog.root.querySelector('.gh-dal-line')?.hasAttribute('href')).toBe(false)
    const workouts = await render(Workouts, {
      health: {workouts: [{activity_type: 'Run', duration: 60, energy_burned: 9, distance: null, link: 'javascript:alert(1)'}]}
    }, 'cardWorkouts')
    expect(workouts.root.querySelector('a.workout-sub-type')).toBeNull()
    expect(workouts.html).not.toContain('javascript:')
  })
})
