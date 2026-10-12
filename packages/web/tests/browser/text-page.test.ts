// TextPage in a real Chromium, under the website's dashboard scroll lock (atlas
// decision 0158). DOM, computed-style and layout assertions only, no screenshots.
//
// The regression under guard: the website's Dashboard.astro sets
// `html, body { overflow: hidden }` at 1100px and up so the bento grid fits 100dvh,
// and the text pages share that layout. Without the scroll rules in primitives.css,
// nothing below the first viewport of a text page can be reached at 1400x900.
// fixture-app/src/layouts/DashboardShell.astro carries those lock rules verbatim.
//
// The scroll is a mouse wheel, not scrollIntoView or scrollTo: programmatic scrolling
// moves an overflow:hidden box too, so only the user's path proves a reader gets there.
// The control page proves the shell really locks: same shell, same content, and
// primitives.css loaded through Card, but no TextPage.
import {type Browser, chromium, type Page} from 'playwright'
import {afterAll, beforeAll, describe, expect, it} from 'vitest'
import {type DistServer, serveDist} from './serve-dist'

const DESKTOP = {width: 1400, height: 900}
const MOBILE = {width: 390, height: 844}
const LAST_FOOTER_LINK = 'footer.lg-text-page-footer nav a:last-child'

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

async function open(path: string, viewport: {width: number; height: number}): Promise<Page> {
  const page = await browser.newPage({viewport})
  const response = await page.goto(`${server.baseUrl}${path}`)
  expect(response?.status()).toBe(200)
  return page
}

/** Source text with whitespace collapsed: the .astro layout puts content on its own lines. */
function norm(text: string | null): string | undefined {
  return text?.replace(/\s+/g, ' ').trim()
}

/** True when any part of the element's box lies inside the viewport. */
function inViewport(page: Page, selector: string): Promise<boolean> {
  return page.locator(selector).evaluate((el) => {
    const box = el.getBoundingClientRect()
    return box.height > 0 && box.bottom > 0 && box.top < window.innerHeight
  })
}

async function wheelToBottom(page: Page): Promise<void> {
  const viewport = page.viewportSize()!
  await page.mouse.move(viewport.width / 2, viewport.height / 2)
  await page.mouse.wheel(0, 20_000)
}

function overflow(page: Page): Promise<{html: string; body: string}> {
  return page.evaluate(() => ({html: getComputedStyle(document.documentElement).overflowY, body: getComputedStyle(document.body).overflowY}))
}

describe('TextPage scrolls under the dashboard lock', () => {
  for (
    const [name, viewport] of [
      ['desktop 1400x900', DESKTOP],
      ['mobile 390x844', MOBILE]
    ] as const
  ) {
    it(`${name}: a mouse wheel brings the last footer link into view`, async () => {
      const page = await open('/text-page/', viewport)
      try {
        // Premise: the card is taller than two viewports and its footer starts out of view.
        // Measured on the card, not the document: the document's height is what the fix changes.
        const cardHeight = await page.locator('.lg-text-page-card').evaluate((el) => el.getBoundingClientRect().height)
        expect(cardHeight).toBeGreaterThan(viewport.height * 2)
        expect(await inViewport(page, LAST_FOOTER_LINK)).toBe(false)

        await wheelToBottom(page)
        await page.waitForFunction((selector) => {
          const box = document.querySelector(selector)!.getBoundingClientRect()
          return box.bottom > 0 && box.top < window.innerHeight
        }, LAST_FOOTER_LINK, {timeout: 5_000})
        // The DOCUMENT scrolls, not an inner box. Below 1100px layout.css sets
        // `html, body { overflow: auto }` and the shell pins body to 100dvh, so without
        // the TextPage rules the body box scrolls and window.scrollY stays 0: the footer
        // is reachable, but mobile URL-bar collapse and scroll restoration never engage.
        expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
        // html overflow propagates to the viewport, so both must leave scrolling on.
        expect(await overflow(page)).toEqual({html: 'auto', body: 'visible'})
      } finally {
        await page.close()
      }
    })
  }

  it('control, desktop 1400x900: without TextPage the lock holds and the wheel moves nothing', async () => {
    const page = await open('/text-page-control/', DESKTOP)
    try {
      expect(await overflow(page)).toEqual({html: 'hidden', body: 'hidden'})
      expect(await inViewport(page, '#control-last')).toBe(false)

      await wheelToBottom(page)
      // Give a scroll the same chance the positive case gets before asserting it never came.
      await page.waitForTimeout(500)
      expect(await page.evaluate(() => window.scrollY)).toBe(0)
      expect(await inViewport(page, '#control-last')).toBe(false)
    } finally {
      await page.close()
    }
  })
})

describe('TextPage renders its card at desktop 1400x900', () => {
  let page: Page

  beforeAll(async () => {
    page = await open('/text-page/', DESKTOP)
  })

  afterAll(async () => {
    await page?.close()
  })

  it('shows the heading inside the card, as the h1 that names it', async () => {
    const h1 = page.locator('h1')
    expect(await h1.count()).toBe(1)
    expect(norm(await h1.textContent())).toBe('Fixture text page')
    expect(await h1.isVisible()).toBe(true)

    const card = page.locator('article.lg-text-page-card')
    expect(await card.getAttribute('aria-labelledby')).toBe(await h1.getAttribute('id'))

    const cardBox = (await card.boundingBox())!
    const h1Box = (await h1.boundingBox())!
    expect(h1Box.x).toBeGreaterThanOrEqual(cardBox.x)
    expect(h1Box.y).toBeGreaterThanOrEqual(cardBox.y)
    expect(h1Box.x + h1Box.width).toBeLessThanOrEqual(cardBox.x + cardBox.width)
  })

  it('shows the meta line, the lede, and the first section heading and body', async () => {
    for (
      const [selector, text] of [
        ['.lg-text-page-meta', 'Updated October 2026'],
        ['.lg-text-page-lede', 'Fixture lede paragraph.'],
        ['#section-1-heading', 'Fixture section 1']
      ] as const
    ) {
      const el = page.locator(selector)
      expect(await el.isVisible(), selector).toBe(true)
      expect(norm(await el.textContent()), selector).toBe(text)
    }
    const firstParagraph = page.locator('#section-1 .lg-text-page-section-body > p').first()
    expect(await firstParagraph.isVisible()).toBe(true)
    expect(await firstParagraph.textContent()).toMatch(/^Fixture paragraph 1\.1\. /)
  })

  it('applies the card styles from primitives.css, resolved from tokens', async () => {
    const styles = await page.evaluate(() => {
      const card = getComputedStyle(document.querySelector('.lg-text-page-card')!)
      const heading = getComputedStyle(document.querySelector('.lg-text-page-section-heading')!)
      const root = getComputedStyle(document.documentElement)
      return {
        maxWidth: card.maxWidth,
        borderTopStyle: card.borderTopStyle,
        background: card.backgroundColor,
        headingTransform: heading.textTransform,
        headingColor: heading.color,
        cyan: root.getPropertyValue('--lg-color-accent-cyan').trim()
      }
    })
    expect(styles.maxWidth).toBe('720px')
    expect(styles.borderTopStyle).toBe('solid')
    expect(styles.background).not.toBe('rgba(0, 0, 0, 0)')
    expect(styles.headingTransform).toBe('uppercase')
    expect(styles.cyan).toBe('#00d4ff')
    expect(styles.headingColor).toBe('rgb(0, 212, 255)')
  })

  it('styles a list item: no bullet, and the note on its own line', async () => {
    const list = await page.evaluate(() => {
      const ul = document.querySelector('#list ul')!
      const strong = ul.querySelector('li > strong')!.getBoundingClientRect()
      const small = ul.querySelector('li > small')!
      return {
        listStyle: getComputedStyle(ul).listStyleType,
        noteDisplay: getComputedStyle(small).display,
        noteBelowLabel: small.getBoundingClientRect().top >= strong.bottom
      }
    })
    expect(list).toEqual({listStyle: 'none', noteDisplay: 'block', noteBelowLabel: true})
  })

  it('marks the current page in the footer navigation', async () => {
    expect(await page.locator('footer nav a[aria-current="page"]').getAttribute('href')).toBe('/text-page/')
  })
})
