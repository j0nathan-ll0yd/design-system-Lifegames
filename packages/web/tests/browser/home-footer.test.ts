// The homepage footer's placement in a real Chromium, under the website's dashboard
// scroll lock (atlas decision 0158). DOM and layout assertions only, no screenshots.
//
// The regression under guard: above 1100px the website locks html and body to 100dvh,
// so a footer after .command-layout sits below the viewport and no reader reaches it.
// layout.css places .left-panel-footer instead: last in the left column above 1100px,
// and after System Status (order 99) below it, where .left-panel is display: contents.
//
// The scroll is a mouse wheel, as in text-page.test.ts: programmatic scrolling moves an
// overflow:hidden box too, so only the user's path proves a reader gets there.
import {type Browser, chromium, type Page} from 'playwright'
import {afterAll, beforeAll, describe, expect, it} from 'vitest'
import {type DistServer, serveDist} from './serve-dist'

const LAST_LINK = 'footer.left-panel-footer nav li:last-child > a'

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

async function open(viewport: {width: number; height: number}): Promise<Page> {
  const page = await browser.newPage({viewport})
  const response = await page.goto(`${server.baseUrl}/home-footer/`)
  expect(response?.status()).toBe(200)
  return page
}

/** Wheel at a point until the selector's box is in the viewport, then hit-test its center. */
async function wheelUntilReachable(page: Page, at: {x: number; y: number}, selector: string): Promise<void> {
  // A late font swap can grow the column after the wheel reached its end.
  await page.evaluate(() => document.fonts.ready)
  await page.mouse.move(at.x, at.y)
  await page.mouse.wheel(0, 20_000)
  await page.waitForFunction((sel) => {
    const box = document.querySelector(sel)!.getBoundingClientRect()
    return box.bottom > 0 && box.top < window.innerHeight
  }, selector, {timeout: 5_000})
  const hit = await page.locator(selector).evaluate((el) => {
    const box = el.getBoundingClientRect()
    const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
    return top !== null && (top === el || el.contains(top))
  })
  expect(hit).toBe(true)
}

/** Viewport-relative edges, read in one frame: the boxes the footer must follow, and the layout's own bottom. */
function edges(page: Page): Promise<{status: number; main: number; layout: number; footerTop: number; footerBottom: number}> {
  return page.evaluate(() => {
    const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect()
    const footer = box('.left-panel-footer')
    return {
      status: box('#fixture-status').bottom,
      main: box('.right-panel').bottom,
      layout: box('.command-layout').bottom,
      footerTop: footer.top,
      footerBottom: footer.bottom
    }
  })
}

/** True when any part of the element's box lies inside the viewport. */
function inViewport(page: Page, selector: string): Promise<boolean> {
  return page.locator(selector).evaluate((el) => {
    const box = el.getBoundingClientRect()
    return box.height > 0 && box.bottom > 0 && box.top < window.innerHeight
  })
}

describe('homepage footer, desktop 1400x900 (scroll lock on)', () => {
  it('closes the left column after System Status, and a wheel over the column reaches its last link', async () => {
    const page = await open({width: 1400, height: 900})
    try {
      const {status, footerTop} = await edges(page)
      expect(footerTop).toBeGreaterThanOrEqual(status)
      // Premise: the lock holds and the last link starts below the fold.
      expect(await page.evaluate(() => getComputedStyle(document.body).overflowY)).toBe('hidden')
      expect(await inViewport(page, LAST_LINK)).toBe(false)

      const panel = (await page.locator('.left-panel').boundingBox())!
      await wheelUntilReachable(page, {x: panel.x + panel.width / 2, y: 450}, LAST_LINK)
      expect(await page.evaluate(() => window.scrollY)).toBe(0)
    } finally {
      await page.close()
    }
  })

  it('drops to the foot of the left column when the column has room', async () => {
    const page = await open({width: 1400, height: 3000})
    try {
      const panel = await page.locator('.left-panel').evaluate((el) => {
        const box = el.getBoundingClientRect()
        return {bottom: box.bottom - parseFloat(getComputedStyle(el).paddingBottom), scrolls: el.scrollHeight > el.clientHeight}
      })
      expect(panel.scrolls).toBe(false)
      const {status, footerTop, footerBottom} = await edges(page)
      expect(footerBottom).toBeCloseTo(panel.bottom, 0)
      expect(footerTop).toBeGreaterThan(status)
    } finally {
      await page.close()
    }
  })
})

describe('homepage footer at 1100px and below (left panel display: contents)', () => {
  for (
    const [name, viewport] of [
      ['tablet 900x1100', {width: 900, height: 1100}],
      ['narrow 390x844', {width: 390, height: 844}]
    ] as const
  ) {
    it(`${name}: ends the page after System Status and the main panel, and a wheel reaches its last link`, async () => {
      const page = await open(viewport)
      try {
        const {status, main, layout, footerTop, footerBottom} = await edges(page)
        expect(footerTop).toBeGreaterThanOrEqual(status)
        expect(footerTop).toBeGreaterThanOrEqual(main)
        expect(footerBottom).toBeCloseTo(layout, 0)
        expect(await inViewport(page, LAST_LINK)).toBe(false)

        await wheelUntilReachable(page, {x: viewport.width / 2, y: viewport.height / 2}, LAST_LINK)
      } finally {
        await page.close()
      }
    })
  }
})
