import {describe, expect, it} from 'vitest'
import {fixtures} from '../src/index'
import {COVER_ORIGIN, COVER_SUFFIXES, coverAsin, COVERED_ASINS} from '../src/cover-inventory'

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
    const stripped = ['0132350882', '0135957052', '1449373321', '173210220X']
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
