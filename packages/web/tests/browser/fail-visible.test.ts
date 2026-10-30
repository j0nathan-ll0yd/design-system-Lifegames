// The row entry animations fail visible, in a real Chromium. DOM and computed
// style assertions only, no screenshots.
//
// The regression under guard: .article-list-item (ReadingFeed) and .shelf-book
// (Bookshelf) had a base `opacity: 0` that only their entry animation lifted.
// Their keyframes live outside this package: fadeSlideRight in tokens/animations,
// shelfFadeIn in tokens/effects. A consumer that loaded components.css without
// them showed rows that never appeared.
//
// fail-visible-bare loads the web stylesheets only; fail-visible-tokens adds both
// token entrypoints. Each runs with the default motion preference and under
// `prefers-reduced-motion: reduce`.
import {type Browser, chromium, type Page} from 'playwright'
import {afterAll, beforeAll, describe, expect, it} from 'vitest'
import {type DistServer, serveDist} from './serve-dist'

const ROWS = [
  {selector: '.article-list-item', keyframes: 'fadeSlideRight'},
  {selector: '.shelf-book', keyframes: 'shelfFadeIn'}
] as const

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

async function open(path: string, reducedMotion: 'reduce' | 'no-preference'): Promise<Page> {
  const page = await browser.newPage({reducedMotion})
  // Records every CSS animation that runs to its end, from the first paint on.
  await page.addInitScript(() => {
    const ended: Array<{name: string; target: Element}> = []
    ;(window as unknown as {__ended: typeof ended}).__ended = ended
    document.addEventListener('animationend', (e) => ended.push({name: e.animationName, target: e.target as Element}), true)
  })
  const response = await page.goto(`${server.baseUrl}${path}`)
  expect(response?.status()).toBe(200)
  return page
}

interface Row {
  opacity: string
  /** Names of the CSS animations running on the row now. */
  animations: string[]
}

/** Every row's computed opacity and running animations, read in one task. */
function rows(page: Page, selector: string): Promise<Row[]> {
  return page.locator(selector).evaluateAll((els) =>
    els.map((el) => ({opacity: getComputedStyle(el).opacity, animations: el.getAnimations().map((a) => (a as CSSAnimation).animationName)}))
  )
}

describe('row entry animations fail visible', () => {
  for (const {selector, keyframes} of ROWS) {
    describe(selector, () => {
      it('shows every row at once without the token keyframes', async () => {
        const page = await open('/fail-visible-bare/', 'no-preference')
        const found = await rows(page, selector)
        expect(found.length, 'the fixture renders rows').toBeGreaterThan(1)
        expect(found, 'no keyframes, so no animation and no hidden state').toEqual(found.map(() => ({opacity: '1', animations: []})))
        await page.close()
      })

      it('shows every row at once under reduced motion without the token keyframes', async () => {
        const page = await open('/fail-visible-bare/', 'reduce')
        const found = await rows(page, selector)
        expect(found.length).toBeGreaterThan(1)
        expect(found).toEqual(found.map(() => ({opacity: '1', animations: []})))
        await page.close()
      })

      it('shows every row at once under reduced motion with the token keyframes', async () => {
        // tokens/animations shortens every animation under reduce but leaves the
        // stagger delay, which the backwards fill would hold hidden. The web
        // gate removes the animation instead.
        const page = await open('/fail-visible-tokens/', 'reduce')
        const found = await rows(page, selector)
        expect(found.length).toBeGreaterThan(1)
        expect(found).toEqual(found.map(() => ({opacity: '1', animations: []})))
        await page.close()
      })

      it(`runs ${keyframes} with the token keyframes and ends visible`, async () => {
        const page = await open('/fail-visible-tokens/', 'no-preference')
        const found = await rows(page, selector)
        expect(found.length).toBeGreaterThan(1)
        // The motion is kept: with the keyframes present, every row runs its
        // entry animation to the end.
        await page.waitForFunction(({selector, keyframes, count}) => {
          const ended = (window as unknown as {__ended: Array<{name: string; target: Element}>}).__ended
          return ended.filter((e) => e.name === keyframes && e.target.matches(selector)).length === count
        }, {selector, keyframes, count: found.length})
        const settled = await rows(page, selector)
        expect(settled).toEqual(found.map(() => ({opacity: '1', animations: []})))
        await page.close()
      })
    })
  }
})

describe('ReadingFeed list without tokens/reset', () => {
  it('does not indent its rows by the user agent list padding', async () => {
    // fail-visible-bare loads no tokens/reset, as the docs site and Storybook.
    const page = await open('/fail-visible-bare/', 'no-preference')
    const box = await page.locator('#cardReading .article-list').evaluate((el) => {
      const s = getComputedStyle(el)
      return {paddingLeft: s.paddingLeft, marginTop: s.marginTop, marginBottom: s.marginBottom}
    })
    expect(box).toEqual({paddingLeft: '0px', marginTop: '0px', marginBottom: '0px'})
    await page.close()
  })
})
