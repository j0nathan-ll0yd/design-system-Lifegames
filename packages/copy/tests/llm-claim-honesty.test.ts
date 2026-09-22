import {describe, expect, it} from 'vitest'
import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PKG = join(HERE, '..')

/**
 * The llm namespace may not claim a data window or a habit that the source cannot support.
 *
 * Ground truth (atlas decision 0142 D2), read from the consumer, not assumed:
 *   - `mantle-LifegamesPortal/src/schemas/health.ts:78` —
 *     `healthQuantitySchema = z.object({type, date, value, unit})`. ONE dated value per metric.
 *   - `src/lib/llm-content/aggregate.ts:81` reads exactly one entry
 *     (`health.quantities['restingHeartRate']`) and rounds `entry.value`. No series, nothing to
 *     average across days.
 *   - `aggregate.ts:259` derives workout activity types from the distinct types present in the
 *     latest export, capped at three — the set in one export, not a habit.
 *
 * So "7-day aggregate", "weekly", and "typical" were all false claims about real data. This asserts
 * the PROPERTY, not the replacement sentence: a future reword cannot silently reintroduce the claim,
 * and it also cannot be satisfied by pinning today's exact wording.
 *
 * Deliberately NOT banned: the words "window", "average", and "aggregate" on their own. The honest
 * copy has to be able to DENY a window ("never an average over a window"), and a denial contains
 * the noun it denies. What is banned is naming a concrete multi-day span or asserting a habit.
 */
describe('@j0nathan-ll0yd/copy llm claim honesty', () => {
  /** Named multi-day spans. The health export carries one dated value per metric. */
  const WINDOW_CLAIM_PATTERNS: {name: string; re: RegExp}[] = [
    {name: 'N-day span', re: /\b(?:\d+|one|two|three|four|five|six|seven|fourteen|thirty)[- ]days?\b/i},
    {name: 'weekly', re: /\bweekly\b/i},
    {name: 'per week', re: /\bper week\b/i},
    {name: 'multi-day', re: /\bmulti-day\b/i}
  ]

  /** Habitual qualifiers. One export cannot establish what is usual. */
  const HABITUAL_CLAIM_PATTERNS: {name: string; re: RegExp}[] = [
    {name: 'typical', re: /\btypical(?:ly)?\b/i},
    {name: 'usually', re: /\busually\b/i},
    {name: 'habitual', re: /\bhabitual(?:ly)?\b/i},
    {name: 'on most days', re: /\bon most days\b/i}
  ]

  interface Leaf {
    path: string
    values: string[]
  }

  function leafValues(value: unknown): string[] {
    if (typeof value === 'string') {
      return [value]
    }
    if (Array.isArray(value)) {
      return value.filter((v): v is string => typeof v === 'string')
    }
    if (value && typeof value === 'object') {
      return Object.values(value).filter((v): v is string => typeof v === 'string')
    }
    return []
  }

  function collectLeaves(node: unknown, path: string, out: Leaf[]): void {
    if (node && typeof node === 'object' && !Array.isArray(node) && 'value' in node && '_meta' in node) {
      out.push({path, values: leafValues((node as {value: unknown}).value)})
      return
    }
    if (node && typeof node === 'object' && !Array.isArray(node)) {
      for (const [key, value] of Object.entries(node)) {
        collectLeaves(value, path ? `${path}.${key}` : key, out)
      }
    }
  }

  const leaves: Leaf[] = []
  collectLeaves(JSON.parse(readFileSync(join(PKG, 'src', 'llm.en-US.json'), 'utf-8')), '', leaves)

  /** Every `path [pattern] → offending substring` across the namespace, so one run names them all. */
  function offenders(patterns: {name: string; re: RegExp}[]): string[] {
    const found: string[] = []
    for (const leaf of leaves) {
      for (const value of leaf.values) {
        for (const {name, re} of patterns) {
          const match = re.exec(value)
          if (match) {
            found.push(`${leaf.path} [${name}]: ${JSON.stringify(match[0])}`)
          }
        }
      }
    }
    return found.sort()
  }

  it('the namespace is non-empty, so a silent collection failure cannot read as a pass', () => {
    expect(leaves.length).toBeGreaterThan(0)
  })

  it('no leaf claims a multi-day window', () => {
    expect(offenders(WINDOW_CLAIM_PATTERNS)).toEqual([])
  })

  it('no leaf claims a habit from a single export', () => {
    expect(offenders(HABITUAL_CLAIM_PATTERNS)).toEqual([])
  })
})
