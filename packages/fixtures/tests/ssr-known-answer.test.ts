// Disjointness gate for the `ssrKnownAnswer` raw variations (atlas decision 0160).
//
// An SSR known-answer render proves the server read THIS payload only if its values
// appear in no other fixture. If another fixture shares a value, a stale or wrong
// payload could produce the same rendered text and the proof is void.
//
// TOKEN EXTRACTION (applied to every domain's `ssrKnownAnswer`, walking all leaves):
//   String leaf  -> a token unless ANY of these hold:
//     - its key is in SHARED_VOCABULARY_KEYS (closed-set labels shared by design:
//       event type, unit, status, source, grade, licence, language);
//     - it is an ISO date or ISO timestamp (the fixed clock makes these shared);
//     - it has 3 or fewer characters.
//     Array elements inherit the key of their parent property (`topics` -> each topic).
//   Number leaf  -> a token unless it is an integer with absolute value below 10
//     (counts, enum-like indexes, 0/1 flags). Non-integers are always tokens.
//
// COLLISION RULE against every other fixture:
//   String token -> collides if it is a SUBSTRING of the serialized JSON text of any
//     other fixture (so a title embedded in a longer string or URL still collides).
//   Number token -> collides if it EQUALS any numeric leaf of any other fixture.
//
// CORPUS ("other fixtures"): every raw variation of every domain except the one under
// test (this includes the other domains' `ssrKnownAnswer`), every on-disk generated raw
// JSON except `ssrKnownAnswer.json`, every post-adapter JSON, and every
// Sources/LifegamesWidgets/Resources/widgets/**/*.json fixture.
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'
import {DEFAULT_QUANTITIES} from '../src/factories/health'
import {rawFixtures, ssrKnownAnswerFixtures} from '../src/raw'

const HERE = dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = resolve(HERE, '..')
const REPO_ROOT = resolve(PKG_ROOT, '..', '..')
const GENERATED_DIR = join(PKG_ROOT, 'src', 'generated')
const POST_ADAPTER_DIR = join(PKG_ROOT, 'src', 'post-adapter')
const WIDGET_FIXTURES_DIR = join(REPO_ROOT, 'Sources', 'LifegamesWidgets', 'Resources', 'widgets')

const SHARED_VOCABULARY_KEYS = new Set(['type', 'unit', 'status', 'source', 'rating', 'licenseKey', 'licenseName', 'licenseSpdxId', 'language'])
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/
const MIN_STRING_LENGTH = 4
const SMALL_INTEGER_LIMIT = 10
const SSR_KNOWN_ANSWER = 'ssrKnownAnswer'

/** Retired domain (decision 0012): has no known-answer variation. */
const NO_KNOWN_ANSWER_DOMAINS = ['location']

const SPARSE_OMITTED_QUANTITIES = ['dietaryWater', 'dietaryCaffeine', 'exerciseTime', 'activeEnergyBurned', 'basalEnergyBurned', 'sleepScore']

interface Tokens {
  strings: string[]
  numbers: number[]
}

export function extractTokens(value: unknown, key = '', tokens: Tokens = {strings: [], numbers: []}): Tokens {
  if (typeof value === 'string') {
    if (!SHARED_VOCABULARY_KEYS.has(key) && !ISO_DATE.test(value) && value.length >= MIN_STRING_LENGTH) {
      tokens.strings.push(value)
    }
  } else if (typeof value === 'number') {
    if (Number.isFinite(value) && !(Number.isInteger(value) && Math.abs(value) < SMALL_INTEGER_LIMIT)) {
      tokens.numbers.push(value)
    }
  } else if (Array.isArray(value)) {
    for (const item of value) {
      extractTokens(item, key, tokens)
    }
  } else if (value !== null && typeof value === 'object') {
    for (const [childKey, child] of Object.entries(value)) {
      extractTokens(child, childKey, tokens)
    }
  }
  return tokens
}

function numericLeaves(value: unknown, into: Set<number>): void {
  if (typeof value === 'number') {
    into.add(value)
  } else if (Array.isArray(value)) {
    for (const item of value) {
      numericLeaves(item, into)
    }
  } else if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) {
      numericLeaves(child, into)
    }
  }
}

function jsonFilesUnder(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      out.push(...jsonFilesUnder(path))
    } else if (name.endsWith('.json')) {
      out.push(path)
    }
  }
  return out
}

interface CorpusEntry {
  label: string
  text: string
  numbers: Set<number>
}

function entry(label: string, value: unknown): CorpusEntry {
  const numbers = new Set<number>()
  numericLeaves(value, numbers)
  return {label, text: JSON.stringify(value), numbers}
}

function entryFromFile(path: string): CorpusEntry {
  return entry(path.slice(REPO_ROOT.length + 1), JSON.parse(readFileSync(path, 'utf-8')))
}

function buildCorpus(excludeDomain: string): CorpusEntry[] {
  const corpus: CorpusEntry[] = []
  for (const [domain, variations] of Object.entries(rawFixtures)) {
    for (const [variation, value] of Object.entries(variations as Record<string, unknown>)) {
      if (domain === excludeDomain && variation === SSR_KNOWN_ANSWER) {
        continue
      }
      corpus.push(entry(`raw ${domain}.${variation}`, value))
    }
  }
  const generated = jsonFilesUnder(GENERATED_DIR).filter((path) => !path.endsWith(`${SSR_KNOWN_ANSWER}.json`))
  const postAdapter = jsonFilesUnder(POST_ADAPTER_DIR)
  const widgets = jsonFilesUnder(WIDGET_FIXTURES_DIR)
  for (const path of [...generated, ...postAdapter, ...widgets]) {
    corpus.push(entryFromFile(path))
  }
  return corpus
}

function collisions(domain: string, fixture: unknown): string[] {
  const tokens = extractTokens(fixture)
  const corpus = buildCorpus(domain)
  const found: string[] = []
  for (const token of tokens.strings) {
    for (const other of corpus) {
      if (other.text.includes(token)) {
        found.push(`string ${JSON.stringify(token)} also in ${other.label}`)
      }
    }
  }
  for (const token of tokens.numbers) {
    for (const other of corpus) {
      if (other.numbers.has(token)) {
        found.push(`number ${token} also in ${other.label}`)
      }
    }
  }
  return found
}

describe('ssrKnownAnswer: coverage', () => {
  it('every raw domain except location has an ssrKnownAnswer, reachable via rawFixtures and the typed accessor', () => {
    for (const [domain, variations] of Object.entries(rawFixtures)) {
      if (NO_KNOWN_ANSWER_DOMAINS.includes(domain)) {
        expect(variations, `${domain} is retired and must not carry a known answer`).not.toHaveProperty(SSR_KNOWN_ANSWER)
        continue
      }
      expect(variations, `${domain} needs ${SSR_KNOWN_ANSWER}`).toHaveProperty(SSR_KNOWN_ANSWER)
      expect(ssrKnownAnswerFixtures[domain as keyof typeof ssrKnownAnswerFixtures], `${domain} accessor`).toBe(
        (variations as Record<string, unknown>)[SSR_KNOWN_ANSWER]
      )
    }
  })

  it('the corpus roots exist and are non-empty (a missing directory would make the gate vacuous)', () => {
    for (const dir of [GENERATED_DIR, POST_ADAPTER_DIR, WIDGET_FIXTURES_DIR]) {
      expect(existsSync(dir), dir).toBe(true)
      expect(jsonFilesUnder(dir).length, dir).toBeGreaterThan(0)
    }
  })
})

describe('ssrKnownAnswer: values are disjoint from every other fixture', () => {
  for (const [domain, fixture] of Object.entries(ssrKnownAnswerFixtures)) {
    it(`${domain}: extracts tokens and none collides`, () => {
      const tokens = extractTokens(fixture)
      expect(tokens.strings.length + tokens.numbers.length, `${domain} must yield distinctive tokens`).toBeGreaterThan(0)
      expect(collisions(domain, fixture)).toEqual([])
    })
  }

  it('detects a collision (can-fail proof on in-memory data)', () => {
    const colliding = {title: 'Foundryside', count: rawFixtures.health.full.quantities.stepCount?.value}
    const found = collisions('books', colliding)
    expect(found.some((line) => line.includes('Foundryside'))).toBe(true)
    expect(found.some((line) => line.startsWith('number 24500'))).toBe(true)
  })
})

describe('health sparse', () => {
  it('omits exactly dietaryWater, dietaryCaffeine, exerciseTime, activeEnergyBurned, basalEnergyBurned and sleepScore', () => {
    const keys = Object.keys(rawFixtures.health.sparse.quantities)
    for (const omitted of SPARSE_OMITTED_QUANTITIES) {
      expect(keys).not.toContain(omitted)
    }
    const expected = Object.keys(DEFAULT_QUANTITIES).filter((key) => !SPARSE_OMITTED_QUANTITIES.includes(key))
    expect(keys.sort()).toEqual(expected.sort())
    expect(keys).toContain('heartRate')
    expect(keys).toContain('heartRateVariabilitySDNN')
  })
})
