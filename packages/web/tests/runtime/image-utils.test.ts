// @vitest-environment jsdom
import {describe, expect, it} from 'vitest'
import {imgFallbackAttrs, installImageFallbacks, localizeImageUrl, PLACEHOLDER_IMAGE_SRC} from '../../src/runtime/image-utils'
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

  it('passes through non-CloudFront URLs unchanged', () => {
    const amazon = 'https://m.media-amazon.com/images/P/B0001234.jpg'
    expect(localizeImageUrl(amazon)).toBe(amazon)
  })

  it('passes through a Squarespace URL unchanged', () => {
    const sq = 'https://images.squarespace-cdn.com/content/image.jpg'
    expect(localizeImageUrl(sq)).toBe(sq)
  })

  it('returns null for null input', () => {
    expect(localizeImageUrl(null)).toBeNull()
  })

  it('returns empty string for empty string input', () => {
    expect(localizeImageUrl('')).toBe('')
  })

  it('does not double-convert an already-local path', () => {
    const local = '/images/books/B01234.webp'
    expect(localizeImageUrl(local)).toBe(local)
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

  it('result starts with a space (for safe HTML attribute concatenation)', () => {
    expect(imgFallbackAttrs('/images/foo.webp').startsWith(' ')).toBe(true)
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
})
