import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {dirname, join, relative, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'
import {fixtures, rawFixtures} from '../src/index'
import {COVER_ORIGIN, COVER_SUFFIXES, coverAsin, COVERED_ASINS, coverExists} from '../src/cover-inventory'

// The SSR shell server-renders post-adapter covers straight into `<img src>` with
// no route interception in front of them, so a URL naming an object the books
// pipeline never produced is a guaranteed 403 on every page load (atlas 0086
// issue #2). This suite is the gate that keeps one from being reintroduced.

const COVER_FIELDS = ['mainImage', 'mainImageThumb', 'mainImageCard', 'mainImageAvif', 'mainImageThumbAvif', 'mainImageCardAvif'] as const

type CoverField = (typeof COVER_FIELDS)[number]

const allBooks = Object.entries(fixtures.books).flatMap(([variation, value]) => value.books.map((book, index) => ({variation, index, book})))

describe('post-adapter book covers only name objects that exist', () => {
  it('covers every post-adapter variation (guards against a vacuous suite)', () => {
    expect(Object.keys(fixtures.books).sort()).toEqual(['baseline', 'empty', 'full'])
    expect(allBooks.length).toBeGreaterThan(0)
  })

  it.each(COVER_FIELDS)('%s is null or names a COVERED_ASINS object', (field: CoverField) => {
    for (const {variation, index, book} of allBooks) {
      const url = book[field]
      const where = `books.${variation}[${index}] (${book.asin}) ${field}`
      if (url == null) {
        continue
      }
      expect(url.startsWith(COVER_ORIGIN), `${where} must be a first-party ${COVER_ORIGIN} URL, got ${url}`).toBe(true)
      expect(COVERED_ASINS, `${where}: ${url} has no backing object on the distribution`).toContain(coverAsin(url))
    }
  })

  it('a cover URL names the book that carries it', () => {
    for (const {variation, index, book} of allBooks) {
      for (const field of COVER_FIELDS) {
        const url = book[field]
        if (url == null) {
          continue
        }
        expect(coverAsin(url), `books.${variation}[${index}] ${field} points at another book's cover`).toBe(book.asin)
      }
    }
  })

  it('a book carries either all six cover derivatives or none', () => {
    for (const {variation, index, book} of allBooks) {
      const present = COVER_FIELDS.filter((f) => book[f] != null)
      expect([0, COVER_FIELDS.length], `books.${variation}[${index}] (${book.asin}) has a partial cover set: ${present.join(', ')}`).toContain(
        present.length
      )
    }
  })

  it('the four fixture-only ASINs from atlas 0086 issue #2 carry no cover at all', () => {
    const stripped = ['0132350882', '0135957052', '1449373321', '1732102201']
    for (const asin of stripped) {
      const entries = allBooks.filter((b) => b.book.asin === asin)
      expect(entries.length, `expected fixture entries for ${asin}`).toBeGreaterThan(0)
      for (const {variation, index, book} of entries) {
        for (const field of COVER_FIELDS) {
          expect(book[field], `books.${variation}[${index}] (${asin}) ${field} was re-added`).toBeNull()
        }
      }
    }
  })

  it('still ships at least one rendered cover, so the placeholder is not the only path', () => {
    const rendered = allBooks.filter(({book}) => book.mainImageCard !== null)
    expect(rendered.length, 'no post-adapter book renders a real cover — cover-render coverage was destroyed').toBeGreaterThan(0)
    for (const {book} of rendered) {
      expect(COVERED_ASINS).toContain(book.asin)
    }
  })
})

// The docs site renders the Swift bookshelf fixtures and maps each cover URL to its
// same-origin file in apps/docs/public/images/books (Bookshelf `localCovers`). A URL
// with no mirror file falls through to the distribution, and a key the distribution
// lacks answers 403 (COVER_KEYS). So a Swift fixture cover must name the book's own
// derivative for its field, exist in the docs mirror, and exist on the distribution.

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const SWIFT_SOURCES = join(REPO_ROOT, 'Sources')
const DOCS_MIRROR = join(REPO_ROOT, 'apps', 'docs', 'public', 'images', 'books')
const SWIFT_BOOKSHELF = /(^|\/)reading\/bookshelf[^/]*\.json$/

/** The derivative suffix each cover field names. */
const FIELD_SUFFIX: Record<CoverField, string> = {
  mainImage: '.webp',
  mainImageThumb: '-thumb.webp',
  mainImageCard: '-card.webp',
  mainImageAvif: '.avif',
  mainImageThumbAvif: '-thumb.avif',
  mainImageCardAvif: '-card.avif'
}

export interface SwiftBookshelfFile {
  file: string
  data: unknown
}

/**
 * A state-only envelope (`{"state": "suppressed"}`): the honest-state fixtures carry no
 * books, so they hold no cover to check.
 */
function isStateOnly(data: unknown): boolean {
  return data !== null && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).join() === 'state' &&
    typeof (data as {state: unknown}).state === 'string'
}

/** Every cover problem in the Swift bookshelf fixtures, one line each; empty when all hold. */
export function swiftCoverProblems(files: readonly SwiftBookshelfFile[], mirror: ReadonlySet<string>): string[] {
  const out: string[] = []
  for (const {file, data} of files) {
    const books = (data as {books?: {books?: unknown}} | null)?.books?.books
    if (!Array.isArray(books)) {
      if (!isStateOnly(data)) {
        out.push(`${file}: neither a books.books list nor a state-only envelope, so its covers cannot be checked`)
      }
      continue
    }
    books.forEach((entry: unknown, index) => {
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
        out.push(`${file} books[${index}]: not a book object`)
        return
      }
      const book = entry as Record<string, unknown>
      const asin = book.asin
      if ('coverUrl' in book) {
        out.push(`${file} books[${index}] (${String(asin)}) coverUrl: not a contract field; a cover goes in the mainImage* fields`)
      }
      for (const key of Object.keys(book).filter((k) => k.startsWith('mainImage'))) {
        const where = `${file} books[${index}] (${String(asin)}) ${key}`
        const url = book[key]
        if (url == null) {
          continue
        }
        if (!(key in FIELD_SUFFIX)) {
          out.push(`${where}: not a cover field`)
          continue
        }
        if (typeof url !== 'string' || !url.startsWith(COVER_ORIGIN)) {
          out.push(`${where}: ${String(url)} is not a ${COVER_ORIGIN} URL`)
          continue
        }
        if (coverAsin(url) !== asin) {
          out.push(`${where}: ${url} names another book's cover`)
          continue
        }
        const name = url.slice(COVER_ORIGIN.length)
        if (name !== `${asin}${FIELD_SUFFIX[key as CoverField]}`) {
          out.push(`${where}: ${url} is not the ${FIELD_SUFFIX[key as CoverField]} derivative`)
        }
        if (!mirror.has(name)) {
          out.push(`${where}: ${name} is not in apps/docs/public/images/books`)
        }
        if (!coverExists(url)) {
          out.push(`${where}: ${url} has no object on the distribution (COVER_KEYS)`)
        }
      }
    })
  }
  return out
}

function swiftBookshelfFiles(): SwiftBookshelfFile[] {
  return readdirSync(SWIFT_SOURCES, {recursive: true, encoding: 'utf-8'}).map((name) => name.split('\\').join('/')).filter((name) =>
    SWIFT_BOOKSHELF.test(name)
  ).sort().map((name) => {
    const path = join(SWIFT_SOURCES, name)
    return {file: relative(REPO_ROOT, path), data: JSON.parse(readFileSync(path, 'utf-8'))}
  })
}

describe('Swift bookshelf fixture covers name mirrored objects that exist', () => {
  const files = swiftBookshelfFiles()
  const mirror = new Set(existsSync(DOCS_MIRROR) ? readdirSync(DOCS_MIRROR) : [])

  it('reads the fixtures, the mirror, and at least one cover (guards against a vacuous suite)', () => {
    expect(files.map((f) => f.file)).toContain('Sources/LifegamesWidgets/Resources/widgets/reading/bookshelf.json')
    expect(mirror.size, 'apps/docs/public/images/books holds covers').toBeGreaterThan(0)
    const covers = files.flatMap(({data}) => (data as {books?: {books?: Record<string, unknown>[]}}).books?.books ?? []).filter((b) =>
      b.mainImageCard != null
    )
    expect(covers.length, 'no Swift bookshelf fixture carries a cover').toBeGreaterThan(0)
  })

  it("every cover URL is the book's own derivative, in the docs mirror, and on the distribution", () => {
    expect(swiftCoverProblems(files, mirror)).toEqual([])
  })

  it('rejects coverUrl outright, null or not (known answer)', () => {
    const shelf = (fields: Record<string, unknown>) => [{file: 'f.json', data: {books: {books: [{asin: '0593128508', ...fields}]}}}]
    const message = 'f.json books[0] (0593128508) coverUrl: not a contract field; a cover goes in the mainImage* fields'
    expect(swiftCoverProblems(shelf({coverUrl: `${COVER_ORIGIN}0593128508-card.webp`}), new Set(['0593128508-card.webp']))).toEqual([message])
    expect(swiftCoverProblems(shelf({coverUrl: null}), new Set())).toEqual([message])
  })

  it('fails a fixture shape it cannot read, and passes a state-only envelope (known answer)', () => {
    const one = (data: unknown) => swiftCoverProblems([{file: 'f.json', data}], new Set())
    expect(one({state: 'suppressed'})).toEqual([])
    expect(one({books: {books: []}})).toEqual([])
    expect(one({books: []})).toEqual(['f.json: neither a books.books list nor a state-only envelope, so its covers cannot be checked'])
    expect(one({state: 'suppressed', books: {}})).toEqual(['f.json: neither a books.books list nor a state-only envelope, so its covers cannot be checked'])
    expect(one(null)).toEqual(['f.json: neither a books.books list nor a state-only envelope, so its covers cannot be checked'])
    expect(one({books: {books: ['0593128508']}})).toEqual(['f.json books[0]: not a book object'])
  })

  it('fails a cover with no mirror file and no object (known answer)', () => {
    const mirrorFixture = new Set(['0593128508-card.webp'])
    const book = (fields: Record<string, string>) => [{file: 'f.json', data: {books: {books: [{asin: '0593128508', ...fields}]}}}]
    expect(swiftCoverProblems(book({mainImageCard: `${COVER_ORIGIN}0593128508-card.webp`}), mirrorFixture)).toEqual([])
    expect(swiftCoverProblems(book({mainImageCardAvif: `${COVER_ORIGIN}0593128508-card.avif`}), mirrorFixture)).toEqual([
      `f.json books[0] (0593128508) mainImageCardAvif: 0593128508-card.avif is not in apps/docs/public/images/books`,
      `f.json books[0] (0593128508) mainImageCardAvif: ${COVER_ORIGIN}0593128508-card.avif has no object on the distribution (COVER_KEYS)`
    ])
    expect(swiftCoverProblems(book({mainImageCard: `${COVER_ORIGIN}0593128508-thumb.webp`}), new Set(['0593128508-thumb.webp']))).toEqual([
      `f.json books[0] (0593128508) mainImageCard: ${COVER_ORIGIN}0593128508-thumb.webp is not the -card.webp derivative`
    ])
    expect(swiftCoverProblems(book({mainImageCard: `${COVER_ORIGIN}1984820680-card.webp`}), mirrorFixture)).toEqual([
      `f.json books[0] (0593128508) mainImageCard: ${COVER_ORIGIN}1984820680-card.webp names another book's cover`
    ])
    expect(swiftCoverProblems(book({mainImageCard: 'https://m.media-amazon.com/images/P/0593128508.jpg'}), mirrorFixture)).toEqual([
      `f.json books[0] (0593128508) mainImageCard: https://m.media-amazon.com/images/P/0593128508.jpg is not a ${COVER_ORIGIN} URL`
    ])
  })
})

describe('coverExists', () => {
  it('follows COVER_KEYS key by key, so a partial ASIN serves only its listed keys', () => {
    expect(coverExists(`${COVER_ORIGIN}0593128508-card.webp`)).toBe(true)
    expect(coverExists(`${COVER_ORIGIN}0593128508-card.avif`)).toBe(false)
    expect(coverExists(`${COVER_ORIGIN}1984820680-card.avif`)).toBe(true)
    expect(coverExists(`${COVER_ORIGIN}1449373321-card.webp`)).toBe(false)
    expect(coverExists('https://m.media-amazon.com/images/P/0593128508.jpg')).toBe(false)
  })

  it('COVERED_ASINS holds exactly the ASINs that serve all six keys', () => {
    expect(COVERED_ASINS).toContain('1984820680')
    expect(COVERED_ASINS).not.toContain('0593128508')
  })
})

describe('raw book covers are visibly non-routable fixtures', () => {
  it('never encodes an example key on the public CloudFront distribution', () => {
    for (const [variation, fixture] of Object.entries(rawFixtures.books)) {
      for (const [index, book] of fixture.books.entries()) {
        for (const field of [...COVER_FIELDS, 'images'] as const) {
          const url = book[field]
          if (url == null) {
            continue
          }
          const where = `raw books.${variation}[${index}] (${book.asin}) ${field}`
          expect(new URL(url).hostname, where).toBe('fixtures.invalid')
          expect(url, where).not.toContain(COVER_ORIGIN)
        }
      }
    }
  })
})

describe('coverAsin', () => {
  it('reads the ASIN out of every derivative suffix', () => {
    for (const suffix of COVER_SUFFIXES) {
      expect(coverAsin(`${COVER_ORIGIN}0525573844${suffix}`)).toBe('0525573844')
    }
  })

  it('returns null for a foreign host, an unknown suffix, and a bare origin', () => {
    expect(coverAsin('https://m.media-amazon.com/images/P/0525573844.jpg')).toBeNull()
    expect(coverAsin(`${COVER_ORIGIN}0525573844-extra.png`)).toBeNull()
    expect(coverAsin(COVER_ORIGIN)).toBeNull()
  })

  it('does not accept an ASIN that merely contains a covered one', () => {
    expect(coverAsin(`${COVER_ORIGIN}0525573844X.webp`)).toBe('0525573844X')
    expect(COVERED_ASINS).not.toContain('0525573844X')
  })
})
