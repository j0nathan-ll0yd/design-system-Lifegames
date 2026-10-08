// H2 (PR #289, atlas decision 0160): what a visitor with JavaScript DISABLED
// sees for each live widget in each state, in a real Chromium.
//
// The Storybook PNGs come from a lit mimic and are not evidence for the Astro
// widgets. This suite loads the BUILT static fixture pages
// (tests/browser/fixture-app, `astro build`), which carry the real widget
// markup and the real bundled CSS, in a context with javaScriptEnabled:false,
// and asserts on computed style and layout box. Playwright's locator.evaluate
// runs in its own isolated world, so it still works with page JS off; the
// sanity test below proves that rather than assuming it.
import {type Browser, type BrowserContext, chromium, type Locator, type Page} from 'playwright'
import {createServer, type Server} from 'node:http'
import {readFile} from 'node:fs/promises'
import {extname, join, normalize} from 'node:path'
import {fileURLToPath} from 'node:url'
import {afterAll, beforeAll, describe, expect, it} from 'vitest'

const DIST = fileURLToPath(new URL('./fixture-app/dist/', import.meta.url))
const MIME: Record<string, string> = {'.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml'}

const WIDGETS = [
  {name: 'HeartRate', id: 'cardHR'},
  {name: 'MovementRings', id: 'cardMovement'},
  {name: 'Hydration', id: 'cardHydration'},
  // NightSummary and Workouts author their own empty markup; the rest use the
  // shared [data-state-notice="empty"] contract.
  {name: 'NightSummary', id: 'cardSleep', emptySelector: '.sleep-insight-empty'},
  {name: 'Workouts', id: 'cardWorkouts', emptySelector: '.workout-rest-center'},
  {name: 'DevActivityLog', id: 'cardDevLog'},
  {name: 'StarredRepoList', id: 'cardStarredRepos'},
  {name: 'ReadingFeed', id: 'cardReading'},
  {name: 'Bookshelf', id: 'cardBooks'},
  {name: 'TheatreReviews', id: 'cardTheatreReviews'}
] as const
const VARIANTS = ['live', 'stale', 'empty', 'unavailable', 'suppressed', 'loading', 'unavailable-forced', 'suppressed-forced', 'loading-forced'] as const

let server: Server
let baseUrl: string
let browser: Browser
let context: BrowserContext

beforeAll(async () => {
  server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
    const file = normalize(join(DIST, path.endsWith('/') ? `${path}index.html` : path))
    if (!file.startsWith(DIST)) {
      res.statusCode = 403
      return res.end()
    }
    try {
      res.setHeader('Content-Type', MIME[extname(file)] ?? 'application/octet-stream')
      res.end(await readFile(file))
    } catch {
      res.statusCode = 404
      res.end()
    }
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  baseUrl = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`
  browser = await chromium.launch()
  context = await browser.newContext({javaScriptEnabled: false, viewport: {width: 420, height: 900}})
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await new Promise((resolve) => server?.close(resolve))
})

async function open(widget: string, variant: string): Promise<Page> {
  const page = await context.newPage()
  const response = await page.goto(`${baseUrl}/states/${widget}/${variant}/`)
  expect(response?.status()).toBe(200)
  return page
}

interface Paint {
  display: string
  visibility: string
  /** Own opacity multiplied through every ancestor: what the eye gets. */
  opacity: number
  width: number
  height: number
  animationName: string
  lineHeight: number
  right: number
  text: string
}

function paint(locator: Locator): Promise<Paint> {
  return locator.evaluate((el) => {
    const cs = getComputedStyle(el)
    let opacity = 1
    for (let n: Element | null = el; n; n = n.parentElement) {
      opacity *= Number(getComputedStyle(n).opacity)
    }
    const box = el.getBoundingClientRect()
    return {
      display: cs.display,
      visibility: cs.visibility,
      opacity,
      width: box.width,
      height: box.height,
      animationName: cs.animationName,
      lineHeight: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2,
      right: box.right,
      text: (el.textContent ?? '').trim()
    }
  })
}

function isPainted(p: Paint): boolean {
  return p.display !== 'none' && p.visibility !== 'hidden' && p.opacity > 0.9 && p.width > 0 && p.height > 0
}

// Playwright visibility ignores ancestor opacity; this helper covers every
// element of a selector and returns the ones that actually paint.
async function painted(page: Page, selector: string): Promise<string[]> {
  const out: string[] = []
  const all = page.locator(selector)
  for (let i = 0; i < (await all.count()); i++) {
    const p = await paint(all.nth(i))
    if (isPainted(p)) {
      out.push(`${selector}[${i}] ${JSON.stringify(p)}`)
    }
  }
  return out
}

// Sanity: JS really is off, and the isolated-world evaluate still works.
describe('harness', () => {
  it('runs with page scripts disabled and still reads computed style', async () => {
    const page = await open('HeartRate', 'live')
    const scriptsRan = await page.evaluate(() => typeof (window as any).__scriptProbe)
    expect(scriptsRan).toBe('undefined')
    // A <noscript> body is parsed as markup only when scripting is off.
    const noscript = await page.evaluate(() => document.querySelectorAll('noscript').length)
    expect(noscript).toBeGreaterThanOrEqual(0)
    const ctxJs = await page.evaluate(() => navigator.userAgent.length)
    expect(ctxJs).toBeGreaterThan(0)
    await page.close()
  })
  it('parses <noscript> content as elements (scripting off)', async () => {
    const page = await open('HeartRate', 'loading')
    expect(await page.locator('.widget-noscript').count()).toBeGreaterThan(0)
    await page.close()
  })
})

describe.each(WIDGETS)('$name with JavaScript disabled', (widget) => {
  const {name, id} = widget
  const emptySelector = 'emptySelector' in widget ? widget.emptySelector : '[data-state-notice="empty"]'
  describe.each(VARIANTS)('%s', (variant) => {
    const base = variant.replace(/-forced$/, '')
    it('renders honestly', async () => {
      const page = await open(name, variant)
      const root = page.locator(`#${id}`)
      expect(await root.count(), `#${id} present`).toBe(1)
      const rootPaint = await paint(root)
      expect(rootPaint.width, 'card box width').toBeGreaterThan(0)
      expect(rootPaint.height, 'card box height').toBeGreaterThan(0)

      // The root keeps the requested state. Empty exports resolve by rule: HeartRate
      // has no reading (unavailable) and Hydration reads zero (live); every
      // check below runs against the state the card actually rendered.
      const ssr = await root.getAttribute('data-ssr-state')
      if (base === 'empty') {
        expect(['empty', 'live', 'unavailable']).toContain(ssr)
      } else {
        expect(ssr).toBe(base)
      }
      const shown = base === 'empty' ? ssr : base

      if (shown === 'unavailable' || shown === 'suppressed') {
        const notice = page.locator(`#${id} [data-state-notice="${shown}"]`)
        expect(await notice.count(), `${shown} notice present`).toBeGreaterThan(0)
        const p = await paint(notice.first())
        expect(isPainted(p), `notice painted: ${JSON.stringify(p)}`).toBe(true)
        expect(p.text.length, 'notice has text').toBeGreaterThan(0)
        const scaffolds = page.locator(`#${id} [data-state-scaffold]`)
        for (let i = 0; i < (await scaffolds.count()); i++) {
          const s = await paint(scaffolds.nth(i))
          expect(s.display === 'none' || s.width * s.height === 0, `scaffold[${i}] not rendered: ${JSON.stringify(s)}`).toBe(true)
        }
        expect(await painted(page, `#${id} .skeleton-state`), 'no painted skeleton').toEqual([])
      }

      if (shown === 'loading') {
        const skeleton = await paint(page.locator(`#${id} .skeleton-state`).first())
        expect(skeleton.display, `skeleton: ${JSON.stringify(skeleton)}`).not.toBe('none')
        expect(skeleton.width * skeleton.height, 'skeleton box').toBeGreaterThan(0)
        const note = page.locator(`#${id} .widget-noscript`)
        expect(await note.count(), 'noscript note present').toBeGreaterThan(0)
        const n = await paint(note.first())
        expect(n.opacity, `noscript opacity: ${JSON.stringify(n)}`).toBeGreaterThan(0.9)
        expect(n.width * n.height, `noscript box: ${JSON.stringify(n)}`).toBeGreaterThan(0)
        expect(n.display).not.toBe('none')
        expect(n.text.length, 'noscript has text').toBeGreaterThan(0)
        const stamp = page.locator(`#${id} .widget-timestamp`)
        for (let i = 0; i < (await stamp.count()); i++) {
          expect((await paint(stamp.nth(i))).text, 'header timestamp empty while loading').toBe('')
        }
        const dots = page.locator(`#${id} .live-dot`)
        for (let i = 0; i < (await dots.count()); i++) {
          expect((await paint(dots.nth(i))).animationName, 'live-dot not animating while loading').toBe('none')
        }
      }

      if (shown === 'live' || shown === 'stale' || shown === 'empty') {
        expect(await painted(page, `#${id} .skeleton-state`), 'no painted skeleton').toEqual([])
        for (const state of ['unavailable', 'suppressed']) {
          expect(await painted(page, `#${id} [data-state-notice="${state}"]`), `no ${state} notice`).toEqual([])
        }
      }
      if (shown === 'live' || shown === 'stale') {
        const scaffolds = page.locator(`#${id} [data-state-scaffold]`)
        for (let i = 0; i < (await scaffolds.count()); i++) {
          const s = await paint(scaffolds.nth(i))
          expect(s.display, `scaffold[${i}] rendered: ${JSON.stringify(s)}`).not.toBe('none')
        }
      }
      if (base === 'empty' && ssr === 'empty') {
        const empty = page.locator(`#${id} ${emptySelector}`)
        expect(await empty.count(), 'empty notice present').toBeGreaterThan(0)
        const p = await paint(empty.first())
        expect(isPainted(p), `empty content painted: ${JSON.stringify(p)}`).toBe(true)
      }
      await page.close()
    })
  })

  describe.each([380, 340])('stale header at %ipx', (width) => {
    it('keeps the label on one line, matches the live header, and stays inside the card', async () => {
      const suffix = width === 340 ? '-340' : ''
      const header = async (variant: string) => {
        const page = await open(name, variant)
        const root = page.locator(`#${id}`)
        const head = page.locator(`#${id} .widget-header`).first()
        const label = page.locator(`#${id} .widget-label`).first()
        const stamp = page.locator(`#${id} .widget-timestamp`).first()
        const out = {head: await paint(head), label: await paint(label), stamp: await paint(stamp), card: await paint(root)}
        await page.close()
        return out
      }
      const live = await header(`live${suffix}`)
      const stale = await header(`stale${suffix}`)
      expect(stale.stamp.text, 'stale shows an as-of label').toMatch(/as of/i)
      expect(stale.label.height, `label one line: ${JSON.stringify(stale.label)}`).toBeLessThanOrEqual(stale.label.lineHeight * 1.5)
      expect(Math.abs(stale.head.height - live.head.height), `header height stale ${stale.head.height} vs live ${live.head.height}`).toBeLessThanOrEqual(2)
      expect(stale.stamp.right, `stale time right ${stale.stamp.right} vs card right ${stale.card.right}`).toBeLessThanOrEqual(stale.card.right + 0.5)
    })
  })
})
