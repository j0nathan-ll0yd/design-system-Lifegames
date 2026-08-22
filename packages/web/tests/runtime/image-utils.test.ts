// @vitest-environment jsdom
import {describe, expect, it} from 'vitest'
import {imgFallbackAttrs, installImageFallbacks, localizeImageUrl} from '../../src/runtime/image-utils'
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
  it('returns only an inert fallback attribute when the URLs differ', () => {
    const local = '/images/books/B0001234.webp'
    const original = CF_PREFIX + 'books/B0001234.webp'
    const result = imgFallbackAttrs(local, original)
    expect(result).not.toContain('onerror=')
    expect(result).toContain(`data-fallback="${original}"`)
  })

  it('returns empty string when originalUrl is null', () => {
    expect(imgFallbackAttrs('/images/foo.webp', null)).toBe('')
  })

  it('returns empty string when localSrc is null', () => {
    expect(imgFallbackAttrs(null, CF_PREFIX + 'foo.webp')).toBe('')
  })

  it('returns empty string when localSrc === originalUrl (same src, no fallback needed)', () => {
    const url = 'https://example.com/img.jpg'
    expect(imgFallbackAttrs(url, url)).toBe('')
  })

  it('result starts with a space (for safe HTML attribute concatenation)', () => {
    const result = imgFallbackAttrs('/images/foo.webp', CF_PREFIX + 'foo.webp')
    expect(result.startsWith(' ')).toBe(true)
  })
})

describe('installImageFallbacks', () => {
  it('swaps to the fallback at runtime without an inline handler attribute', () => {
    document.body.innerHTML =
      '<div id="root"><img src="/images/foo-card.webp" srcset="/images/foo-card.webp 1x" data-fallback="https://cdn.example/foo.webp"></div>'
    const root = document.getElementById('root')!
    const img = root.querySelector('img')!

    installImageFallbacks(root)

    expect(img.outerHTML).not.toContain('onerror=')
    img.dispatchEvent(new Event('error'))
    expect(img.srcset).toBe('')
    expect(img.src).toBe('https://cdn.example/foo.webp')
    expect(img.onerror).toBeNull()
  })
})
