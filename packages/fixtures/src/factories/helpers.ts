/**
 * Shared utilities for fixture factories.
 *
 * DETERMINISM: these factories produce COMMITTED, freshness-gated fixtures, so the
 * clock MUST be stable — re-running `pnpm -F @j0nathan-ll0yd/fixtures generate` has to
 * yield byte-identical output. `isoDate`/`isoTimestamp` are therefore anchored to a
 * fixed reference instant, NOT `Date.now()`. Override the anchor with the
 * `FIXTURES_NOW` env var (ISO string) for ad-hoc regeneration; absent that, the
 * baked-in `DEFAULT_REFERENCE_NOW` is used so a fresh clone reproduces the exact
 * committed bytes. Relative-time strings shown to users are computed downstream by
 * the runtime adapters at the consumer's clock (Playwright route interception
 * re-runs the adapter), so a fixed absolute timestamp here is correct.
 */

/** Stable anchor shared with post-adapter/starredRepos.ts for cross-domain determinism. */
const DEFAULT_REFERENCE_NOW = '2026-03-18T12:00:00.000Z'

function referenceNow(): Date {
  const override = process.env.FIXTURES_NOW
  const iso = override && override.length > 0 ? override : DEFAULT_REFERENCE_NOW
  return new Date(iso)
}

/**
 * Returns an ISO date string (YYYY-MM-DD) for a given number of days before the
 * stable reference instant.
 */
export function isoDate(daysAgo = 0): string {
  const d = referenceNow()
  d.setUTCDate(d.getUTCDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

/**
 * Returns an ISO timestamp string for a given number of days before the stable
 * reference instant.
 */
export function isoTimestamp(daysAgo = 0): string {
  const d = referenceNow()
  d.setUTCDate(d.getUTCDate() - daysAgo)
  return d.toISOString()
}

const LOREM_WORDS = [
  'lorem',
  'ipsum',
  'dolor',
  'sit',
  'amet',
  'consectetur',
  'adipiscing',
  'elit',
  'sed',
  'do',
  'eiusmod',
  'tempor',
  'incididunt',
  'ut',
  'labore',
  'et',
  'dolore',
  'magna',
  'aliqua',
  'enim',
  'ad',
  'minim',
  'veniam',
  'quis',
  'nostrud',
  'exercitation',
  'ullamco',
  'laboris',
  'nisi',
  'aliquip'
]

/**
 * Returns a lorem-style placeholder string with the requested number of words.
 */
export function placeholderText(words: number): string {
  const result: string[] = []
  for (let i = 0; i < words; i++) {
    // Modulo of a non-empty const array — the index is always in bounds.
    result.push(LOREM_WORDS[i % LOREM_WORDS.length]!)
  }
  return result.join(' ')
}

export interface Last90DaysEntry {
  date: string
  count: number
  uniquePlaces: number
  totalDurationMinutes: number
}

/**
 * Generates an array of 90 daily entries for location heatmap testing.
 * - 'full': every day has activity
 * - 'sparse': roughly 1 in 3 days has activity
 * - 'normal': roughly 2 in 3 days has activity
 */
export function last90DaysEntries(density: 'sparse' | 'full' | 'normal'): Last90DaysEntry[] {
  const entries: Last90DaysEntry[] = []
  for (let i = 89; i >= 0; i--) {
    const hasActivity = density === 'full' ? true : density === 'normal' ? i % 3 !== 0 : i % 3 === 0

    entries.push({
      date: isoDate(i),
      count: hasActivity ? 2 + (i % 4) : 0,
      uniquePlaces: hasActivity ? 1 + (i % 3) : 0,
      totalDurationMinutes: hasActivity ? 60 + (i % 5) * 30 : 0
    })
  }
  return entries
}
