import {afterEach, describe, expect, it} from 'vitest'
import {initImageFallbacks, installImageFallbacks, PLACEHOLDER_IMAGE_SRC} from '../../src/runtime/image-utils'

// The gap #229 left behind: it proved the fallback paints on the LIVE-DATA path
// (updateBookshelf generates markup, then arms it), and nothing exercised the
// SERVER-RENDERED path at all. On the SSR shell the covers are parsed with a src
// already on them, so they start loading before any script runs and a handler
// attached afterwards can miss the error entirely -- the offline PWA shell, a
// slow books.json, or a 4xx cover leaves a blank cover with no placeholder.
//
// Every assertion here is on naturalWidth / currentSrc, which only a real engine
// produces, and every case runs ONLY the load-time init. updateBookshelf and
// initBookshelf are deliberately never called: this suite fails if the load-time
// init is absent, no matter what the updaters do.
const DEAD = '/__image-failure/404'

const roots: HTMLElement[] = []

afterEach(() => {
  while (roots.length) {
    roots.pop()!.remove()
  }
})

/**
 * Mount markup the way the server delivers it: the `src` is present in the HTML
 * as it is parsed, so the load begins immediately and no handler is armed.
 */
function mountSsr(html: string): HTMLElement {
  const root = document.createElement('div')
  document.body.append(root)
  roots.push(root)
  root.innerHTML = html
  return root
}

/** The shape Bookshelf.astro server-renders for a cover with an AVIF sibling. */
function ssrPictureCover(): string {
  return `<li class="shelf-book"><div class="shelf-cover-wrapper"><picture>` +
    `<source srcset="${DEAD}-card.avif 1x, ${DEAD}-thumb.avif 2x" type="image/avif">` +
    `<img src="${DEAD}-card.webp" srcset="${DEAD}-card.webp 1x, ${DEAD}-thumb.webp 2x" width="80" height="120" ` +
    `alt="A Book" decoding="async" data-fallback="${PLACEHOLDER_IMAGE_SRC}">` +
    `</picture></div></li>`
}

/**
 * The shape Bookshelf.astro server-renders when no AVIF exists for the cover.
 *
 * Carries `loading="lazy"`, as the production covers do. A lazy image inside the
 * viewport still loads immediately, so the already-failed path is genuinely
 * exercised — the test below asserts that precondition rather than assuming it,
 * so a cover that never started loading reds instead of passing on the armed
 * path by accident.
 */
function ssrBareCover(): string {
  return `<li class="shelf-book"><div class="shelf-cover-wrapper">` +
    `<img src="${DEAD}-card.webp" width="80" height="120" alt="A Book" loading="lazy" decoding="async" ` +
    `data-fallback="${PLACEHOLDER_IMAGE_SRC}"></div></li>`
}

/** Poll until the browser is done with this image, however it ended. */
async function settled(img: HTMLImageElement, timeoutMs = 5000): Promise<void> {
  const deadline = performance.now() + timeoutMs
  while (performance.now() < deadline && !img.complete) {
    await new Promise((r) => setTimeout(r, 25))
  }
}

/** Poll until the element actually has pixels, or give up. The fallback costs a
 *  second round trip, so a single event wait is not enough. */
async function paintedSrc(img: HTMLImageElement, timeoutMs = 5000): Promise<string> {
  const deadline = performance.now() + timeoutMs
  while (performance.now() < deadline) {
    if (img.complete && img.naturalWidth > 0) {
      return img.currentSrc
    }
    await new Promise((r) => setTimeout(r, 25))
  }
  return ''
}

describe('the load-time init against server-rendered covers', () => {
  it('paints the placeholder when the cover already 404ed before any script ran', async () => {
    const root = mountSsr(ssrPictureCover())
    const img = root.querySelector('img')!

    // The whole point: let the load fail FIRST, with nothing armed. This is the
    // real SSR ordering -- parse, request, fail, then the module script runs.
    await settled(img)
    expect(img.complete).toBe(true)
    expect(img.naturalWidth).toBe(0)

    initImageFallbacks(root)

    const painted = await paintedSrc(img)
    expect(img.naturalWidth).toBeGreaterThan(0)
    expect(painted.endsWith(PLACEHOLDER_IMAGE_SRC)).toBe(true)
    // Neither the broken glyph nor the dead AVIF candidate survived.
    expect(painted).not.toContain('.avif')
    expect(root.querySelectorAll('source')).toHaveLength(0)
    expect(img.srcset).toBe('')
  })

  it('paints the placeholder for a bare lazy SSR <img> that already 404ed', async () => {
    const root = mountSsr(ssrBareCover())
    const img = root.querySelector('img')!

    await settled(img)
    // The precondition, asserted rather than assumed: this lazy cover really did
    // load and fail before anything was armed.
    expect(img.complete).toBe(true)
    expect(img.naturalWidth).toBe(0)

    initImageFallbacks(root)

    expect(await paintedSrc(img)).toMatch(new RegExp(`${PLACEHOLDER_IMAGE_SRC}$`))
    expect(img.naturalWidth).toBeGreaterThan(0)
  })

  it('paints the placeholder when the init wins the race and arms before the error', async () => {
    // The other half of the SSR timing window: the script may also run while the
    // cover is still in flight. Both orderings must reach the placeholder.
    const root = mountSsr(ssrPictureCover())
    const img = root.querySelector('img')!

    initImageFallbacks(root)

    const painted = await paintedSrc(img)
    expect(img.naturalWidth).toBeGreaterThan(0)
    expect(painted.endsWith(PLACEHOLDER_IMAGE_SRC)).toBe(true)
    expect(root.querySelectorAll('source')).toHaveLength(0)
  })

  it('refuses a third-party data-fallback on SSR markup and still paints', async () => {
    // Stale SSR markup from an older consumer build can still name a
    // third-party host; the same-origin refusal from 3.0.1 must hold on this
    // path too (atlas decision 0086).
    const root = mountSsr(
      `<picture><source srcset="${DEAD}.avif 1x" type="image/avif">` +
        `<img src="${DEAD}.webp" data-fallback="https://m.media-amazon.com/images/P/B0001234.jpg"></picture>`
    )
    const img = root.querySelector('img')!

    await settled(img)
    initImageFallbacks(root)

    const painted = await paintedSrc(img)
    expect(img.naturalWidth).toBeGreaterThan(0)
    expect(painted).not.toContain('m.media-amazon.com')
    expect(painted.endsWith(PLACEHOLDER_IMAGE_SRC)).toBe(true)
  })

  it('leaves a cover that is already showing the placeholder untouched', async () => {
    // Idempotence: the island, the production wrapper and a later updater may
    // each init. A second pass must not re-request or disturb a settled image.
    const root = mountSsr(`<img src="${PLACEHOLDER_IMAGE_SRC}" data-fallback="${PLACEHOLDER_IMAGE_SRC}">`)
    const img = root.querySelector('img')!

    expect(await paintedSrc(img)).toMatch(new RegExp(`${PLACEHOLDER_IMAGE_SRC}$`))

    initImageFallbacks(root)
    initImageFallbacks(root)

    expect(img.naturalWidth).toBeGreaterThan(0)
    expect(img.getAttribute('src')).toBe(PLACEHOLDER_IMAGE_SRC)
  })

  it('control: the same SSR cover stays blank when nothing arms it at load time', async () => {
    // Proves the assertions above are not vacuous -- the dead cover really does
    // paint nothing, and arming AFTER the error (what installImageFallbacks
    // alone does on SSR markup) does not recover it.
    const root = mountSsr(ssrPictureCover())
    const img = root.querySelector('img')!

    await settled(img)
    installImageFallbacks(root)

    // Give the fallback the same window the passing cases get.
    expect(await paintedSrc(img, 500)).toBe('')
    expect(img.naturalWidth).toBe(0)
  })
})
