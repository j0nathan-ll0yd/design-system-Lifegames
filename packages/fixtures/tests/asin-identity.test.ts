// ASIN identity gate.
//
// An ASIN names one book. Since DS #333 a Bookshelf tile is a real Amazon link, and a
// covered ASIN also names a real cover object (cover-inventory.ts), so a fixture that
// pairs an ASIN with another book shows one book's cover and link under another
// book's title. asin-shape.test.ts checks the SHAPE of each ASIN; this gate checks
// that the same ASIN means the same book in every fixture source.
//
// RULES, across every source below:
//   (a) one ASIN maps to one (title, author);
//   (b) one (title, author) maps to one ASIN;
//   (c) a covered ASIN's title and author equal its post-adapter entry
//       (src/post-adapter/books.ts is the source of truth for covered books);
//   (d) an ASIN's pages and year are the same everywhere they are stated, and for a
//       covered ASIN they equal the post-adapter entry.
// Strings compare exactly. Author is not normalized: every schema types it as one
// string, so a non-string author is itself a failure.
//
// SOURCES, discovered by glob so a new fixture is covered without an edit:
//   - every JSON under Sources/LifegamesWidgets/Resources/widgets/ (Swift catalog
//     fixtures; the docs site and the portfolio render these same files);
//   - every JSON under packages/fixtures/src/ (generated raw and post-adapter JSON);
//   - every TS module under packages/fixtures/src/ (factories, variations,
//     post-adapter), imported and walked through its exports;
//   - every TS module under packages/web/stories/, imported and walked the same way.
// A book is any object with a string `asin` and a string `title`. Its pages and year
// come from the sibling `bookMeta[asin]` entry when the object sits in a `books` list
// next to a `bookMeta` map, and otherwise from the object itself (`pages`/`pageCount`,
// `year`/`publishedYear`). A null or absent value states nothing.
//
// SWEEP: every tracked file that pairs `asin` with a 10-character literal must be a
// scanned source or appear in UNSCANNED with a reason, so no source is skipped silently.
/// <reference types="vite/client" />
import {execFileSync} from 'node:child_process'
import {readdirSync, readFileSync, statSync} from 'node:fs'
import {dirname, join, relative, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'
import {COVERED_ASINS} from '../src/cover-inventory'
import {booksPostAdapter} from '../src/post-adapter/books'

const HERE = dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = resolve(HERE, '..')
const REPO_ROOT = resolve(PKG_ROOT, '..', '..')
const JSON_ROOTS = [join(REPO_ROOT, 'Sources', 'LifegamesWidgets', 'Resources', 'widgets'), join(PKG_ROOT, 'src')]
const POST_ADAPTER_SOURCE = 'packages/fixtures/src/post-adapter/books.ts'

// Eager globs: Vite resolves these at transform time, so a new module is imported
// (and walked) with no edit here. A module that fails to import fails the file.
const FIXTURE_MODULES = import.meta.glob('../src/**/*.ts', {eager: true})
const STORY_MODULES = import.meta.glob('../../web/stories/**/*.ts', {eager: true})

/**
 * Tracked files that pair `asin` with a 10-character literal but that this gate does
 * not read, each with the reason. A listed file that no longer matches fails, so the
 * list cannot go stale.
 */
const UNSCANNED: Record<string, string> = {
  'Sources/LifegamesWidgets/Reading/BookshelfView.swift': 'Swift #Preview literals; no Swift parser here',
  'Sources/LifegamesWidgets/Reading/BookModalView.swift': 'Swift #Preview literals; no Swift parser here',
  'Tests/LifegamesSchemasTests/WidgetModelsDecodeTests.swift': 'Swift decode-test literal; no Swift parser here',
  'packages/web/tests/runtime/adapters.test.ts': 'test-local adapter inputs, not a fixture',
  'packages/web/tests/server-render/bookshelf-links.test.ts': 'test-local known-answer inputs, not a fixture',
  'packages/fixtures/tests/asin-shape.test.ts': 'can-fail probes of the shape gate',
  'packages/fixtures/tests/asin-identity.test.ts': 'can-fail probes of this gate'
}

export interface BookRecord {
  file: string
  where: string
  asin: string
  title: string
  author: unknown
  pages: number | null
  year: number | null
}

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const numberOrNull = (...values: unknown[]): number | null => {
  for (const value of values) {
    if (typeof value === 'number') {
      return value
    }
  }
  return null
}

/** Every book under `value`. `seen` stops a walk through shared or cyclic objects. */
export function collectBooks(value: unknown, file: string, where: string, into: BookRecord[] = [], seen = new WeakSet<object>()): BookRecord[] {
  if (value === null || typeof value !== 'object') {
    return into
  }
  if (seen.has(value)) {
    return into
  }
  seen.add(value)
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectBooks(item, file, `${where}[${index}]`, into, seen))
    return into
  }
  return collectFromRecord(value as Record<string, unknown>, file, where, into, seen)
}

function collectFromRecord(value: Record<string, unknown>, file: string, where: string, into: BookRecord[], seen: WeakSet<object>): BookRecord[] {
  const meta = isRecord(value.bookMeta) ? value.bookMeta : null
  const books = Array.isArray(value.books) ? value.books : []
  books.forEach((book, index) => {
    if (isRecord(book) && typeof book.asin === 'string' && typeof book.title === 'string') {
      const own = meta && isRecord(meta[book.asin]) ? (meta[book.asin] as Record<string, unknown>) : book
      into.push({
        file,
        where: `${where}.books[${index}]`,
        asin: book.asin,
        title: book.title,
        author: book.author,
        pages: numberOrNull(own.pages, own.pageCount),
        year: numberOrNull(own.year, own.publishedYear)
      })
      seen.add(book)
    }
  })
  if (typeof value.asin === 'string' && typeof value.title === 'string') {
    into.push({
      file,
      where,
      asin: value.asin,
      title: value.title,
      author: value.author,
      pages: numberOrNull(value.pages, value.pageCount),
      year: numberOrNull(value.year, value.publishedYear)
    })
  }
  for (const [key, child] of Object.entries(value)) {
    if (key !== 'bookMeta') {
      collectBooks(child, file, `${where}.${key}`, into, seen)
    }
  }
  return into
}

const book = (r: BookRecord): string => `${JSON.stringify(r.title)} by ${JSON.stringify(r.author)} (${r.file} ${r.where})`
const facts = (r: {pages: number | null; year: number | null}): string => `pages ${r.pages ?? '-'}, year ${r.year ?? '-'}`

/**
 * One side of a conflict: the book and its first location in each file. One object
 * reached through several modules yields one record per module, so every file shows.
 */
function side(records: BookRecord[]): string {
  const first = records[0]!
  const places = new Map<string, string>()
  for (const r of records) {
    if (!places.has(r.file)) {
      places.set(r.file, `${r.file} ${r.where}`)
    }
  }
  return `${JSON.stringify(first.title)} by ${JSON.stringify(first.author)} (${[...places.values()].join('; ')})`
}

function groupBy(records: BookRecord[], key: (r: BookRecord) => string): Map<string, BookRecord[]> {
  const out = new Map<string, BookRecord[]>()
  for (const r of records) {
    out.set(key(r), [...(out.get(key(r)) ?? []), r])
  }
  return out
}

const identity = (r: BookRecord): string => JSON.stringify([r.title, r.author])

export function authorProblems(records: BookRecord[]): string[] {
  return records.filter((r) => typeof r.author !== 'string').map((r) => `ASIN ${r.asin}: author is not a string: ${book(r)}`)
}

/** (a) One ASIN maps to one (title, author). */
export function asinToBookProblems(records: BookRecord[]): string[] {
  const out: string[] = []
  for (const [asin, group] of groupBy(records, (r) => r.asin)) {
    const [first, ...others] = groupBy(group, identity).values()
    for (const other of others) {
      out.push(`(a) ASIN ${asin} names two books: ${side(first!)} and ${side(other)}`)
    }
  }
  return out
}

/** (b) One (title, author) maps to one ASIN. */
export function bookToAsinProblems(records: BookRecord[]): string[] {
  const out: string[] = []
  for (const group of groupBy(records, identity).values()) {
    const [first, ...others] = groupBy(group, (r) => r.asin).values()
    for (const other of others) {
      out.push(`(b) one book carries two ASINs: ASIN ${first![0]!.asin} ${side(first!)} and ASIN ${other[0]!.asin} ${side(other)}`)
    }
  }
  return out
}

/** (c) A covered ASIN's title and author equal its post-adapter entry. */
export function coveredTitleProblems(records: BookRecord[], truth: Map<string, BookRecord>): string[] {
  const out: string[] = []
  for (const r of records) {
    const expected = truth.get(r.asin)
    if (expected && identity(r) !== identity(expected)) {
      out.push(`(c) covered ASIN ${r.asin} must be ${book(expected)}, found ${book(r)}`)
    }
  }
  return out
}

/** (d) Pages and year agree for one ASIN everywhere, and equal post-adapter for a covered ASIN. */
export function metaProblems(records: BookRecord[], truth: Map<string, BookRecord>): string[] {
  const out: string[] = []
  for (const [asin, group] of groupBy(records, (r) => r.asin)) {
    const expected = truth.get(asin)
    for (const field of ['pages', 'year'] as const) {
      const stated = group.filter((r) => r[field] !== null)
      const reference = expected && expected[field] !== null ? expected : stated[0]
      for (const r of stated) {
        if (reference && r[field] !== reference[field]) {
          out.push(`(d) ASIN ${asin} ${field} disagree: ${book(reference)} has ${facts(reference)}; ${book(r)} has ${facts(r)}`)
        }
      }
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

const fromRepo = (path: string): string => relative(REPO_ROOT, path)
const moduleFile = (key: string): string => fromRepo(resolve(HERE, key))

function scannedFiles(): string[] {
  return [
    ...JSON_ROOTS.flatMap(jsonFilesUnder).map(fromRepo),
    ...Object.keys(FIXTURE_MODULES).map(moduleFile),
    ...Object.keys(STORY_MODULES).map(moduleFile)
  ]
}

function loadRecords(): BookRecord[] {
  const records: BookRecord[] = []
  for (const path of JSON_ROOTS.flatMap(jsonFilesUnder)) {
    collectBooks(JSON.parse(readFileSync(path, 'utf-8')), fromRepo(path), '$', records)
  }
  for (const [key, mod] of Object.entries({...FIXTURE_MODULES, ...STORY_MODULES})) {
    collectBooks(mod, moduleFile(key), 'exports', records)
  }
  return records
}

function postAdapterTruth(): Map<string, BookRecord> {
  const truth = new Map<string, BookRecord>()
  for (const r of collectBooks(booksPostAdapter, POST_ADAPTER_SOURCE, 'booksPostAdapter')) {
    if (COVERED_ASINS.includes(r.asin) && !truth.has(r.asin)) {
      truth.set(r.asin, r)
    }
  }
  return truth
}

/** Tracked files that pair `asin` with a 10-character literal. */
function trackedAsinFiles(): string[] {
  const env = {...process.env}
  delete env.GIT_DIR
  delete env.GIT_WORK_TREE
  delete env.GIT_INDEX_FILE
  const files = execFileSync('git', ['ls-files', '-z'], {cwd: REPO_ROOT, env, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024}).split('\0').filter((file) =>
    /\.(json|ts|mts|js|mjs|astro|mdx|swift)$/.test(file)
  )
  const pairing = /\basin["']?\s*:\s*["'][A-Z0-9]{10}["']/
  return files.filter((file) => {
    try {
      return pairing.test(readFileSync(join(REPO_ROOT, file), 'utf-8'))
    } catch {
      return false
    }
  })
}

describe('fixture ASINs name one book everywhere', () => {
  const records = loadRecords()
  const truth = postAdapterTruth()

  it('reads every source class and every covered ASIN (guards against a vacuous gate)', () => {
    const files = new Set(records.map((r) => r.file))
    expect([...files].some((f) => f.startsWith('Sources/LifegamesWidgets/Resources/widgets/') && f.endsWith('.json')), 'Swift JSON').toBe(true)
    expect([...files].some((f) => f.startsWith('packages/fixtures/src/') && f.endsWith('.ts')), 'fixtures TS').toBe(true)
    expect([...files].some((f) => f.startsWith('packages/web/stories/') && f.endsWith('.ts')), 'story TS').toBe(true)
    expect([...truth.keys()].sort()).toEqual([...COVERED_ASINS].sort())
  })

  it('every author is a string', () => {
    expect(authorProblems(records)).toEqual([])
  })

  it('(a) one ASIN maps to one (title, author)', () => {
    expect(asinToBookProblems(records)).toEqual([])
  })

  it('(b) one (title, author) maps to one ASIN', () => {
    expect(bookToAsinProblems(records)).toEqual([])
  })

  it('(c) a covered ASIN names its post-adapter book', () => {
    expect(coveredTitleProblems(records, truth)).toEqual([])
  })

  it('(d) an ASIN states one pages and year, and a covered ASIN states the post-adapter ones', () => {
    expect(metaProblems(records, truth)).toEqual([])
  })

  it('every tracked file that pairs an ASIN with a book is scanned or listed in UNSCANNED', () => {
    const scanned = new Set(scannedFiles())
    const tracked = trackedAsinFiles()
    expect(tracked.filter((file) => !scanned.has(file) && !(file in UNSCANNED))).toEqual([])
    expect(Object.keys(UNSCANNED).filter((file) => !tracked.includes(file)), 'stale UNSCANNED entries').toEqual([])
  })

  it('each rule fails on a mismatch and names the file, the ASIN and both books (can-fail proof)', () => {
    const probe = (file: string, asin: string, title: string, author: unknown, pages: number | null = null, year: number | null = null): BookRecord => ({
      file,
      where: '$',
      asin,
      title,
      author,
      pages,
      year
    })
    const covered = new Map([['0525573844', probe('truth.ts', '0525573844', 'Foundryside', 'Robert Jackson Bennett', 512, 2018)]])
    expect(asinToBookProblems([probe('x.json', '1600000010', 'One', 'A'), probe('y.ts', '1600000010', 'Two', 'B')])).toEqual([
      '(a) ASIN 1600000010 names two books: "One" by "A" (x.json $) and "Two" by "B" (y.ts $)'
    ])
    expect(bookToAsinProblems([probe('x.json', '1600000010', 'One', 'A'), probe('y.ts', '1600000029', 'One', 'A')])).toEqual([
      '(b) one book carries two ASINs: ASIN 1600000010 "One" by "A" (x.json $) and ASIN 1600000029 "One" by "A" (y.ts $)'
    ])
    expect(coveredTitleProblems([probe('x.json', '0525573844', 'Range', 'David Epstein')], covered)).toEqual([
      '(c) covered ASIN 0525573844 must be "Foundryside" by "Robert Jackson Bennett" (truth.ts $), found "Range" by "David Epstein" (x.json $)'
    ])
    expect(metaProblems([probe('x.json', '0525573844', 'Foundryside', 'Robert Jackson Bennett', 352, 2018)], covered)).toEqual([
      '(d) ASIN 0525573844 pages disagree: "Foundryside" by "Robert Jackson Bennett" (truth.ts $) has pages 512, year 2018; "Foundryside" by "Robert Jackson Bennett" (x.json $) has pages 352, year 2018'
    ])
    expect(metaProblems([probe('x.json', '1600000010', 'One', 'A', 100, 2001), probe('y.ts', '1600000010', 'One', 'A', null, 2002)], new Map())).toEqual([
      '(d) ASIN 1600000010 year disagree: "One" by "A" (x.json $) has pages 100, year 2001; "One" by "A" (y.ts $) has pages -, year 2002'
    ])
    expect(authorProblems([probe('x.json', '1600000010', 'One', ['A', 'B'])])).toEqual([
      'ASIN 1600000010: author is not a string: "One" by ["A","B"] (x.json $)'
    ])
  })

  it('reads pages and year from the sibling bookMeta entry, else from the book itself', () => {
    const shelf = {books: [{asin: '1600000010', title: 'One', author: 'A', pageCount: 1}], bookMeta: {'1600000010': {pages: 300, year: 2020}}}
    const modal = {asin: '1600000029', title: 'Two', author: 'B', pageCount: 120, publishedYear: 1999}
    expect(collectBooks([shelf, modal], 'probe', '$').map((r) => [r.asin, r.pages, r.year])).toEqual([
      ['1600000010', 300, 2020],
      ['1600000029', 120, 1999]
    ])
  })
})
