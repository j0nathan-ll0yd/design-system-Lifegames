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
// A narrow desktop Chromium context: no isMobile or touch emulation.
const NARROW = {width: 390, height: 844}
const LAST_FOOTER_LINK = 'footer.lg-text-page-footer nav li:last-child > a'

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
      ['narrow 390x844', NARROW]
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

  // Chrome before 108 and Safari before 15.4 also lack dvh. They drop every dvh
  // declaration, which is what the second pass does to the fallback body.
  for (const dvh of [true, false]) {
    it(`desktop 1400x900, no :has(), dvh ${dvh ? 'supported' : 'unsupported'}: the shipped @supports fallback makes the page its own scroll box`, async () => {
      // Chromium supports :has(), so this test plays an older browser. It deletes every
      // :has() rule, which is what a browser that cannot parse them does, then applies the
      // body of the shipped `@supports not selector(:has(*))` block, which such a browser
      // would match. Both come from the served stylesheet, not from this file.
      const page = await open('/text-page/', DESKTOP)
      try {
        // Raw stylesheet text, not CSSOM: Chromium serializes only the last valid
        // `height`, so the CSSOM never shows the 100vh line an older browser would use.
        const fallback = await page.evaluate(async () => {
          const texts = await Promise.all(
            [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map((link) => fetch(link.href).then((r) => r.text()))
          )
          texts.push(...[...document.querySelectorAll('style')].map((style) => style.textContent ?? ''))
          const match = texts.join('\n').match(/@supports not selector\(:has\(\*\)\)\s*\{([\s\S]*?\})\s*\}/)
          for (const sheet of [...document.styleSheets]) {
            for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
              const rule = sheet.cssRules[i]
              if (rule instanceof CSSStyleRule && rule.selectorText.includes(':has(')) {
                sheet.deleteRule(i)
              }
            }
          }
          return match ? match[1]! : null
        })
        expect(fallback).toMatch(/\.lg-text-page/)
        expect(fallback).toMatch(/100vh/)

        // Premise: with the :has() rules gone, the dashboard lock is back.
        expect(await overflow(page)).toEqual({html: 'hidden', body: 'hidden'})

        const applied = dvh ? fallback! : fallback!.replace(/[^;{}]*dvh[^;{}]*;?/g, '')
        expect(applied.includes('dvh')).toBe(dvh)
        await page.addStyleTag({content: applied})
        await wheelToBottom(page)
        await page.waitForFunction((selector) => {
          const box = document.querySelector(selector)!.getBoundingClientRect()
          return box.bottom > 0 && box.top < window.innerHeight
        }, LAST_FOOTER_LINK, {timeout: 5_000})
        expect(await page.locator('.lg-text-page').evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
      } finally {
        await page.close()
      }
    })
  }
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
      // The token's own computed colour, from a probe, so a retuned token cannot red this test.
      const probe = document.createElement('span')
      probe.style.color = 'var(--lg-color-accent-cyan)'
      document.body.append(probe)
      const cyan = getComputedStyle(probe).color
      probe.remove()
      return {
        maxWidth: card.maxWidth,
        borderTopStyle: card.borderTopStyle,
        background: card.backgroundColor,
        headingTransform: heading.textTransform,
        headingColor: heading.color,
        cyan
      }
    })
    expect(styles.maxWidth).toBe('720px')
    expect(styles.borderTopStyle).toBe('solid')
    expect(styles.background).not.toBe('rgba(0, 0, 0, 0)')
    expect(styles.headingTransform).toBe('uppercase')
    expect(styles.cyan).toMatch(/^rgb/)
    expect(styles.headingColor).toBe(styles.cyan)
  })

  it('takes the prefers-contrast raise from a11y.css whichever stylesheet loads last', async () => {
    const contrastPage = await browser.newPage({viewport: DESKTOP})
    try {
      await contrastPage.emulateMedia({contrast: 'more'})
      await contrastPage.goto(`${server.baseUrl}/text-page/`)
      const alpha = (rgba: string): number => {
        const parts = rgba.match(/[\d.]+/g)!.map(Number)
        return parts.length === 4 ? parts[3]! : 1
      }
      const cardBackground = () => contrastPage.locator('.lg-text-page-card').evaluate((el) => getComputedStyle(el).backgroundColor)

      // The raise reaches the card: a11y.css's 0.85 black, far more opaque than the 0.05 default.
      const raised = await cardBackground()
      expect(alpha(raised)).toBeGreaterThan(0.5)

      // Worst-case order: re-append the shipped default rule after every stylesheet, as if
      // primitives.css loaded after a11y.css. At zero specificity it must still lose.
      const appended = await contrastPage.evaluate(() => {
        const all = (list: CSSRuleList): CSSRule[] =>
          [...list].flatMap((rule) => ('cssRules' in rule ? [rule, ...all((rule as CSSGroupingRule).cssRules)] : [rule]))
        const rule = [...document.styleSheets].flatMap((sheet) => all(sheet.cssRules)).find((r): r is CSSStyleRule =>
          r instanceof CSSStyleRule && r.parentRule === null && r.style.getPropertyValue('--lg-card-background') !== ''
        )
        if (!rule) {
          return null
        }
        const style = document.createElement('style')
        style.textContent = rule.cssText
        document.head.append(style)
        return rule.selectorText
      })
      expect(appended).not.toBeNull()
      expect(await cardBackground()).toBe(raised)
    } finally {
      await contrastPage.close()
    }
  })

  it('styles a list item: no bullet, and the note on its own line', async () => {
    const list = await page.evaluate(() => {
      const ul = document.querySelector('#list ul')!
      const label = ul.querySelector('li > b')!.getBoundingClientRect()
      const small = ul.querySelector('li > small')!
      return {
        listStyle: getComputedStyle(ul).listStyleType,
        noteDisplay: getComputedStyle(small).display,
        noteBelowLabel: small.getBoundingClientRect().top >= label.bottom
      }
    })
    expect(list).toEqual({listStyle: 'none', noteDisplay: 'block', noteBelowLabel: true})
  })

  it('marks the current page in the footer navigation', async () => {
    expect(await page.locator('footer nav a[aria-current="page"]').getAttribute('href')).toBe('/text-page/')
  })
})
