// The row entry animations fail visible, in a real Chromium. DOM and computed
// style assertions only, no screenshots.
//
// The regression under guard: .article-list-item (ReadingFeed) and .shelf-book
// (Bookshelf) had a base `opacity: 0` that only their entry animation lifted. A
// consumer that loaded components.css without the keyframes showed rows that never
// appeared. components.css now imports them, and a row still shows if its animation
// never starts.
//
// fail-visible-bare loads the web stylesheets only; fail-visible-tokens adds both
// token entrypoints; fail-visible-website is the website's stylesheet set in its
// order. Each runs with the default motion preference and under
// `prefers-reduced-motion: reduce`.
import {type Browser, chromium, type Page} from 'playwright'
import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest'
import {type DistServer, serveDist} from './serve-dist'

const ROWS = [
  // `hover`: the computed transform of components.css's :hover rule.
  {selector: '.article-list-item', keyframes: 'fadeSlideRight', hover: 'matrix(1, 0, 0, 1, 6, 0)'},
  {selector: '.shelf-book', keyframes: 'shelfFadeIn', hover: 'matrix(1, 0, 0, 1, 0, -4)'}
] as const

let server: DistServer
let browser: Browser
/** Pages this test opened; closed after each test, pass or fail. */
const pages: Page[] = []

beforeAll(async () => {
  server = await serveDist()
  browser = await chromium.launch()
}, 60_000)

afterEach(async () => {
  await Promise.all(pages.splice(0).map((page) => page.close()))
})

afterAll(async () => {
  await browser?.close()
  await server?.close()
})

async function open(path: string, reducedMotion: 'reduce' | 'no-preference'): Promise<Page> {
  const page = await browser.newPage({reducedMotion})
  pages.push(page)
  // Records, from the first paint on, every CSS animation that starts (with
  // its timing, read while it runs) and every one that runs to its end.
  await page.addInitScript(() => {
    const log: Motion = {started: [], ended: []}
    ;(window as unknown as {__motion: Motion}).__motion = log
    document.addEventListener('animationstart', (e) => {
      const target = e.target as Element
      const animation = target.getAnimations().find((a) => (a as CSSAnimation).animationName === e.animationName)
      const timing = animation?.effect?.getTiming()
      log.started.push({name: e.animationName, target, fill: String(timing?.fill), delay: Number(timing?.delay)})
    }, true)
    document.addEventListener('animationend', (e) => log.ended.push({name: e.animationName, target: e.target as Element}), true)
  })
  const response = await page.goto(`${server.baseUrl}${path}`)
  expect(response?.status()).toBe(200)
  return page
}

interface Motion {
  started: Array<{name: string; target: Element; fill: string; delay: number}>
  ended: Array<{name: string; target: Element}>
}

interface Row {
  opacity: string
  /** Names of the CSS animations running on the row now. */
  animations: string[]
}

/**
 * Waits until `count` distinct rows matching `selector` have run `keyframes`
 * to the end. Distinct targets, so a replayed row cannot overshoot the count.
 */
async function waitForEntry(page: Page, selector: string, keyframes: string, count: number): Promise<void> {
  await page.waitForFunction(({selector, keyframes, count}) => {
    const {ended} = (window as unknown as {__motion: Motion}).__motion
    return new Set(ended.filter((e) => e.name === keyframes && e.target.matches(selector)).map((e) => e.target)).size >= count
  }, {selector, keyframes, count}, {timeout: 10_000})
}

/** Waits for every running animation and transition on `el` to finish. */
function settle(page: Page, selector: string): Promise<unknown> {
  return page.locator(selector).evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)))
}

/** Every row's computed opacity and running animations, read in one task. */
function rows(page: Page, selector: string): Promise<Row[]> {
  return page.locator(selector).evaluateAll((els) =>
    els.map((el) => ({opacity: getComputedStyle(el).opacity, animations: el.getAnimations().map((a) => (a as CSSAnimation).animationName)}))
  )
}

describe('row entry animations fail visible', () => {
  for (const {selector, keyframes, hover} of ROWS) {
    describe(selector, () => {
      it('shows every row at once when its animation never starts', async () => {
        const page = await open('/fail-visible-bare/', 'no-preference')
        // A name with no keyframes: the animation never starts, so the base style shows.
        await page.addStyleTag({content: `${selector} { animation-name: lg-no-such-keyframes !important; }`})
        const found = await rows(page, selector)
        expect(found.length, 'the fixture renders rows').toBeGreaterThan(1)
        expect(found, 'no animation and no hidden state').toEqual(found.map(() => ({opacity: '1', animations: []})))
      })

      it('shows every row at once under reduced motion with the web stylesheets only', async () => {
        const page = await open('/fail-visible-bare/', 'reduce')
        const found = await rows(page, selector)
        expect(found.length).toBeGreaterThan(1)
        expect(found).toEqual(found.map(() => ({opacity: '1', animations: []})))
      })

      it('shows every row at once under reduced motion with the token keyframes', async () => {
        // tokens/animations shortens every animation under reduce but leaves the
        // stagger delay, which the backwards fill would hold hidden. The web
        // gate removes the animation instead.
        const page = await open('/fail-visible-tokens/', 'reduce')
        const found = await rows(page, selector)
        expect(found.length).toBeGreaterThan(1)
        expect(found).toEqual(found.map(() => ({opacity: '1', animations: []})))
      })

      it.each(['fail-visible-bare', 'fail-visible-tokens'])(`runs ${keyframes} staggered on %s and ends visible`, async (fixture) => {
        const page = await open(`/${fixture}/`, 'no-preference')
        const found = await rows(page, selector)
        expect(found.length).toBeGreaterThan(1)
        // The motion is kept: every row runs its entry animation to the end,
        // with or without the token entrypoints.
        await waitForEntry(page, selector, keyframes, found.length)
        // Each row ran with the backwards fill and its own stagger delay, in
        // row order from 0.
        const timings = await page.locator(selector).evaluateAll((els, keyframes) => {
          const {started} = (window as unknown as {__motion: Motion}).__motion
          return els.map((el) => {
            const start = started.find((s) => s.target === el && s.name === keyframes)
            return start ? {fill: start.fill, delay: start.delay} : null
          })
        }, keyframes)
        expect(timings.map((t) => t?.fill)).toEqual(found.map(() => 'backwards'))
        const delays = timings.map((t) => t!.delay)
        expect(delays[0]).toBe(0)
        for (let i = 1; i < delays.length; i++) {
          expect(delays[i], `row ${i} starts after row ${i - 1}`).toBeGreaterThan(delays[i - 1]!)
        }
        const settled = await rows(page, selector)
        expect(settled).toEqual(found.map(() => ({opacity: '1', animations: []})))
      })

      it('applies the hover motion once the entry animation ends', async () => {
        // A forwards fill held the entry's end transform and so blocked the
        // :hover transform for good. The backwards fill lets it apply.
        const page = await open('/fail-visible-tokens/', 'no-preference')
        const count = await page.locator(selector).count()
        await waitForEntry(page, selector, keyframes, count)
        const first = `${selector} >> nth=0`
        await page.locator(first).hover()
        await settle(page, first)
        expect(await page.locator(first).evaluate((el) => getComputedStyle(el).transform)).toBe(hover)
      })
    })
  }
})

// Only the stylesheets the website loads, in its order. Before components.css
// imported tokens/motion, the website defined none of the tokens/animations keyframes,
// so these elements never moved in production.
describe('motion on the website stylesheet set', () => {
  const INFINITE = [
    {selector: '.live-dot', keyframes: 'dotPulse'},
    {selector: '.sys-dot', keyframes: 'dotPulse'},
    {selector: '.id-name', keyframes: 'glowPulse'}
  ]

  /** The names of every CSS animation that `selector` runs now, per element. */
  function running(page: Page, selector: string): Promise<string[][]> {
    return page.locator(selector).evaluateAll((els) => els.map((el) => el.getAnimations().map((a) => (a as CSSAnimation).animationName)))
  }

  describe.each(['fail-visible-website', 'fail-visible-bare'])('%s', (fixture) => {
    it.each(INFINITE)('$selector runs $keyframes with motion allowed', async ({selector, keyframes}) => {
      const page = await open(`/${fixture}/`, 'no-preference')
      const names = await running(page, selector)
      expect(names.length, 'the fixture renders the element').toBeGreaterThan(0)
      expect(names).toEqual(names.map(() => [keyframes]))
    })

    it('.id-avatar::after names a keyframe that resolves', async () => {
      // This proves the name resolves, not that a glow shows. IdentityCard puts the
      // class on an <img>, and a loaded <img> paints no ::after: the animation runs in
      // the Web Animations model and draws no pixel.
      const page = await open(`/${fixture}/`, 'no-preference')
      const names = await page.locator('.id-avatar').first().evaluate((el) =>
        el.getAnimations({subtree: true}).map((a) => (a as CSSAnimation).animationName)
      )
      expect(names).toEqual(['avatarGlowPulse'])
    })

    it('.article-list-item runs fadeSlideRight with motion allowed', async () => {
      const page = await open(`/${fixture}/`, 'no-preference')
      // A finite entry can end before a read after load, so the listener in open()
      // reads getAnimations() as each row starts. `fill` is that read.
      await page.waitForFunction(() => (window as unknown as {__motion: Motion}).__motion.started.some((s) => s.name === 'fadeSlideRight'), null, {
        timeout: 10_000
      })
      const fills = await page.evaluate(() =>
        (window as unknown as {__motion: Motion}).__motion.started.filter((s) => s.name === 'fadeSlideRight' && s.target.matches('.article-list-item')).map((
          s
        ) => s.fill)
      )
      expect(fills.length).toBeGreaterThan(0)
      expect(fills).toEqual(fills.map(() => 'backwards'))
    })

    it('runs no CSS animation anywhere under reduced motion', async () => {
      const page = await open(`/${fixture}/`, 'reduce')
      expect((await running(page, '.live-dot')).length, 'the fixture renders the element').toBeGreaterThan(0)
      expect((await running(page, '.article-list-item')).length, 'the fixture renders the element').toBeGreaterThan(0)
      // Two checks, because a global duration override can end an animation before a
      // read: nothing runs now, and nothing started since the first paint.
      const seen = await page.evaluate(() => ({
        running: document.getAnimations().filter((a) => a instanceof CSSAnimation).map((a) => (a as CSSAnimation).animationName),
        started: (window as unknown as {__motion: Motion}).__motion.started.map((s) => s.name)
      }))
      expect(seen).toEqual({running: [], started: []})
    })
  })

  it('styles the loading skeleton on the web stylesheets alone', async () => {
    // Widgets emit .skeleton-bar and .skeleton-circle in their loading state. Their
    // styles used to live only in tokens/animations, which the website does not load.
    const page = await open('/fail-visible-website/', 'no-preference')
    const styled = await page.evaluate(() => {
      const bar = document.body.appendChild(document.createElement('div'))
      bar.className = 'skeleton-bar'
      const circle = document.body.appendChild(document.createElement('div'))
      circle.className = 'skeleton-circle'
      return {
        bar: getComputedStyle(bar).backgroundColor,
        circle: getComputedStyle(circle).borderRadius,
        shimmer: getComputedStyle(bar, '::after').animationName
      }
    })
    expect(styled).toEqual({bar: 'rgba(255, 255, 255, 0.04)', circle: '50%', shimmer: 'shimmerSlide'})
  })
})

// Each page loads ONE web stylesheet and nothing else. Every other fixture loads a
// second file that also imports tokens/motion, so it would hide a lost @import.
describe.each([
  {
    fixture: 'motion-components-alone',
    sheet: 'components.css',
    other: '.lg-card',
    elements: [{selector: '.live-dot', keyframes: 'dotPulse'}, {selector: '.sys-dot', keyframes: 'dotPulse'}, {selector: '.id-name', keyframes: 'glowPulse'}]
  },
  {fixture: 'motion-primitives-alone', sheet: 'primitives.css', other: '.tri-card', elements: [{selector: '.lg-poll-dot--ok', keyframes: 'statusPulse'}]}
])('$sheet loaded alone', ({fixture, other, elements}) => {
  it('is the only web stylesheet on the page', async () => {
    const page = await open(`/${fixture}/`, 'no-preference')
    const found = await page.evaluate((fragment) => {
      const selectors: string[] = []
      const walk = (rules: CSSRuleList): void => {
        for (const rule of Array.from(rules)) {
          if (rule instanceof CSSStyleRule) {
            selectors.push(rule.selectorText)
          } else if ('cssRules' in rule) {
            walk((rule as CSSGroupingRule).cssRules)
          }
        }
      }
      Array.from(document.styleSheets).forEach((sheet) => walk(sheet.cssRules))
      return {rules: selectors.length, other: selectors.filter((selector) => selector.includes(fragment))}
    }, other)
    expect(found.rules, 'control: the stylesheet loaded').toBeGreaterThan(0)
    expect(found.other).toEqual([])
  })

  it.each(elements)('$selector runs $keyframes with motion allowed', async ({selector, keyframes}) => {
    const page = await open(`/${fixture}/`, 'no-preference')
    const names = await page.locator(selector).evaluateAll((els) => els.map((el) => el.getAnimations().map((a) => (a as CSSAnimation).animationName)))
    expect(names.length, 'the fixture renders the element').toBeGreaterThan(0)
    expect(names).toEqual(names.map(() => [keyframes]))
  })

  it('runs no CSS animation under reduced motion', async () => {
    const page = await open(`/${fixture}/`, 'reduce')
    expect(await page.locator(elements[0]!.selector).count(), 'the fixture renders the element').toBeGreaterThan(0)
    const seen = await page.evaluate(() => ({
      running: document.getAnimations().filter((a) => a instanceof CSSAnimation).map((a) => (a as CSSAnimation).animationName),
      started: (window as unknown as {__motion: Motion}).__motion.started.map((s) => s.name)
    }))
    expect(seen).toEqual({running: [], started: []})
  })
})

describe('components.css loaded alone', () => {
  it('runs the finite entry animation', async () => {
    const page = await open('/motion-components-alone/', 'no-preference')
    await page.waitForFunction(() => (window as unknown as {__motion: Motion}).__motion.started.some((s) => s.name === 'fadeSlideRight'), null, {
      timeout: 10_000
    })
  })
})

describe('primitives.css loaded alone', () => {
  it('runs the skeleton shimmer on its pseudo-element', async () => {
    const page = await open('/motion-primitives-alone/', 'no-preference')
    const names = await page.locator('.lg-skeleton-bar').first().evaluate((el) =>
      el.getAnimations({subtree: true}).map((a) => (a as CSSAnimation).animationName)
    )
    expect(names).toEqual(['shimmerSlide'])
  })
})

describe('ReadingFeed list without tokens/reset', () => {
  it('does not indent its rows by the user agent list padding', async () => {
    // fail-visible-bare loads no tokens/reset, as the docs site.
    const page = await open('/fail-visible-bare/', 'no-preference')
    const box = await page.locator('#cardReading .article-list').evaluate((el) => {
      const s = getComputedStyle(el)
      return {paddingLeft: s.paddingLeft, marginTop: s.marginTop, marginBottom: s.marginBottom}
    })
    expect(box).toEqual({paddingLeft: '0px', marginTop: '0px', marginBottom: '0px'})
  })
})

describe('ReadingFeed page 2', () => {
  it('staggers each page from its own first row', async () => {
    // The pager hides the other pages with display: none, so showing page 2
    // restarts its rows' entry animations. A delay from the list-wide index
    // held those rows hidden for 0.7 s and more.
    const page = await open('/reading-feed-pages/', 'no-preference')
    const list = '#cardReading .article-list-item'
    await waitForEntry(page, list, 'fadeSlideRight', 10)
    await page.locator('#cardReading .article-page-btn[data-page="2"]').click()
    const shown = await page.locator(list).evaluateAll((els) =>
      els.filter((el) => getComputedStyle(el).display !== 'none').map((el) => {
        const animation = el.getAnimations().find((a) => (a as CSSAnimation).animationName === 'fadeSlideRight')
        return Number(animation?.effect?.getTiming().delay)
      })
    )
    expect(shown.length, 'page 2 shows rows 11-20').toBe(10)
    expect(shown.map(Math.round), 'delays in ms, from 0 at the page top').toEqual(shown.map((_, i) => i * 70))
  })
})

// The website loads tokens/reset UNLAYERED after the layered web stylesheets,
// so its `ul { margin: 0; padding: 0 }` zeroes any .shelf-row spacing.
// fail-visible-website models that stack; fail-visible-tokens has no reset.
// fail-visible-docs models the docs showcase, which draws the ring from
// tokens/base instead of a11y.css.
describe.each(['fail-visible-tokens', 'fail-visible-website', 'fail-visible-docs'])('Bookshelf keyboard focus ring (%s)', (fixture) => {
  /**
   * Tabs to each tile in turn, as a keyboard user does, so :focus-visible
   * matches and the browser scrolls the tile into the row's view. With
   * `hover`, the pointer then rests on the focused tile. Returns, per tile,
   * the ring's outer box and the row's clip box.
   */
  async function ringBoxes(hover: boolean): Promise<Array<{width: string; style: string; inside: boolean}>> {
    const page = await open(`/${fixture}/`, 'no-preference')
    const links = page.locator('#cardBooks .shelf-book-link')
    const count = await links.count()
    expect(count).toBeGreaterThan(1)
    await waitForEntry(page, '.shelf-book', 'shelfFadeIn', count)
    const boxes = []
    for (let i = 0; i < count; i++) {
      do {
        await page.keyboard.press('Tab')
      } while (!(await links.nth(i).evaluate((el) => el === document.activeElement)))
      if (hover) {
        // Moves the pointer without a pointerdown, so input-modality.ts keeps
        // the keyboard modality and the ring stays drawn.
        await links.nth(i).hover()
      }
      // Waits for the hover lift's transition, where one runs.
      await links.nth(i).evaluate((el) => Promise.all(el.closest('.shelf-book')!.getAnimations().map((a) => a.finished)))
      boxes.push(await links.nth(i).evaluate((link) => {
        // a11y.css draws the ring on the title link's overlay (the tile's
        // padding box). .shelf-row clips at its padding edge.
        const tile = link.closest('.shelf-book')!
        const row = link.closest('.shelf-row')!
        const ring = getComputedStyle(link, '::after')
        const reach = parseFloat(ring.outlineOffset) + parseFloat(ring.outlineWidth)
        const t = tile.getBoundingClientRect()
        const ts = getComputedStyle(tile)
        const r = row.getBoundingClientRect()
        const rs = getComputedStyle(row)
        // The ring's outer box: the tile's padding box grown by the reach.
        const outer = {
          top: t.top + parseFloat(ts.borderTopWidth) - reach,
          left: t.left + parseFloat(ts.borderLeftWidth) - reach,
          right: t.right - parseFloat(ts.borderRightWidth) + reach,
          bottom: t.bottom - parseFloat(ts.borderBottomWidth) + reach
        }
        const clip = {
          top: r.top + parseFloat(rs.borderTopWidth),
          left: r.left + parseFloat(rs.borderLeftWidth),
          right: r.right - parseFloat(rs.borderRightWidth),
          bottom: r.bottom - parseFloat(rs.borderBottomWidth)
        }
        return {
          width: ring.outlineWidth,
          style: ring.outlineStyle,
          inside: outer.top >= clip.top && outer.left >= clip.left && outer.right <= clip.right && outer.bottom <= clip.bottom,
          outer,
          clip
        }
      }))
    }
    return boxes
  }

  it.each([false, true])('lies inside the shelf row clip for every tile (hovered: %s)', async (hover) => {
    for (const [i, box] of (await ringBoxes(hover)).entries()) {
      expect(`${box.style} ${box.width}`, `tile ${i}: the ring is drawn`).toBe('solid 2px')
      expect(box.inside, `tile ${i}: ${JSON.stringify(box)}`).toBe(true)
    }
  })

  /** The first tile's computed transform once its transitions finish. */
  function settledTransform(page: Page): Promise<string> {
    return page.locator('#cardBooks .shelf-book').first().evaluate(async (tile) => {
      await Promise.all(tile.getAnimations().map((a) => a.finished))
      return getComputedStyle(tile).transform
    })
  }

  it('lifts a tile that the mouse presses: mouse focus is not :focus-visible', async () => {
    const page = await open(`/${fixture}/`, 'no-preference')
    const link = page.locator('#cardBooks .shelf-book-link').first()
    await waitForEntry(page, '.shelf-book', 'shelfFadeIn', await page.locator('#cardBooks .shelf-book').count())
    const cover = (await page.locator('#cardBooks .shelf-cover-wrapper').first().boundingBox())!
    await page.mouse.move(cover.x + cover.width / 2, cover.y + cover.height / 2)
    // Press and hold: no release, so no click opens the book.
    await page.mouse.down()
    expect(await link.evaluate((el) => el === document.activeElement), 'control: the press focuses the link').toBe(true)
    expect(await link.evaluate((el) => el.matches(':focus-visible')), 'control: mouse focus is not focus-visible').toBe(false)
    expect(await settledTransform(page), 'the pressed, hovered tile lifts').toBe('matrix(1, 0, 0, 1, 0, -4)')
  })
})

// Only the web package's a11y.css suppresses the ring after pointer input;
// tokens/base does not, so the docs stack is not in this set.
describe.each(['fail-visible-tokens', 'fail-visible-website'])('Bookshelf hover lift under pointer modality (%s)', (fixture) => {
  it('lifts a keyboard-focused tile once pointer input hides its ring', async () => {
    const page = await open(`/${fixture}/`, 'no-preference')
    const link = page.locator('#cardBooks .shelf-book-link').first()
    await waitForEntry(page, '.shelf-book', 'shelfFadeIn', await page.locator('#cardBooks .shelf-book').count())
    do {
      await page.keyboard.press('Tab')
    } while (!(await link.evaluate((el) => el === document.activeElement)))
    // A pointerdown that does not move focus: input-modality.ts sets this
    // attribute, and the fixture does not run that tracker.
    await page.evaluate(() => {
      document.documentElement.dataset.inputModality = 'pointer'
    })
    await link.hover()
    expect(await link.evaluate((el) => el.matches(':focus-visible')), 'control: focus stays keyboard focus').toBe(true)
    expect(await link.evaluate((el) => getComputedStyle(el, '::after').outlineStyle), 'pointer input hides the ring').toBe('none')
    const transform = await link.evaluate(async (el) => {
      const tile = el.closest('.shelf-book')!
      await Promise.all(tile.getAnimations().map((a) => a.finished))
      return getComputedStyle(tile).transform
    })
    expect(transform, 'with no ring to clip, the hovered tile lifts').toBe('matrix(1, 0, 0, 1, 0, -4)')
  })
})
