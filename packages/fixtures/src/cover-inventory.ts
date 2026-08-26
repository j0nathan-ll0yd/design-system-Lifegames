// Which book covers actually exist behind the first-party CloudFront distribution.
// NOT exported from src/index.ts — consumed only by tests.
//
// Why this file exists: post-adapter fixtures feed the SSR shell, whose covers are
// server-rendered straight into `<img src>` with no route interception in front of
// them. A cover URL naming an object the books pipeline never produced is therefore
// a guaranteed 403 on every page load — the ORB console noise reported as atlas 0086
// issue #2. Raw (pre-adapter) fixtures are exempt: they reach a browser only through
// the consumer's Playwright `page.route(`${CLOUDFRONT_BASE}/**`)` interception, so
// their `example-*` keys are deliberate placeholders that never leave the sandbox.

export const COVER_ORIGIN = 'https://d1pfm520aduift.cloudfront.net/images/books/'

/**
 * ASINs the real books pipeline processed. Each has all six derivatives on the
 * distribution: `<asin>{,-thumb,-card}.{webp,avif}`.
 *
 * Verified 2026-08-26 by HTTP probe against the distribution — every key 200s.
 * Any other ASIN 403s (the distribution answers 403, not 404, for a missing key).
 * Extend this list only after probing the new ASIN's six keys.
 */
export const COVERED_ASINS: readonly string[] = ['0525573844', '0593723848', '1984820710', 'B07QVH2Q2K', 'B0FBRJY116']

/** The six per-ASIN derivative suffixes the pipeline emits. */
export const COVER_SUFFIXES: readonly string[] = ['.webp', '-thumb.webp', '-card.webp', '.avif', '-thumb.avif', '-card.avif']

// Longest first: `-thumb.webp` and `-card.webp` both end with `.webp`, so a
// shortest-match walk would read `0525573844-thumb` as the ASIN.
const SUFFIXES_LONGEST_FIRST = [...COVER_SUFFIXES].sort((a, b) => b.length - a.length)

/**
 * The ASIN a cover URL names, or null when the URL is not a first-party book cover.
 * Parses the key rather than substring-matching an ASIN, so a URL whose ASIN segment
 * merely CONTAINS a covered ASIN cannot pass.
 */
export function coverAsin(url: string): string | null {
  if (!url.startsWith(COVER_ORIGIN)) {
    return null
  }
  const key = url.slice(COVER_ORIGIN.length)
  for (const suffix of SUFFIXES_LONGEST_FIRST) {
    if (key.endsWith(suffix)) {
      const asin = key.slice(0, -suffix.length)
      return asin.length > 0 ? asin : null
    }
  }
  return null
}
