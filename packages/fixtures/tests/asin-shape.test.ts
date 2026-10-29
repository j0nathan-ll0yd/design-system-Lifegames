// ASIN shape gate.
//
// A real ASIN is exactly 10 characters: the only writer requires it
// (mantle-LifegamesPortal src/schemas/books.ts, `z.string().min(10).max(10)`), and the
// website's composed-page filter admits a Bookshelf link only for `[A-Z0-9]{10}`. A
// shorter fixture ASIN makes that filter refuse every fixture Bookshelf render.
//
// SHAPE: every fixture ASIN is one of
//   - ISBN-10 (print): 9 digits and a check digit (digit or X) that validates mod 11;
//   - Kindle: `B0` and 8 characters of [A-Z0-9].
// Within one book list, ASINs are distinct.
//
// CORPUS: every raw variation of every domain, every on-disk generated raw JSON, every
// post-adapter JSON, and every Sources/LifegamesWidgets/Resources/widgets/**/*.json
// fixture. Any string under a key named `asin` is checked, and so is every key of a
// `bookMeta` map (the web looks books up by `bookMeta[b.asin]`).
//
// BOOKMETA PAIRING: each `bookMeta` map's keys equal the ASINs of its sibling `books`
// list. An orphan key always fails; a book with no entry fails unless the root's
// tolerated list names it (see bookMetaProblems).
import {readdirSync, readFileSync, statSync} from 'node:fs'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'
import {rawFixtures} from '../src/raw'

const HERE = dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = resolve(HERE, '..')
const REPO_ROOT = resolve(PKG_ROOT, '..', '..')
const GENERATED_DIR = join(PKG_ROOT, 'src', 'generated')
const POST_ADAPTER_DIR = join(PKG_ROOT, 'src', 'post-adapter')
const WIDGET_FIXTURES_DIR = join(REPO_ROOT, 'Sources', 'LifegamesWidgets', 'Resources', 'widgets')

const ASIN_CHARSET = /^[A-Z0-9]{10}$/
const ISBN10 = /^\d{9}[\dX]$/
const KINDLE = /^B0[A-Z0-9]{8}$/
const ISBN10_MODULUS = 11
const ISBN10_CHECK_X = 10

interface Found {
  where: string
  asin: string
}

/** A `bookMeta` map and the ASINs of the sibling `books` list it describes. */
interface MetaPair {
  where: string
  keys: string[]
  asins: string[]
}

interface Collected {
  found: Found[]
  duplicates: string[]
  metas: MetaPair[]
}

export function isValidIsbn10(value: string): boolean {
  if (!ISBN10.test(value)) {
    return false
  }
  let sum = 0
  for (let i = 0; i < value.length; i++) {
    const digit = value[i] === 'X' ? ISBN10_CHECK_X : Number(value[i])
    sum += (value.length - i) * digit
  }
  return sum % ISBN10_MODULUS === 0
}

export function asinProblem(asin: string): string | null {
  if (!ASIN_CHARSET.test(asin)) {
    return 'is not 10 characters of [A-Z0-9]'
  }
  if (KINDLE.test(asin) || isValidIsbn10(asin)) {
    return null
  }
  return ISBN10.test(asin) ? 'is ISBN-10 shaped but its check digit is wrong' : 'is neither ISBN-10 nor B0 + 8 [A-Z0-9]'
}

function asinOf(item: unknown): string | undefined {
  const asin = item !== null && typeof item === 'object' ? (item as Record<string, unknown>).asin : undefined
  return typeof asin === 'string' ? asin : undefined
}

/**
 * Every `asin` string and every `bookMeta` key under `value`, the duplicates inside
 * each array of books, and each `bookMeta` map paired with its sibling `books` list.
 */
export function collectAsins(value: unknown, where: string, into: Collected = {found: [], duplicates: [], metas: []}): Collected {
  if (Array.isArray(value)) {
    const seen = new Set<string>()
    value.forEach((item, index) => {
      const asin = asinOf(item)
      if (asin !== undefined) {
        if (seen.has(asin)) {
          into.duplicates.push(`${where}[${index}] repeats ${asin}`)
        }
        seen.add(asin)
      }
      collectAsins(item, `${where}[${index}]`, into)
    })
  } else if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const meta = record.bookMeta
    if (meta !== null && typeof meta === 'object' && !Array.isArray(meta)) {
      const keys = Object.keys(meta)
      for (const key of keys) {
        into.found.push({where: `${where}.bookMeta key`, asin: key})
      }
      const books = Array.isArray(record.books) ? record.books : []
      into.metas.push({where, keys, asins: books.map(asinOf).filter((asin): asin is string => asin !== undefined)})
    }
    for (const [key, child] of Object.entries(record)) {
      if (key === 'asin' && typeof child === 'string') {
        into.found.push({where: `${where}.asin`, asin: child})
      } else if (key !== 'bookMeta') {
        collectAsins(child, `${where}.${key}`, into)
      }
    }
  }
  return into
}

/**
 * A `bookMeta` key with no book is always an error: nothing can look it up. A book
 * with no `bookMeta` entry is an error unless `toleratedMissing` names it as
 * `<where> <asin>`. The web reads `bookMeta[b.asin] || {}`, so a missing entry renders
 * without series or description, but a fixture that means "fully populated" must not
 * lose one silently. A tolerated entry that is no longer missing is also an error, so
 * the list cannot go stale.
 */
export function bookMetaProblems(metas: MetaPair[], toleratedMissing: ReadonlySet<string> = new Set()): string[] {
  const out: string[] = []
  const missing = new Set<string>()
  for (const {where, keys, asins} of metas) {
    for (const key of keys) {
      if (!asins.includes(key)) {
        out.push(`${where}.bookMeta key ${JSON.stringify(key)} names no book in ${where}.books`)
      }
    }
    for (const asin of asins) {
      if (!keys.includes(asin)) {
        missing.add(`${where} ${asin}`)
      }
    }
  }
  for (const id of missing) {
    if (!toleratedMissing.has(id)) {
      out.push(`${id} has no bookMeta entry`)
    }
  }
  for (const id of toleratedMissing) {
    if (!missing.has(id)) {
      out.push(`${id} is listed as tolerated-missing but has a bookMeta entry or no longer exists: remove it`)
    }
  }
  return out
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

function problems(result: Collected): string[] {
  const out = [...result.duplicates]
  for (const {where, asin} of result.found) {
    const problem = asinProblem(asin)
    if (problem) {
      out.push(`${where} ${JSON.stringify(asin)} ${problem}`)
    }
  }
  return out
}

const roots: Array<[string, () => Array<[string, unknown]>]> = [
  [
    'raw variations',
    () =>
      Object.entries(rawFixtures).flatMap(([domain, variations]) =>
        Object.entries(variations as Record<string, unknown>).map(([variation, value]) => [`raw ${domain}.${variation}`, value] as [string, unknown])
      )
  ],
  ...[GENERATED_DIR, POST_ADAPTER_DIR, WIDGET_FIXTURES_DIR].map((dir) =>
    [
      dir.slice(REPO_ROOT.length + 1),
      () => jsonFilesUnder(dir).map((path) => [path.slice(REPO_ROOT.length + 1), JSON.parse(readFileSync(path, 'utf-8'))] as [string, unknown])
    ] as [string, () => Array<[string, unknown]>]
  )
]

// Swift widget fixtures whose `books` list holds a book with no `bookMeta` entry. These
// predate the gate. Each id names one file and one ASIN; a new gap fails.
const WIDGET_TOLERATED_MISSING_META: ReadonlySet<string> = new Set([
  'Sources/LifegamesWidgets/Resources/widgets/reading/bookshelf.mixed.json.books B0FBRJY116',
  'Sources/LifegamesWidgets/Resources/widgets/reading/bookshelf.populated-max.json.books B07QVH2Q2K',
  'Sources/LifegamesWidgets/Resources/widgets/reading/bookshelf.populated-max.json.books B0FBRJY116'
])

const TOLERATED_MISSING_META: Record<string, ReadonlySet<string>> = {'Sources/LifegamesWidgets/Resources/widgets': WIDGET_TOLERATED_MISSING_META}

function collectRoot(load: () => Array<[string, unknown]>): Collected {
  const result: Collected = {found: [], duplicates: [], metas: []}
  for (const [label, value] of load()) {
    collectAsins(value, label, result)
  }
  return result
}

describe('fixture ASINs have the real shape', () => {
  it.each(roots)('%s: every ASIN and bookMeta key is ISBN-10 or B0 + 8, and none repeats in one list', (_root, load) => {
    const result = collectRoot(load)
    expect(result.found.length, 'the root holds ASINs (guards against a vacuous gate)').toBeGreaterThan(0)
    expect(problems(result)).toEqual([])
  })

  it.each(roots)('%s: every bookMeta key names a book, and every book has its bookMeta entry', (root, load) => {
    const result = collectRoot(load)
    expect(bookMetaProblems(result.metas, TOLERATED_MISSING_META[root])).toEqual([])
  })

  it('the bookMeta check reaches the post-adapter and widget fixtures (guards against a vacuous gate)', () => {
    for (const [root, load] of roots) {
      if (root === 'packages/fixtures/src/post-adapter' || root === 'Sources/LifegamesWidgets/Resources/widgets') {
        expect(collectRoot(load).metas.some((meta) => meta.keys.length > 0), root).toBe(true)
      }
    }
  })

  it('accepts the real shapes', () => {
    for (const asin of ['0123456789', '173210221X', '1600000010', 'B0KA7731P1', 'B07QVH2Q2K']) {
      expect(asinProblem(asin), asin).toBeNull()
    }
  })

  it('rejects a short, a long, a lower-case, a bad check digit and a non-B0 letter ASIN (can-fail proof)', () => {
    for (const asin of ['C001', 'KA0000001', '01234567890', 'b0ka7731p1', '0123456788', 'KA7731KAP1', 'KEYBOARD-1']) {
      expect(asinProblem(asin), asin).not.toBeNull()
    }
    const repeated = {books: [{asin: 'B0DSRD0001'}, {asin: 'B0DSRD0001'}, {asin: 'C001'}]}
    expect(problems(collectAsins(repeated, 'probe'))).toEqual([
      'probe.books[1] repeats B0DSRD0001',
      'probe.books[2].asin "C001" is not 10 characters of [A-Z0-9]'
    ])
  })

  it('rejects a short bookMeta key, an orphan key, a book with no entry and a stale tolerated id (can-fail proof)', () => {
    const probe = {books: [{asin: '1732102201'}, {asin: 'B0DSRD0001'}], bookMeta: {'1732': {}, B0DSRD0002: {}}}
    const result = collectAsins(probe, 'probe')
    expect(problems(result)).toEqual(['probe.bookMeta key "1732" is not 10 characters of [A-Z0-9]'])
    expect(bookMetaProblems(result.metas, new Set(['probe B0DSRD0001', 'probe 0123456789']))).toEqual([
      'probe.bookMeta key "1732" names no book in probe.books',
      'probe.bookMeta key "B0DSRD0002" names no book in probe.books',
      'probe 1732102201 has no bookMeta entry',
      'probe 0123456789 is listed as tolerated-missing but has a bookMeta entry or no longer exists: remove it'
    ])
  })
})
