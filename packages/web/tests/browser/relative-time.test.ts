// Relative-time labels in a real Chromium (atlas decision 0164 D5).
//
// Loads the BUILT fixture page tests/browser/fixture-app/src/pages/relative-time.astro
// twice. With page JavaScript off, every <time data-relative> shows the
// server's absolute UTC text: what a no-JavaScript visitor sees. With it on,
// the page's bundled script runs fillRelativeTimes at a fixed clock, and the
// same elements show the relative label. Behavioral, DOM-level assertions; no
// screenshot baseline.
import {type Browser, chromium, type Page} from 'playwright'
import {afterAll, beforeAll, describe, expect, it} from 'vitest'
import {type RelativeStyle, relativeTimeLabel} from '../../src/runtime/relative-time'
import {type DistServer, serveDist} from './serve-dist'

const FILL_NOW = Date.parse('2026-03-18T13:30:00.000Z')
const UTC_TEXT = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC$/
const WIDGETS = ['SystemStatus', 'DevActivityLog', 'StarredRepoList', 'ReadingFeed'] as const

interface TimeNode {
  widget: string
  datetime: string
  style: string
  text: string
  visible: boolean
}

let server: DistServer
let browser: Browser

beforeAll(async () => {
  server = await serveDist()
  browser = await chromium.launch()
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await server?.close()
})

async function open(javaScriptEnabled: boolean): Promise<Page> {
  const context = await browser.newContext({javaScriptEnabled, viewport: {width: 820, height: 1100}})
  const page = await context.newPage()
  const response = await page.goto(`${server.baseUrl}/relative-time/`)
  expect(response?.status()).toBe(200)
  if (javaScriptEnabled) {
    await page.locator('html[data-relative-filled="1"]').waitFor()
  }
  // Let the entrance animations (the article rows) and the `.visible`
  // transition finish; an infinite one (the live dot) never does.
  await page.locator('html').evaluate(() =>
    Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished))
  )
  return page
}

/** Every <time data-relative> on the page, read in the page's isolated world. */
async function times(page: Page): Promise<TimeNode[]> {
  return page.locator('time[data-relative]').evaluateAll((els) =>
    els.map((el) => ({
      widget: el.closest('[data-widget]')?.getAttribute('data-widget') ?? '',
      datetime: el.getAttribute('datetime') ?? '',
      style: el.getAttribute('data-relative') ?? '',
      text: (el.textContent ?? '').trim(),
      visible: (() => {
        // Ancestor opacity counts: Playwright visibility ignores it.
        let opacity = 1
        for (let n: Element | null = el; n; n = n.parentElement) {
          opacity *= Number(getComputedStyle(n).opacity)
        }
        const box = el.getBoundingClientRect()
        return opacity > 0.9 && box.width > 0 && box.height > 0 && getComputedStyle(el).visibility !== 'hidden'
      })()
    }))
  )
}

describe('relative-time labels: absolute without JavaScript, relative with it', () => {
  it('JavaScript off: every <time data-relative> shows visible absolute UTC text, in every widget', async () => {
    const page = await open(false)
    expect(await page.locator('html').getAttribute('data-relative-filled')).toBeNull()
    const nodes = await times(page)
    expect([...new Set(nodes.map((n) => n.widget))].sort()).toEqual([...WIDGETS].sort())
    for (const n of nodes) {
      expect(n.text, `${n.widget} ${n.datetime}`).toMatch(UTC_TEXT)
      expect(n.visible, `${n.widget} ${n.datetime}`).toBe(true)
    }
    await page.context().close()
  })

  it('JavaScript on: the load pass replaces each absolute text with the relative label; datetime is unchanged', async () => {
    const off = await open(false)
    const before = await times(off)
    await off.context().close()

    const page = await open(true)
    const after = await times(page)
    expect(after.map((n) => n.datetime)).toEqual(before.map((n) => n.datetime))
    after.forEach((n, i) => {
      expect(n.text, `${n.widget} ${n.datetime}`).toBe(relativeTimeLabel(n.datetime, n.style as RelativeStyle, FILL_NOW))
      expect(n.text).not.toBe(before[i]!.text)
      expect(n.visible).toBe(true)
    })
    // Literal labels at FILL_NOW (90 minutes after the render clock), written
    // out here rather than read from the code under test.
    expect(after.map((n) => `${n.widget}: ${n.text}`)).toEqual([
      ...Array.from({length: 7}, () => 'SystemStatus: 1h ago'),
      'DevActivityLog: 1h ago',
      'DevActivityLog: 2h ago',
      'StarredRepoList: 4 days ago',
      'StarredRepoList: 1 week ago',
      'ReadingFeed: 1d ago',
      'ReadingFeed: 2d ago'
    ])
    await page.context().close()
  })
})
