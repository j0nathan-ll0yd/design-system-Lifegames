import {CLOUDFRONT_BASE} from './constants'

const CF_IMAGE_HOST = new URL(`${CLOUDFRONT_BASE}/images/`).host
const PLACEHOLDER_IMAGE_SRC = '/images/no-cover.svg'

export interface ImageSanitizerOptions {
  /** Absolute URL used to recognize same-origin absolute candidates during SSR. */
  baseUrl?: string | URL
  /** AVIF/source callers omit rejected candidates instead of emitting a placeholder source. */
  onReject?: 'placeholder' | 'omit'
}

function rejectedImageUrl(options: ImageSanitizerOptions): string | null {
  return options.onReject === 'omit' ? null : PLACEHOLDER_IMAGE_SRC
}

function ambientBaseUrl(options: ImageSanitizerOptions): URL | null {
  if (options.baseUrl) {
    try {
      return new URL(options.baseUrl)
    } catch {
      return null
    }
  }

  // Keep this module usable by server-only consumers whose TypeScript lib does
  // not include DOM declarations. Runtime narrowing still discovers baseURI in
  // a browser without importing any DOM types.
  const runtime: unknown = globalThis
  if (typeof runtime === 'object' && runtime !== null && 'document' in runtime) {
    const runtimeDocument = runtime.document
    if (typeof runtimeDocument === 'object' && runtimeDocument !== null && 'baseURI' in runtimeDocument && typeof runtimeDocument.baseURI === 'string') {
      return new URL(runtimeDocument.baseURI)
    }
  }
  return null
}

/**
 * Validate one image URL candidate before it reaches src or srcset.
 *
 * Accepted inputs are the exact HTTPS CloudFront image origin, same-origin
 * absolute or relative URLs (never protocol-relative), and data:image/* URLs.
 * The CloudFront path check deliberately stops at /images/: content-versioned
 * object keys are part of the contract and must not be inferred here.
 */
export function sanitizeImageUrl(url: string | null | undefined, options: ImageSanitizerOptions = {}): string | null {
  if (url == null) {
    return null
  }

  const candidate = url.trim()
  if (!candidate || candidate.startsWith('//')) {
    return rejectedImageUrl(options)
  }

  if (/^data:/i.test(candidate)) {
    try {
      const parsed = new URL(candidate)
      return parsed.protocol === 'data:' && /^data:image\/[a-z0-9.+-]+(?:;[^,]*)?,/i.test(candidate)
        ? candidate
        : rejectedImageUrl(options)
    } catch {
      return rejectedImageUrl(options)
    }
  }

  const base = ambientBaseUrl(options)
  try {
    const parsed = base ? new URL(candidate, base) : new URL(candidate)
    const isCloudFrontImage = parsed.protocol === 'https:' && parsed.host === CF_IMAGE_HOST && parsed.pathname.startsWith('/images/')
    if (isCloudFrontImage) {
      return candidate
    }

    const isSameOrigin = base !== null && (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.origin === base.origin
    if (isSameOrigin) {
      return candidate
    }

    return rejectedImageUrl(options)
  } catch {
    // A syntactically valid relative reference has no scheme of its own. Resolve
    // it against a sentinel origin and verify it cannot escape that origin via
    // backslashes or another URL-parser edge case.
    try {
      const sentinel = new URL('https://same-origin.invalid/')
      const parsed = new URL(candidate, sentinel)
      return parsed.origin === sentinel.origin && (parsed.protocol === 'http:' || parsed.protocol === 'https:')
        ? candidate
        : rejectedImageUrl(options)
    } catch {
      return rejectedImageUrl(options)
    }
  }
}
