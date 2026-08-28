import {CLOUDFRONT_BASE} from './constants'
import {esc} from './html-utils'
import {sanitizeImageUrl} from './image-sanitizer'
import type {ImageSanitizerOptions} from './image-sanitizer'

export { sanitizeImageUrl } from './image-sanitizer'
export type { ImageSanitizerOptions } from './image-sanitizer'

const CF_IMAGE_PREFIX = `${CLOUDFRONT_BASE}/images/`
const CF_IMAGE_HOST = new URL(CF_IMAGE_PREFIX).host

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

/**
 * Sanitizes an image URL, then converts an exact CloudFront /images/ URL to its
 * same-origin path. Rejected URLs become the placeholder unless a source caller
 * explicitly requests omission.
 */
export function localizeImageUrl(url: string | null | undefined, options: ImageSanitizerOptions = {}): string | null {
  const sanitized = sanitizeImageUrl(url, options)
  if (!sanitized) {
    return sanitized
  }
  try {
    const parsed = new URL(sanitized)
    if (parsed.protocol === 'https:' && parsed.host === CF_IMAGE_HOST && parsed.pathname.startsWith('/images/')) {
      return parsed.pathname + parsed.search + parsed.hash
    }
  } catch {
    // Relative and data URLs are already safe and already local where relevant.
  }
  return sanitized
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
export function imgFallbackAttrs(src: string | null, hasSource = false): string {
  if ((!src || src === PLACEHOLDER_IMAGE_SRC) && !hasSource) {
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
 * The URL this image is allowed to fall back to.
 *
 * A `data-fallback` naming a third-party host is REFUSED and replaced with the
 * placeholder. Markup can outlive this code (a consumer serving an older SSR
 * shell), so the invariant is enforced here at the point of use rather than
 * trusted from the attribute.
 */
function fallbackTarget(img: HTMLImageElement): string {
  const fallback = img.dataset.fallback
  return fallback && sanitizeImageUrl(fallback, {onReject: 'omit'}) ? fallback : PLACEHOLDER_IMAGE_SRC
}

/** Swap this image to the placeholder, once. */
function applyImageFallback(img: HTMLImageElement): void {
  img.onerror = null
  dropPictureSources(img)
  img.srcset = ''
  img.src = fallbackTarget(img)
}

/**
 * Attach one-shot image fallback behavior without inline event attributes.
 *
 * Arms images that have NOT loaded yet. Callers that generate markup and then
 * set the src (the live-data updaters, the book modal) are inherently in that
 * position. Server-rendered markup is not — use initImageFallbacks for that.
 */
export function installImageFallbacks(root: ParentNode): void {
  const images = root.querySelectorAll<HTMLImageElement>('img[data-fallback]')
  images.forEach((img) => {
    img.onerror = (): void => {
      applyImageFallback(img)
    }
  })
}

/**
 * True when the browser has already finished with this image and produced no
 * pixels — a load that failed before any handler could be attached.
 *
 * An `<img>` with no candidate at all also reports `complete`, so a real src or
 * srcset is required before a blank image counts as a failure.
 */
function hasAlreadyFailed(img: HTMLImageElement): boolean {
  if (!img.complete || img.naturalWidth > 0) {
    return false
  }
  return (img.getAttribute('src') || img.getAttribute('srcset') || '') !== ''
}

/**
 * Load-time entry point for SERVER-RENDERED covers.
 *
 * The SSR shell emits `data-fallback` on covers that are already loading by the
 * time any script runs, so installImageFallbacks alone is not enough: an image
 * that 404s during parse fires its error event before the handler exists, and
 * the visitor is left with a blank cover — the offline/slow/error path, before
 * (or instead of) the live-data swap that used to be the only thing installing
 * a handler at all.
 *
 * So this does both halves: arm everything not yet resolved, and recover
 * everything already resolved to nothing. Idempotent — an image already showing
 * its fallback target is left alone, so repeat calls cost nothing and cannot
 * re-request a placeholder that is itself unavailable.
 */
export function initImageFallbacks(root: ParentNode = document): void {
  const run = (): void => {
    installImageFallbacks(root)
    root.querySelectorAll<HTMLImageElement>('img[data-fallback]').forEach((img) => {
      if (img.getAttribute('src') === fallbackTarget(img)) {
        return
      }
      if (hasAlreadyFailed(img)) {
        applyImageFallback(img)
      }
    })
  }

  if (typeof document !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, {once: true})
    return
  }
  run()
}

/** Build <picture> markup for an image with AVIF + WebP sources.
 *  Returns HTML string suitable for both Astro templates and ES5 inline scripts. */
export function pictureWithAvif(opts: {avifSrcset: string | null; imgAttrs: string}): string {
  const avifSrcset = opts.avifSrcset?.split(/,\s+/).map((entry) => {
    const match = entry.trim().match(/^(.*?)(?:\s+([0-9.]+[wx]))?$/)
    const candidate = sanitizeImageUrl(match?.[1], {onReject: 'omit'})
    return candidate ? esc(candidate) + (match?.[2] ? ' ' + match[2] : '') : ''
  }).filter(Boolean).join(', ')
  if (avifSrcset) {
    return (
      '<picture><source srcset="' + avifSrcset + '" type="image/avif">' + '<img ' + opts.imgAttrs + '></picture>'
    )
  }
  return '<img ' + opts.imgAttrs + '>'
}
