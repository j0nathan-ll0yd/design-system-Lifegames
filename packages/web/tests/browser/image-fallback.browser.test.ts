import {describe, expect, it} from 'vitest'
import {installImageFallbacks, pictureWithAvif, PLACEHOLDER_IMAGE_SRC} from '../../src/runtime/image-utils'

// The gap that let 3.0.0 ship an image fallback that never painted.
//
// The jsdom suite asserts the MECHANISM (the <source> candidates are removed).
// It cannot assert the RESULT, because jsdom performs no <picture> source
// selection -- with a dead <source> still in the DOM it reports img.src as the
// placeholder and passes, while a real browser keeps resolving the dead source
// and paints a broken glyph. Every assertion here is on naturalWidth and
// currentSrc, which only a real engine produces.
const DEAD = 'https://images.invalid.test/missing'

/**
 * Build the markup detached, install the handler, and only then set the src.
 *
 * Order matters and is the whole point: an <img> that already carries a src in
 * parsed markup starts loading immediately, so a handler attached afterwards can
 * miss the error entirely. Consumers hit the same race on SSR markup, which is
 * why the Bookshelf installs fallbacks as part of its render rather than after.
 */
function mountAndArm(html: string, src: string): HTMLImageElement {
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.append(root)
  const img = root.querySelector('img')!
  installImageFallbacks(root)
  img.src = src
  return img
}

/** Poll until the element actually has pixels, or give up. Loads are async and
 *  the fallback adds a second round trip, so a single event wait is not enough. */
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

describe('installImageFallbacks in a real browser', () => {
  it('paints the same-origin placeholder when a <picture> AVIF source fails', async () => {
    const img = mountAndArm(
      `<picture><source srcset="${DEAD}.avif 1x" type="image/avif">` + `<img srcset="${DEAD}.webp 1x" data-fallback="${PLACEHOLDER_IMAGE_SRC}"></picture>`,
      `${DEAD}.webp`
    )

    const painted = await paintedSrc(img)

    // The result, not the mechanism: real pixels, from the placeholder.
    expect(img.naturalWidth).toBeGreaterThan(0)
    expect(painted.endsWith(PLACEHOLDER_IMAGE_SRC)).toBe(true)
    // Neither the broken glyph nor the dead AVIF candidate survived.
    expect(painted).not.toContain('.avif')
    expect(img.closest('picture')!.querySelectorAll('source')).toHaveLength(0)
  })

  it('paints the placeholder for a bare <img> too', async () => {
    const img = mountAndArm(`<img data-fallback="${PLACEHOLDER_IMAGE_SRC}">`, `${DEAD}.webp`)

    const painted = await paintedSrc(img)

    expect(img.naturalWidth).toBeGreaterThan(0)
    expect(painted.endsWith(PLACEHOLDER_IMAGE_SRC)).toBe(true)
  })

  it('paints the placeholder for the exact markup pictureWithAvif emits', async () => {
    // Bound to the real generator, not hand-written markup, so a change to the
    // emitted shape cannot quietly escape this test.
    const img = mountAndArm(pictureWithAvif({avifSrcset: `${DEAD}.avif 1x`, imgAttrs: `data-fallback="${PLACEHOLDER_IMAGE_SRC}"`}), `${DEAD}.webp`)

    const painted = await paintedSrc(img)

    expect(img.naturalWidth).toBeGreaterThan(0)
    expect(painted.endsWith(PLACEHOLDER_IMAGE_SRC)).toBe(true)
  })

  it('refuses a third-party data-fallback and still paints the placeholder', async () => {
    const img = mountAndArm(
      `<picture><source srcset="${DEAD}.avif 1x" type="image/avif">` + `<img data-fallback="https://m.media-amazon.com/images/P/B0001234.jpg"></picture>`,
      `${DEAD}.webp`
    )

    const painted = await paintedSrc(img)

    expect(img.naturalWidth).toBeGreaterThan(0)
    expect(painted).not.toContain('m.media-amazon.com')
    expect(painted.endsWith(PLACEHOLDER_IMAGE_SRC)).toBe(true)
  })
})
