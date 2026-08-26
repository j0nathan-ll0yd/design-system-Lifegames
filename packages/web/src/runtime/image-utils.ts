import {CLOUDFRONT_BASE} from './constants'
import {esc} from './html-utils'

const CF_IMAGE_PREFIX = `${CLOUDFRONT_BASE}/images/`

/**
 * Same-origin "no image" placeholder. Every image fallback in this package
 * resolves here — a broken first-party image must never degrade to a
 * third-party host (atlas decision 0086).
 *
 * The asset ships with this package at `src/assets/no-cover.svg`; consumers
 * copy it to this path under their static root. In-repo that copy is
 * `apps/portfolio/public/images/no-cover.svg`, held byte-identical by
 * `scripts/check-placeholder-asset.test.mjs`.
 */
export const PLACEHOLDER_IMAGE_SRC = '/images/no-cover.svg'

/** True for same-origin paths only — the invariant the fallback path enforces. */
function isSameOriginPath(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//')
}

/**
 * Converts a CloudFront image URL to a local path for same-origin serving.
 * Non-CloudFront URLs pass through unchanged.
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
 *
 * The fallback target is ALWAYS the first-party placeholder — never the
 * source URL the image was built from. Callers pass only the src they render
 * so an image already showing the placeholder gets no redundant attribute.
 */
export function imgFallbackAttrs(src: string | null): string {
  if (!src || src === PLACEHOLDER_IMAGE_SRC) {
    return ''
  }
  return ` data-fallback="${esc(PLACEHOLDER_IMAGE_SRC)}"`
}

/**
 * Drop the `<source>` candidates of an enclosing `<picture>`, if there is one.
 *
 * Setting `img.src` is NOT enough inside a `<picture>`: the browser resolves the
 * image from the first matching `<source>`, and an `<img src>` only applies when
 * no source matched. pictureWithAvif() below emits exactly that shape, so a
 * cover whose AVIF source 404s kept re-resolving to the dead source and painted
 * a broken glyph while `img.src` silently held the placeholder. Removing the
 * candidates makes the `<img>` authoritative again.
 */
function dropPictureSources(img: HTMLImageElement): void {
  const parent = img.parentElement
  if (!parent || parent.tagName !== 'PICTURE') {
    return
  }
  parent.querySelectorAll('source').forEach((source) => source.remove())
}

/**
 * Attach one-shot image fallback behavior without inline event attributes.
 *
 * A `data-fallback` naming a third-party host is REFUSED and replaced with the
 * placeholder. Markup can outlive this code (a consumer serving an older SSR
 * shell), so the invariant is enforced here at the point of use rather than
 * trusted from the attribute.
 */
export function installImageFallbacks(root: ParentNode): void {
  const images = root.querySelectorAll<HTMLImageElement>('img[data-fallback]')
  images.forEach((img) => {
    img.onerror = (): void => {
      const fallback = img.dataset.fallback
      img.onerror = null
      dropPictureSources(img)
      img.srcset = ''
      img.src = fallback && isSameOriginPath(fallback) ? fallback : PLACEHOLDER_IMAGE_SRC
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
