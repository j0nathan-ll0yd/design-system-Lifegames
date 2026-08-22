import {CLOUDFRONT_BASE} from './constants'
import {esc} from './html-utils'

const CF_IMAGE_PREFIX = `${CLOUDFRONT_BASE}/images/`

/**
 * Converts a CloudFront image URL to a local path for same-origin serving.
 * Non-CloudFront URLs (e.g. Amazon, Squarespace) pass through unchanged.
 */
export function localizeImageUrl(url: string | null): string | null {
  if (!url || !url.startsWith(CF_IMAGE_PREFIX)) {
    return url
  }
  return '/images/' + url.slice(CF_IMAGE_PREFIX.length)
}

/**
 * Returns the inert data attribute used by the CSP-safe runtime fallback.
 * Event listeners are attached separately by installImageFallbacks so rendered
 * markup remains valid under a `script-src 'self'` policy.
 */
export function imgFallbackAttrs(localSrc: string | null, originalUrl: string | null): string {
  if (!originalUrl || !localSrc || localSrc === originalUrl) {
    return ''
  }
  return ` data-fallback="${esc(originalUrl)}"`
}

/** Attach one-shot image fallback behavior without inline event attributes. */
export function installImageFallbacks(root: ParentNode): void {
  const images = root.querySelectorAll<HTMLImageElement>('img[data-fallback]')
  images.forEach((img) => {
    img.onerror = (): void => {
      const fallback = img.dataset.fallback
      img.onerror = null
      if (fallback) {
        img.srcset = ''
        img.src = fallback
      }
    }
  })
}

/** Build <picture> markup for an image with AVIF + WebP sources.
 *  Returns HTML string suitable for both Astro templates and ES5 inline scripts. */
export function pictureWithAvif(opts: {avifSrcset: string | null; imgAttrs: string}): string {
  if (opts.avifSrcset) {
    return (
      '<picture><source srcset="' + opts.avifSrcset + '" type="image/avif">' + '<img ' + opts.imgAttrs + '></picture>'
    )
  }
  return '<img ' + opts.imgAttrs + '>'
}
