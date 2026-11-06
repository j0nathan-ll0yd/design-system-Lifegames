// Every loading skeleton fits its card body, in a real Chromium, at the website's five
// viewports. DOM geometry only, no screenshots.
//
// The regression under guard: .skeleton-state is an absolute overlay on .widget-body, so
// it adds no height. A card that renders no scaffold while loading has a body of only
// its padding, and web 4.7.0 made the bars paint, so the card edge cut them. The overlay
// must stay out of the card's height: a taller loading card would add layout shift.
import {type Browser, type BrowserContext, chromium, type Page} from 'playwright'
import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest'
import {type DistServer, serveDist} from './serve-dist'

// The viewports of the website's Playwright config.
const VIEWPORTS = [
  {width: 390, height: 844},
  {width: 600, height: 900},
  {width: 768, height: 1024},
  {width: 1100, height: 800},
  {width: 1400, height: 900}
] as const

const CARDS = [
  'cardBooks',
  'cardDevLog',
  'cardExplorationOdometerV3',
  'cardHR',
  'cardHydration',
  'cardMovement',
  'cardReading',
  'cardSleep',
  'cardStarredRepos',
  'cardTheatreReviews',
  'cardWorkouts'
] as const

const SKELETON = '.skeleton-state .skeleton-bar, .skeleton-state .skeleton-circle'

let server: DistServer
let browser: Browser
/** Contexts this test opened; closed after each test, pass or fail. */
const contexts: BrowserContext[] = []

beforeAll(async () => {
  server = await serveDist()
  browser = await chromium.launch()
}, 60_000)

afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => context.close()))
})

afterAll(async () => {
  await browser?.close()
  await server?.close()
})

async function open(viewport: {width: number; height: number}, javaScriptEnabled: boolean): Promise<Page> {
  const context = await browser.newContext({viewport, javaScriptEnabled})
  contexts.push(context)
  const page = await context.newPage()
  const response = await page.goto(`${server.baseUrl}/skeleton-fit/`)
  expect(response?.status()).toBe(200)
  return page
}

interface Escape {
  /** The element's 0-based index in its card's skeleton. */
  index: number
  /** Pixels past the card body, per side. */
  top: number
  right: number
  bottom: number
  left: number
}

/** The skeleton elements of `card` that leave its body, or have no box to fit. */
function escapes(page: Page, card: string): Promise<Escape[]> {
  return page.locator(`#${card}`).evaluate((el, selector) => {
    const body = el.querySelector('.widget-body')!.getBoundingClientRect()
    const round = (n: number) => Math.round(Math.max(n, 0) * 10) / 10
    return [...el.querySelectorAll(selector)].flatMap((item, index) => {
      const box = item.getBoundingClientRect()
      const found = {
        index,
        top: round(body.top - box.top),
        right: round(box.right - body.right),
        bottom: round(box.bottom - body.bottom),
        left: round(body.left - box.left)
      }
      const empty = box.width <= 0 || box.height <= 0
      return empty || found.top || found.right || found.bottom || found.left ? [found] : []
    })
  }, SKELETON)
}

/** Restores the bars a compact skeleton dropped: the mutant `escapes` must catch. */
function addSecondBar(page: Page, card: string): Promise<void> {
  return page.locator(`#${card} .skeleton-state`).evaluate((state) => {
    const bar = document.createElement('div')
    bar.className = 'skeleton-bar'
    bar.style.cssText = 'width: 88%; height: 12px;'
    const second = bar.cloneNode() as HTMLElement
    state.append(bar, second)
    state.classList.remove('skeleton-state--compact')
  })
}

describe.each(VIEWPORTS)('skeletons fit at $width x $height', (viewport) => {
  describe.each([{scripts: 'on', javaScriptEnabled: true}, {scripts: 'off', javaScriptEnabled: false}])('scripts $scripts', ({javaScriptEnabled}) => {
    it('finds every card loading', async () => {
      const page = await open(viewport, javaScriptEnabled)
      const ids = await page.locator('.tri-card.is-loading').evaluateAll((els) => els.map((el) => el.id).sort())
      expect(ids).toEqual([...CARDS])
    })

    it.each(CARDS)('%s keeps every bar and circle inside its body', async (card) => {
      const page = await open(viewport, javaScriptEnabled)
      expect(await page.locator(`#${card}`).locator(SKELETON).count(), `${card} at ${viewport.width}px draws a skeleton`).toBeGreaterThan(0)
      expect(await escapes(page, card), `${card} at ${viewport.width}px`).toEqual([])
    })

    it.each(CARDS)('%s takes no height from its skeleton', async (card) => {
      const page = await open(viewport, javaScriptEnabled)
      const heights = await page.locator(`#${card}`).evaluate((el) => {
        const before = el.getBoundingClientRect().height
        el.querySelector('.skeleton-state')!.remove()
        return {before, after: el.getBoundingClientRect().height}
      })
      expect(heights.before, `${card} at ${viewport.width}px`).toBe(heights.after)
    })
  })
})

describe('the fit check can fail', () => {
  it.each(VIEWPORTS)('reports a restored second bar at $width x $height', async (viewport) => {
    const page = await open(viewport, true)
    expect(await escapes(page, 'cardReading'), 'control').toEqual([])
    await addSecondBar(page, 'cardReading')
    const found = await escapes(page, 'cardReading')
    expect(found.length, `cardReading at ${viewport.width}px`).toBeGreaterThan(0)
    expect(Math.max(...found.map((f) => f.bottom))).toBeGreaterThan(0)
  })
})
