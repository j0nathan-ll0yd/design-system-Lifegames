/// <reference path="../../src/astro-shim.d.ts" />
// NightSummary follows the sleep export alone (owner decision Q3, 2026-10-08).
//
// Its state and "as of" time are the sleep export's. The health export lends
// only the sleep score, and only while it is live: unavailable, missing or
// stale health leaves the score as the no-reading mark and never takes the
// card down. If the sleep export is unavailable, the card is unavailable.
// Each case renders the server markup through the view model, then runs the
// client path (sleepScoreSource → adaptSleep → updateNightSummary) over that
// markup: server and client must show the same values. The System Status
// sleep row follows the same sleep export.
import {experimental_AstroContainer as AstroContainer} from 'astro/container'
import {JSDOM} from 'jsdom'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {afterEach, beforeAll, describe, expect, it} from 'vitest'
import NightSummary from '../../src/widgets/health/NightSummary.astro'
import SystemStatus from '../../src/widgets/other/SystemStatus.astro'
import {adaptSleep} from '../../src/runtime/adapters'
import {updateNightSummary} from '../../src/runtime/updaters'
import {type DashboardExports, toDashboardViewModels} from '../../src/runtime/view-models'
import {sleepScoreSource} from '../../src/runtime/widget-rules'
import {NO_READING, type WidgetState} from '../../src/runtime/widget-state'

const GENERATED = join(__dirname, '../../../fixtures/src/generated')
const raw = (dir: string, v: string): any => JSON.parse(readFileSync(join(GENERATED, dir, `${v}.json`), 'utf8'))
const NOW = '2026-03-18T12:00:00.000Z'
const KA = 'ssrKnownAnswer'
const SLEEP = raw('sleep', KA)
const HEALTH = raw('health', KA)
const SCORE = String(HEALTH.quantities.sleepScore.value)
// A health export OLDER than the sleep export, so "oldest input" and "sleep's"
// timestamps differ and a test can tell them apart.
const OLD_HEALTH = {...HEALTH, generatedAt: '2026-03-17T01:00:00.000Z'}
const {sleepScore: _score, ...QUANTITIES_NO_SCORE} = HEALTH.quantities

interface Case {
  name: string
  exports: DashboardExports
  /** What the client path receives (null: the export could not be read). */
  client: {sleep: any | null; health: any | null; healthState: WidgetState}
  card: {state: WidgetState; generatedAt: string | null; score: string | null}
  rows: {health: 'ACTIVE' | 'OFFLINE'; sleep: 'ACTIVE' | 'OFFLINE'}
}

const CASES: Case[] = [
  {
    name: 'sleep live + health unavailable',
    exports: {sleep: {data: SLEEP}, health: {data: null}},
    client: {sleep: SLEEP, health: null, healthState: 'unavailable'},
    card: {state: 'live', generatedAt: SLEEP.generatedAt, score: NO_READING},
    rows: {health: 'OFFLINE', sleep: 'ACTIVE'}
  },
  {
    name: 'sleep live + health missing the score',
    exports: {sleep: {data: SLEEP}, health: {data: {...OLD_HEALTH, quantities: QUANTITIES_NO_SCORE}}},
    client: {sleep: SLEEP, health: {...OLD_HEALTH, quantities: QUANTITIES_NO_SCORE}, healthState: 'live'},
    card: {state: 'live', generatedAt: SLEEP.generatedAt, score: NO_READING},
    rows: {health: 'ACTIVE', sleep: 'ACTIVE'}
  },
  {
    name: 'sleep live + health stale',
    exports: {sleep: {data: SLEEP}, health: {data: OLD_HEALTH, state: 'stale'}},
    client: {sleep: SLEEP, health: OLD_HEALTH, healthState: 'stale'},
    card: {state: 'live', generatedAt: SLEEP.generatedAt, score: NO_READING},
    rows: {health: 'ACTIVE', sleep: 'ACTIVE'}
  },
  {
    name: 'sleep stale + health live',
    exports: {sleep: {data: SLEEP, state: 'stale'}, health: {data: OLD_HEALTH}},
    client: {sleep: SLEEP, health: OLD_HEALTH, healthState: 'live'},
    card: {state: 'stale', generatedAt: SLEEP.generatedAt, score: SCORE},
    rows: {health: 'ACTIVE', sleep: 'ACTIVE'}
  },
  {
    name: 'sleep unavailable + health live',
    exports: {sleep: {data: null}, health: {data: HEALTH}},
    client: {sleep: null, health: HEALTH, healthState: 'live'},
    card: {state: 'unavailable', generatedAt: null, score: null},
    rows: {health: 'ACTIVE', sleep: 'OFFLINE'}
  }
]

let container: AstroContainer
beforeAll(async () => {
  container = await AstroContainer.create()
})

const GLOBALS = ['window', 'document', 'HTMLElement', 'Element', 'Node', 'requestAnimationFrame'] as const
function mount(html: string): Document {
  const dom = new JSDOM(`<!doctype html><body>${html}</body>`, {pretendToBeVisual: true})
  for (const key of GLOBALS) {
    ;(globalThis as Record<string, unknown>)[key] = (dom.window as unknown as Record<string, unknown>)[key]
  }
  return dom.window.document
}
afterEach(() => {
  for (const key of GLOBALS) {
    delete (globalThis as Record<string, unknown>)[key]
  }
})

// covers: widget-contract#A live web widget renders real data or an honest state in its server markup
describe.each(CASES)('NightSummary: $name', (c) => {
  it('server: the card follows the sleep export; only the score slot depends on health', async () => {
    const vm = toDashboardViewModels(c.exports, NOW)
    expect(vm.nightSummary.state).toBe(c.card.state)
    expect(vm.nightSummary.generatedAt ?? null).toBe(c.card.generatedAt)
    const doc = new JSDOM(await container.renderToString(NightSummary, {props: vm.nightSummary as never})).window.document
    const card = doc.getElementById('cardSleep')!
    expect(card.getAttribute('data-ssr-state')).toBe(c.card.state)
    expect(card.getAttribute('data-generated-at')).toBe(c.card.generatedAt)
    if (c.card.score === null) {
      expect(card.querySelector('[data-state-notice="unavailable"]')).not.toBeNull()
      expect(doc.getElementById('sleepScoreVal')?.textContent?.trim()).toBe('')
    } else {
      expect(doc.getElementById('sleepScoreVal')?.textContent?.trim()).toBe(c.card.score)
      // The sleep-derived slots render whatever health does.
      expect(doc.getElementById('sleepDuration')?.textContent?.trim()).toMatch(/^\d+h \d+m$/)
    }
    if (c.card.state === 'stale') {
      expect(card.querySelector('time.widget-timestamp-stale')?.getAttribute('datetime')).toBe(SLEEP.generatedAt)
    }
  })

  it('System Status: the sleep row follows the same sleep export', async () => {
    const vm = toDashboardViewModels(c.exports, NOW)
    const doc = new JSDOM(await container.renderToString(SystemStatus, {props: {...vm.systemStatus, compact: true} as never})).window.document
    const row = (source: string) => doc.querySelector(`.sys-line[data-source="${source}"]`)!
    for (const source of ['health', 'sleep'] as const) {
      expect(row(source).textContent).toContain(c.rows[source])
    }
    if (c.rows.sleep === 'ACTIVE') {
      expect(row('sleep').querySelector('time')?.getAttribute('datetime')).toBe(SLEEP.generatedAt)
    }
  })

  it("client: the sleep export's update shows the same values as the server", async () => {
    const vm = toDashboardViewModels(c.exports, NOW)
    const doc = mount(await container.renderToString(NightSummary, {props: vm.nightSummary as never}))
    const before = doc.body.innerHTML
    if (c.client.sleep === null) {
      // No sleep data: the client has nothing to write, and the card stays unavailable.
      expect(doc.getElementById('cardSleep')?.getAttribute('data-ssr-state')).toBe('unavailable')
      expect(doc.body.innerHTML).toBe(before)
      return
    }
    updateNightSummary(adaptSleep(c.client.sleep, sleepScoreSource(c.client.health, c.client.healthState)))
    expect(doc.getElementById('sleepScoreVal')?.textContent?.trim()).toBe(c.card.score)
    expect(doc.getElementById('sleepDuration')?.textContent?.trim()).toMatch(/^\d+h \d+m$/)
  })
})
