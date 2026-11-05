// Which book covers actually exist behind the first-party CloudFront distribution.
// NOT exported from src/index.ts — consumed only by tests.
//
// Why this file exists: post-adapter fixtures feed the SSR shell, whose covers are
// server-rendered straight into `<img src>` with no route interception in front of
// them. A cover URL naming an object the books pipeline never produced is therefore
// a guaranteed 403 on every page load — the ORB console noise reported as atlas 0086
// issue #2. Raw (pre-adapter) fixtures use the reserved fixtures.invalid host and
// therefore cannot be mistaken for objects verified on this distribution.

export const COVER_ORIGIN = 'https://d1pfm520aduift.cloudfront.net/images/books/'

/** The six per-ASIN derivative suffixes the pipeline emits. */
export const COVER_SUFFIXES: readonly string[] = ['.webp', '-thumb.webp', '-card.webp', '.avif', '-thumb.avif', '-card.avif']

/**
 * Every cover key the distribution serves, as ASIN -> served suffixes. An ASIN can serve
 * fewer than six keys: 0593128508 serves its three webp derivatives and no avif.
 *
 * Probed 2026-11-02 key by key (HTTP HEAD, plain User-Agent): every listed key answers
 * 200, and every omitted suffix of a listed ASIN answers 403. The distribution answers
 * 403, not 404, for a missing key, so any ASIN absent here serves nothing. Extend this
 * map only after probing all six keys of the ASIN.
 */
export const COVER_KEYS: Readonly<Record<string, readonly string[]>> = {
  '0525573844': COVER_SUFFIXES,
  '0593128508': ['.webp', '-thumb.webp', '-card.webp'],
  '0593723848': COVER_SUFFIXES,
  '080413717X': COVER_SUFFIXES,
  '1984820680': COVER_SUFFIXES,
  '1984820710': COVER_SUFFIXES,
  B07QVH2Q2K: COVER_SUFFIXES,
  B0FBRJY116: COVER_SUFFIXES
}

/**
 * ASINs that serve all six derivatives. A post-adapter book carries all six cover
 * fields or none, so these are the only ASINs a post-adapter cover may name.
 */
export const COVERED_ASINS: readonly string[] = Object.keys(COVER_KEYS).filter((asin) =>
  COVER_SUFFIXES.every((suffix) => COVER_KEYS[asin]?.includes(suffix))
)

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

/** Whether the distribution serves this exact cover URL, per COVER_KEYS. */
export function coverExists(url: string): boolean {
  const asin = coverAsin(url)
  if (asin === null) {
    return false
  }
  const suffix = url.slice(COVER_ORIGIN.length + asin.length)
  return COVER_KEYS[asin]?.includes(suffix) ?? false
}
