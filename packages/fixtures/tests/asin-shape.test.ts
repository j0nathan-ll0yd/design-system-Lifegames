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
// fixture. Any string under a key named `asin` is checked.
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

/** Every `asin` string under `value`, plus the duplicates inside each array of books. */
export function collectAsins(value: unknown, where: string, found: Found[] = [], duplicates: string[] = []): {found: Found[]; duplicates: string[]} {
  if (Array.isArray(value)) {
    const seen = new Set<string>()
    value.forEach((item, index) => {
      const asin = item !== null && typeof item === 'object' ? (item as Record<string, unknown>).asin : undefined
      if (typeof asin === 'string') {
        if (seen.has(asin)) {
          duplicates.push(`${where}[${index}] repeats ${asin}`)
        }
        seen.add(asin)
      }
      collectAsins(item, `${where}[${index}]`, found, duplicates)
    })
  } else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (key === 'asin' && typeof child === 'string') {
        found.push({where: `${where}.asin`, asin: child})
      } else {
        collectAsins(child, `${where}.${key}`, found, duplicates)
      }
    }
  }
  return {found, duplicates}
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

function problems(result: {found: Found[]; duplicates: string[]}): string[] {
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

describe('fixture ASINs have the real shape', () => {
  it.each(roots)('%s: every ASIN is ISBN-10 or B0 + 8, and none repeats in one list', (_root, load) => {
    const result = {found: [] as Found[], duplicates: [] as string[]}
    for (const [label, value] of load()) {
      collectAsins(value, label, result.found, result.duplicates)
    }
    expect(result.found.length, 'the root holds ASINs (guards against a vacuous gate)').toBeGreaterThan(0)
    expect(problems(result)).toEqual([])
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
})
