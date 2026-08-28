// @vitest-environment jsdom
import {describe, expect, it} from 'vitest'
import {
  imgFallbackAttrs,
  installImageFallbacks,
  localizeImageUrl,
  pictureWithAvif,
  PLACEHOLDER_IMAGE_SRC,
  sanitizeImageUrl
} from '../../src/runtime/image-utils'
import {CLOUDFRONT_BASE} from '../../src/runtime/constants'

const CF_PREFIX = `${CLOUDFRONT_BASE}/images/`

describe('localizeImageUrl', () => {
  it('converts a CloudFront URL to a local /images/ path', () => {
    const url = CF_PREFIX + 'books/B01234.webp'
    expect(localizeImageUrl(url)).toBe('/images/books/B01234.webp')
  })

  it('converts nested CloudFront path', () => {
    const url = CF_PREFIX + 'theatre/my-show-slug.webp'
    expect(localizeImageUrl(url)).toBe('/images/theatre/my-show-slug.webp')
  })

  it('replaces a third-party URL with the placeholder', () => {
    const amazon = 'https://m.media-amazon.com/images/P/B0001234.jpg'
    expect(localizeImageUrl(amazon)).toBe(PLACEHOLDER_IMAGE_SRC)
  })

  it('replaces another CDN URL with the placeholder', () => {
    const sq = 'https://images.squarespace-cdn.com/content/image.jpg'
    expect(localizeImageUrl(sq)).toBe(PLACEHOLDER_IMAGE_SRC)
  })

  it('returns null for null input', () => {
    expect(localizeImageUrl(null)).toBeNull()
  })

  it('replaces an empty candidate with the placeholder', () => {
    expect(localizeImageUrl('')).toBe(PLACEHOLDER_IMAGE_SRC)
  })

  it('does not double-convert an already-local path', () => {
    const local = '/images/books/B01234.webp'
    expect(localizeImageUrl(local)).toBe(local)
  })
})

describe('sanitizeImageUrl', () => {
  const baseUrl = 'https://dashboard.example.test/books'

  it.each([
    `${CF_PREFIX}books/B01234-v17.webp`,
    '/images/books/B01234-v17.webp',
    'images/books/B01234-v17.webp',
    'https://dashboard.example.test/images/books/B01234-v17.webp',
    'data:image/png;base64,iVBORw0KGgo='
  ])('allows an approved image candidate: %s', (candidate) => {
    expect(sanitizeImageUrl(candidate, {baseUrl})).toBe(candidate)
  })

  it.each([
    '//d1pfm520aduift.cloudfront.net/images/books/B01234.webp',
    'http://d1pfm520aduift.cloudfront.net/images/books/B01234.webp',
    'https://d1pfm520aduift.cloudfront.net.evil.test/images/books/B01234.webp',
    'https://evil.test/d1pfm520aduift.cloudfront.net/images/books/B01234.webp',
    'https://d1pfm520aduift.cloudfront.net/not-images/B01234.webp',
    'https://dashboard.example.test.evil.test/images/books/B01234.webp',
    'javascript:alert(1)',
    'data:text/html,<svg></svg>'
  ])('rejects a non-approved image candidate: %s', (candidate) => {
    expect(sanitizeImageUrl(candidate, {baseUrl})).toBe(PLACEHOLDER_IMAGE_SRC)
  })

  it('omits a rejected source candidate when requested', () => {
    expect(sanitizeImageUrl('https://evil.test/cover.avif', {baseUrl, onReject: 'omit'})).toBeNull()
  })
})

describe('imgFallbackAttrs', () => {
  it('targets the first-party placeholder, never the source URL', () => {
    const result = imgFallbackAttrs('/images/books/B0001234.webp')
    expect(result).not.toContain('onerror=')
    expect(result).toContain(`data-fallback="${PLACEHOLDER_IMAGE_SRC}"`)
  })

  it('targets the placeholder for a CloudFront src too (no third-party host anywhere)', () => {
    const result = imgFallbackAttrs(CF_PREFIX + 'books/B0001234.webp')
    expect(result).toContain(`data-fallback="${PLACEHOLDER_IMAGE_SRC}"`)
    expect(result).not.toContain('m.media-amazon.com')
    expect(result).not.toContain('squarespace')
  })

  it('returns empty string when src is null', () => {
    expect(imgFallbackAttrs(null)).toBe('')
  })

  it('returns empty string when the src is already the placeholder', () => {
    expect(imgFallbackAttrs(PLACEHOLDER_IMAGE_SRC)).toBe('')
  })

  it('arms a placeholder img when a picture source can override it', () => {
    expect(imgFallbackAttrs(PLACEHOLDER_IMAGE_SRC, true)).toContain(`data-fallback="${PLACEHOLDER_IMAGE_SRC}"`)
  })

  it('result starts with a space (for safe HTML attribute concatenation)', () => {
    expect(imgFallbackAttrs('/images/foo.webp').startsWith(' ')).toBe(true)
  })
})

describe('pictureWithAvif', () => {
  it('omits a rejected AVIF source candidate', () => {
    const html = pictureWithAvif({avifSrcset: 'https://evil.test/cover.avif 1x', imgAttrs: `src="${PLACEHOLDER_IMAGE_SRC}"`})
    expect(html).toBe(`<img src="${PLACEHOLDER_IMAGE_SRC}">`)
  })
})

describe('installImageFallbacks', () => {
  it('swaps to the placeholder at runtime without an inline handler attribute', () => {
    document.body.innerHTML =
      `<div id="root"><img src="/images/foo-card.webp" srcset="/images/foo-card.webp 1x" data-fallback="${PLACEHOLDER_IMAGE_SRC}"></div>`
    const root = document.getElementById('root')!
    const img = root.querySelector('img')!

    installImageFallbacks(root)

    expect(img.outerHTML).not.toContain('onerror=')
    img.dispatchEvent(new Event('error'))
    expect(img.srcset).toBe('')
    expect(new URL(img.src).pathname).toBe(PLACEHOLDER_IMAGE_SRC)
    expect(img.onerror).toBeNull()
  })

  it('refuses a third-party data-fallback and uses the placeholder instead', () => {
    // Stale SSR markup from an older consumer build can still carry a
    // third-party fallback; the invariant is enforced at the point of use.
    document.body.innerHTML = '<div id="root"><img src="/images/foo-card.webp" data-fallback="https://m.media-amazon.com/images/P/B0001234.jpg"></div>'
    const root = document.getElementById('root')!
    const img = root.querySelector('img')!

    installImageFallbacks(root)
    img.dispatchEvent(new Event('error'))

    expect(img.src).not.toContain('m.media-amazon.com')
    expect(new URL(img.src).pathname).toBe(PLACEHOLDER_IMAGE_SRC)
  })

  // Regression: every case above uses a BARE <img>, but pictureWithAvif() emits
  // <picture><source><img>, which is what the Bookshelf actually renders. Inside
  // a <picture> the browser resolves from the first matching <source> and only
  // falls to <img src> when none matched, so setting img.src while a dead
  // <source> remains leaves the broken glyph on screen -- and jsdom, which does
  // no source selection, reported the placeholder either way. That combination
  // is why 3.0.0 shipped a fallback that never fired. Assert the sources are
  // gone; the paint itself is asserted in image-fallback.browser.test.ts.
  describe('inside a <picture> (the shape pictureWithAvif emits)', () => {
    function renderPicture(): {root: HTMLElement; img: HTMLImageElement} {
      document.body.innerHTML = `<div id="root"><picture>` +
        `<source srcset="/images/foo-card.avif 1x, /images/foo-thumb.avif 2x" type="image/avif">` +
        `<img src="/images/foo-card.webp" srcset="/images/foo-card.webp 1x" data-fallback="${PLACEHOLDER_IMAGE_SRC}">` +
        `</picture></div>`
      const root = document.getElementById('root')!
      return {root, img: root.querySelector('img')!}
    }

    it('removes every <source> candidate so the placeholder cannot be overridden', () => {
      const {root, img} = renderPicture()
      installImageFallbacks(root)

      expect(root.querySelectorAll('source')).toHaveLength(1)
      img.dispatchEvent(new Event('error'))

      expect(root.querySelectorAll('source')).toHaveLength(0)
      expect(img.srcset).toBe('')
      expect(new URL(img.src).pathname).toBe(PLACEHOLDER_IMAGE_SRC)
    })

    it('leaves no reference to the failed source anywhere in the markup', () => {
      const {root, img} = renderPicture()
      installImageFallbacks(root)
      img.dispatchEvent(new Event('error'))

      expect(root.innerHTML).not.toContain('.avif')
      expect(root.querySelector('picture')).not.toBeNull()
    })

    it('keeps the same-origin refusal inside a <picture>', () => {
      document.body.innerHTML = '<div id="root"><picture>' +
        '<source srcset="https://m.media-amazon.com/images/P/B0001234.jpg 1x" type="image/jpeg">' +
        '<img src="/images/foo-card.webp" data-fallback="https://m.media-amazon.com/images/P/B0001234.jpg">' +
        '</picture></div>'
      const root = document.getElementById('root')!
      const img = root.querySelector('img')!

      installImageFallbacks(root)
      img.dispatchEvent(new Event('error'))

      // data-fallback itself is left alone -- the refusal is enforced where the
      // value is used, not by rewriting markup. What must not survive is a
      // third-party candidate the browser could still resolve.
      expect(root.querySelectorAll('source')).toHaveLength(0)
      expect(img.src).not.toContain('m.media-amazon.com')
      expect(img.srcset).toBe('')
      expect(new URL(img.src).pathname).toBe(PLACEHOLDER_IMAGE_SRC)
    })

    it('does not disturb a sibling <picture> that has not failed', () => {
      document.body.innerHTML = `<div id="root">` +
        `<picture id="a"><source srcset="/images/a.avif" type="image/avif"><img src="/images/a.webp" data-fallback="${PLACEHOLDER_IMAGE_SRC}"></picture>` +
        `<picture id="b"><source srcset="/images/b.avif" type="image/avif"><img src="/images/b.webp" data-fallback="${PLACEHOLDER_IMAGE_SRC}"></picture>` +
        `</div>`
      const root = document.getElementById('root')!
      installImageFallbacks(root)
      root.querySelector<HTMLImageElement>('#a img')!.dispatchEvent(new Event('error'))

      expect(root.querySelectorAll('#a source')).toHaveLength(0)
      expect(root.querySelectorAll('#b source')).toHaveLength(1)
    })
  })
})
