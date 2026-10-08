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
  left: number
  top: number
  bottom: number
  /** Background colour alpha (0 = paints nothing). */
  backgroundAlpha: number
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
      left: box.left,
      top: box.top,
      bottom: box.bottom,
      backgroundAlpha: (() => {
        const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/)
        if (!m) {
          return 0
        }
        const parts = m[1]!.split(',').map((x) => parseFloat(x))
        return parts.length === 4 ? parts[3]! : 1
      })(),
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
    // Control: the page source carries the inline probe script, so a context
    // with JavaScript on WOULD set data-js. Here it must stay unset.
    const html = await (await page.request.get(page.url())).text()
    expect(html).toContain("setAttribute('data-js', 'ran')")
    expect(await page.locator('html').getAttribute('data-js')).toBeNull()
    // The isolated-world evaluate still reads computed style with page JS off.
    expect(await page.locator('body').evaluate((el) => getComputedStyle(el).margin)).toBe('0px')
    await page.close()
  })
  it('the probe proves itself: with JavaScript on, the marker is set', async () => {
    const jsContext = await browser.newContext({javaScriptEnabled: true})
    const page = await jsContext.newPage()
    await page.goto(`${baseUrl}/states/HeartRate/live/`)
    expect(await page.locator('html').getAttribute('data-js')).toBe('ran')
    await jsContext.close()
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
        // The skeleton must PAINT bars, not only reserve an overlay box: every
        // bar has a box and a visible background (tokens animations.css).
        const bars = page.locator(`#${id} .skeleton-state .skeleton-bar, #${id} .skeleton-state .skeleton-circle`)
        expect(await bars.count(), 'skeleton bars present').toBeGreaterThan(0)
        for (let i = 0; i < (await bars.count()); i++) {
          const b = await paint(bars.nth(i))
          expect(b.width * b.height, `bar[${i}] box`).toBeGreaterThan(0)
          expect(b.backgroundAlpha, `bar[${i}] paints a background: ${JSON.stringify(b)}`).toBeGreaterThan(0)
        }
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
    it('shows the full "as of" time on its own line, one-line title, nothing truncated or outside the card', async () => {
      const page = await open(name, width === 340 ? 'stale-340' : 'stale')
      const card = await paint(page.locator(`#${id}`))
      const label = await paint(page.locator(`#${id} .widget-label`).first())
      const time = page.locator(`#${id} time.widget-timestamp-stale`)
      const t = await paint(time)
      // The full time, never an ellipsis: "as of Mar 18, 5:00 AM PDT".
      expect(t.text, 'full as-of time').toMatch(/^as of [A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2} [AP]M [A-Z]{2,4}$/)
      const overflow = await time.evaluate((el) => ({scroll: el.scrollWidth, client: el.clientWidth, textOverflow: getComputedStyle(el).textOverflow}))
      expect(overflow.scroll, `time not truncated: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(overflow.client + 1)
      expect(label.height, `title one line: ${JSON.stringify(label)}`).toBeLessThanOrEqual(label.lineHeight * 1.5)
      expect(t.height, `time one line: ${JSON.stringify(t)}`).toBeLessThanOrEqual(t.lineHeight * 1.5)
      expect(t.left, 'time inside card (left)').toBeGreaterThanOrEqual(card.left - 0.5)
      expect(t.right, 'time inside card (right)').toBeLessThanOrEqual(card.right + 0.5)
      if (name === 'TheatreReviews') {
        const count = await paint(page.locator('#theatreCount'))
        expect(count.text).toMatch(/^\d+ reviews$/)
        expect(count.height, `count one line: ${JSON.stringify(count)}`).toBeLessThanOrEqual(count.lineHeight * 1.5)
      }
      await page.close()
    })
  })
})

// M-1 (WCAG 2.4.7): a keyboard focus ring in a card header paints in full. The
// stale header once set overflow: hidden, which clipped all but the left bar
// of the TheatreReviews count link's outline.
describe.each(['live', 'stale', 'live-340', 'stale-340'])('TheatreReviews focus ring (%s)', (variant) => {
  it("the focused count link's whole outline box is inside the card and no ancestor clips it", async () => {
    const page = await open('TheatreReviews', variant)
    await page.keyboard.press('Tab')
    const r = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement
      const cs = getComputedStyle(a)
      const box = a.getBoundingClientRect()
      const grow = (parseFloat(cs.outlineWidth) || 0) + Math.max(0, parseFloat(cs.outlineOffset) || 0)
      const ring = {left: box.left - grow, right: box.right + grow, top: box.top - grow, bottom: box.bottom + grow}
      const card = (a.closest('.tri-card') as HTMLElement).getBoundingClientRect()
      const clippers: string[] = []
      for (let n = a.parentElement; n && n !== document.body; n = n.parentElement) {
        const ncs = getComputedStyle(n)
        if (ncs.overflowX !== 'visible' || ncs.overflowY !== 'visible') {
          const nb = n.getBoundingClientRect()
          if (ring.left < nb.left - 0.5 || ring.right > nb.right + 0.5 || ring.top < nb.top - 0.5 || ring.bottom > nb.bottom + 0.5) {
            clippers.push(`${n.tagName}.${n.className} overflow=${ncs.overflow}`)
          }
        }
      }
      return {
        id: a.id,
        outlineStyle: cs.outlineStyle,
        outlineWidth: parseFloat(cs.outlineWidth),
        ring,
        card: {left: card.left, right: card.right, top: card.top, bottom: card.bottom},
        clippers
      }
    })
    expect(r.id, 'Tab reaches the count link').toBe('theatreCount')
    expect(r.outlineStyle, 'a visible focus outline').not.toBe('none')
    expect(r.outlineWidth).toBeGreaterThan(0)
    expect(r.ring.left).toBeGreaterThanOrEqual(r.card.left - 0.5)
    expect(r.ring.right).toBeLessThanOrEqual(r.card.right + 0.5)
    expect(r.ring.top).toBeGreaterThanOrEqual(r.card.top - 0.5)
    expect(r.ring.bottom).toBeLessThanOrEqual(r.card.bottom + 0.5)
    expect(r.clippers, `no ancestor clips the ring: ${JSON.stringify(r)}`).toEqual([])
    await page.close()
  })
})
