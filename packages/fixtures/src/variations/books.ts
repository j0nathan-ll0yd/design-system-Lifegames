import type {BooksExport} from '@j0nathan-ll0yd/portal-contract/schemas'
import {createBook, createBooksFixture} from '../factories/books'
import {placeholderText} from '../factories/helpers'

/** Baseline: default 5-book fixture */
export const baseline: BooksExport = createBooksFixture()

/** Empty: no books */
export const empty: BooksExport = createBooksFixture({books: []})

/** allReading: 3 books all in reading status */
export const allReading: BooksExport = createBooksFixture({
  books: [
    createBook({asin: 'B001', title: 'Reading Book One', status: 'reading', currentPage: 50, totalPages: 300, rating: null}),
    createBook({asin: 'B002', title: 'Reading Book Two', status: 'reading', currentPage: 120, totalPages: 400, rating: null}),
    createBook({asin: 'B003', title: 'Reading Book Three', status: 'reading', currentPage: 200, totalPages: 500, rating: null})
  ]
})

/** allCompleted: 5 books all completed with ratings 1–5 */
export const allCompleted: BooksExport = createBooksFixture({
  books: [
    createBook({asin: 'C001', title: 'Completed Book One', status: 'finished', rating: 1, currentPage: null}),
    createBook({asin: 'C002', title: 'Completed Book Two', status: 'finished', rating: 2, currentPage: null}),
    createBook({asin: 'C003', title: 'Completed Book Three', status: 'finished', rating: 3, currentPage: null}),
    createBook({asin: 'C004', title: 'Completed Book Four', status: 'finished', rating: 4, currentPage: null}),
    createBook({asin: 'C005', title: 'Completed Book Five', status: 'finished', rating: 5, currentPage: null})
  ]
})

/** mixedStatus: completed, reading, upNext, and null status */
export const mixedStatus: BooksExport = createBooksFixture({
  books: [
    createBook({asin: 'M001', title: 'Mixed Completed', status: 'finished', rating: 4, currentPage: null}),
    createBook({asin: 'M002', title: 'Mixed Reading', status: 'reading', currentPage: 80, totalPages: 320, rating: null}),
    createBook({asin: 'M003', title: 'Mixed Up Next', status: 'upNext', currentPage: null, rating: null}),
    createBook({asin: 'M004', title: 'Mixed No Status', status: null, currentPage: null, rating: null})
  ]
})

/** withProgress: books at various reading progress percentages */
export const withProgress: BooksExport = createBooksFixture({
  books: [
    createBook({asin: 'P001', title: 'Just Started', status: 'reading', currentPage: 10, totalPages: 400, rating: null}),
    createBook({asin: 'P002', title: 'Quarter Done', status: 'reading', currentPage: 100, totalPages: 400, rating: null}),
    createBook({asin: 'P003', title: 'Halfway', status: 'reading', currentPage: 200, totalPages: 400, rating: null}),
    createBook({asin: 'P004', title: 'Three Quarters', status: 'reading', currentPage: 300, totalPages: 400, rating: null}),
    createBook({asin: 'P005', title: 'Almost Done', status: 'reading', currentPage: 390, totalPages: 400, rating: null})
  ]
})

/** noCovers: all books with null image fields */
export const noCovers: BooksExport = createBooksFixture({
  books: createBooksFixture().books.map((b) => ({...b, mainImage: null, mainImageThumb: null, images: null}))
})

/** seriesBooks: all books with series info populated */
export const seriesBooks: BooksExport = createBooksFixture({
  books: [
    createBook({asin: 'S001', title: 'Series Alpha 1', series: 'Alpha Chronicles', seriesNumber: 1, seriesTotal: 4, status: 'finished', rating: 5}),
    createBook({asin: 'S002', title: 'Series Alpha 2', series: 'Alpha Chronicles', seriesNumber: 2, seriesTotal: 4, status: 'finished', rating: 4}),
    createBook({
      asin: 'S003',
      title: 'Series Alpha 3',
      series: 'Alpha Chronicles',
      seriesNumber: 3,
      seriesTotal: 4,
      status: 'reading',
      currentPage: 100,
      totalPages: 350,
      rating: null
    }),
    createBook({asin: 'S004', title: 'Series Alpha 4', series: 'Alpha Chronicles', seriesNumber: 4, seriesTotal: 4, status: 'upNext', rating: null}),
    createBook({asin: 'S005', title: 'Series Beta 1', series: 'Beta Saga', seriesNumber: 1, seriesTotal: 2, status: 'finished', rating: 3})
  ]
})

/** sixBooks: 6 books — tests the 5-book display cap */
export const sixBooks: BooksExport = createBooksFixture({
  books: [
    ...createBooksFixture().books,
    createBook({
      asin: 'X006',
      title: 'Sixth Book',
      author: 'Extra Author',
      series: null,
      seriesNumber: null,
      seriesTotal: null,
      status: 'finished',
      rating: 3,
      currentPage: null
    })
  ]
})

/** allFields: single book with every optional field populated */
export const allFields: BooksExport = createBooksFixture({
  books: [
    createBook({
      asin: 'F001',
      title: 'All Fields Book',
      author: 'Full Author',
      series: 'Complete Series',
      seriesNumber: 1,
      seriesTotal: 5,
      description: placeholderText(200),
      publicationDate: '2023-06-15',
      publishedYear: 2023,
      isbn10: '0123456789',
      isbn13: '9780123456789',
      pageCount: 350,
      mainImage: 'https://fixtures.invalid/images/books/example-all-fields.webp',
      mainImageThumb: 'https://fixtures.invalid/images/books/example-all-fields-thumb.webp',
      images: 'https://fixtures.invalid/images/books/example-extra.webp',
      averageRating: '4.8',
      category: 'Fiction',
      status: 'finished',
      currentPage: null,
      totalPages: 350,
      rating: 5,
      notes: 'Highly recommended to a friend'
    })
  ]
})

// Maximally populated: 6 books with ALL nullable fields set to non-null values
// (series, seriesNumber, seriesTotal, description, publicationDate, publishedYear,
// isbn10, isbn13, pageCount, mainImage, mainImageThumb, mainImageCard,
// mainImageAvif, mainImageThumbAvif, mainImageCardAvif, images, averageRating,
// category, status, currentPage, totalPages, rating, notes, finishedAt, startedAt).
export const full: BooksExport = createBooksFixture({
  books: [
    createBook({
      asin: '1984820710',
      title: 'The Tainted Cup',
      author: 'Robert Jackson Bennett',
      series: 'Shadow of the Leviathan',
      seriesNumber: 1,
      seriesTotal: 3,
      description: placeholderText(200),
      publicationDate: '2024-02-06',
      publishedYear: 2024,
      isbn10: '1984820710',
      isbn13: '9781984820716',
      pageCount: 432,
      mainImage: 'https://fixtures.invalid/images/books/example-tainted-cup.webp',
      mainImageThumb: 'https://fixtures.invalid/images/books/example-tainted-cup-thumb.webp',
      mainImageCard: 'https://fixtures.invalid/images/books/example-tainted-cup-card.webp',
      mainImageAvif: 'https://fixtures.invalid/images/books/example-tainted-cup.avif',
      mainImageThumbAvif: 'https://fixtures.invalid/images/books/example-tainted-cup-thumb.avif',
      mainImageCardAvif: 'https://fixtures.invalid/images/books/example-tainted-cup-card.avif',
      images: 'https://fixtures.invalid/images/books/example-tainted-cup-extra.webp',
      averageRating: '4.5',
      category: 'Fantasy, Mystery, Thriller',
      status: 'finished',
      currentPage: 432,
      totalPages: 432,
      rating: 5,
      notes: 'Outstanding mystery-fantasy hybrid with inventive worldbuilding and sharp dialogue',
      startedAt: '2024-02-10T00:00:00Z',
      finishedAt: '2024-03-10T00:00:00Z'
    }),
    createBook({
      asin: '0593723848',
      title: 'A Drop of Corruption',
      author: 'Robert Jackson Bennett',
      series: 'Shadow of the Leviathan',
      seriesNumber: 2,
      seriesTotal: 3,
      description: placeholderText(200),
      publicationDate: '2025-02-04',
      publishedYear: 2025,
      isbn10: '0593723848',
      isbn13: '9780593723845',
      pageCount: 480,
      mainImage: 'https://fixtures.invalid/images/books/example-drop-of-corruption.webp',
      mainImageThumb: 'https://fixtures.invalid/images/books/example-drop-of-corruption-thumb.webp',
      mainImageCard: 'https://fixtures.invalid/images/books/example-drop-of-corruption-card.webp',
      mainImageAvif: 'https://fixtures.invalid/images/books/example-drop-of-corruption.avif',
      mainImageThumbAvif: 'https://fixtures.invalid/images/books/example-drop-of-corruption-thumb.avif',
      mainImageCardAvif: 'https://fixtures.invalid/images/books/example-drop-of-corruption-card.avif',
      images: 'https://fixtures.invalid/images/books/example-drop-of-corruption-extra.webp',
      averageRating: '4.6',
      category: 'Fantasy, Mystery, Thriller',
      status: 'finished',
      currentPage: 480,
      totalPages: 480,
      rating: 5,
      notes: 'Even better than the first — the political intrigue deepens brilliantly',
      startedAt: '2025-01-05T00:00:00Z',
      finishedAt: '2025-01-25T00:00:00Z'
    }),
    createBook({
      asin: '0525573844',
      title: 'Foundryside',
      author: 'Robert Jackson Bennett',
      series: 'The Founders Trilogy',
      seriesNumber: 1,
      seriesTotal: 3,
      description: placeholderText(200),
      publicationDate: '2018-08-21',
      publishedYear: 2018,
      isbn10: '0525573844',
      isbn13: '9780525573845',
      pageCount: 512,
      mainImage: 'https://fixtures.invalid/images/books/example-foundryside.webp',
      mainImageThumb: 'https://fixtures.invalid/images/books/example-foundryside-thumb.webp',
      mainImageCard: 'https://fixtures.invalid/images/books/example-foundryside-card.webp',
      mainImageAvif: 'https://fixtures.invalid/images/books/example-foundryside.avif',
      mainImageThumbAvif: 'https://fixtures.invalid/images/books/example-foundryside-thumb.avif',
      mainImageCardAvif: 'https://fixtures.invalid/images/books/example-foundryside-card.avif',
      images: 'https://fixtures.invalid/images/books/example-foundryside-extra.webp',
      averageRating: '4.3',
      category: 'Fantasy',
      status: 'finished',
      currentPage: 512,
      totalPages: 512,
      rating: 5,
      notes: 'Ingenious magic system based on industrial programming — scriving is brilliant',
      startedAt: '2023-07-01T00:00:00Z',
      finishedAt: '2023-08-15T00:00:00Z'
    }),
    createBook({
      asin: 'B07QVH2Q2K',
      title: 'Shorefall',
      author: 'Robert Jackson Bennett',
      series: 'The Founders Trilogy',
      seriesNumber: 2,
      seriesTotal: 3,
      description: placeholderText(200),
      publicationDate: '2020-04-21',
      publishedYear: 2020,
      isbn10: '0593723813',
      isbn13: '9780593723814',
      pageCount: 496,
      mainImage: 'https://fixtures.invalid/images/books/example-shorefall.webp',
      mainImageThumb: 'https://fixtures.invalid/images/books/example-shorefall-thumb.webp',
      mainImageCard: 'https://fixtures.invalid/images/books/example-shorefall-card.webp',
      mainImageAvif: 'https://fixtures.invalid/images/books/example-shorefall.avif',
      mainImageThumbAvif: 'https://fixtures.invalid/images/books/example-shorefall-thumb.avif',
      mainImageCardAvif: 'https://fixtures.invalid/images/books/example-shorefall-card.avif',
      images: 'https://fixtures.invalid/images/books/example-shorefall-extra.webp',
      averageRating: '4.2',
      category: 'Fantasy',
      status: 'reading',
      currentPage: 312,
      totalPages: 496,
      rating: 4,
      notes: 'The stakes escalate dramatically — Valeria is a compelling antagonist',
      startedAt: '2026-06-01T00:00:00Z',
      finishedAt: null
    }),
    createBook({
      asin: 'B0FBRJY116',
      title: 'Crafting Engineering Strategy',
      author: 'Will Larson',
      series: 'Engineering Leadership Series',
      seriesNumber: 2,
      seriesTotal: 3,
      description: placeholderText(200),
      publicationDate: '2024-09-01',
      publishedYear: 2024,
      isbn10: '0593723856',
      isbn13: '9780593723857',
      pageCount: 307,
      mainImage: 'https://fixtures.invalid/images/books/example-crafting-eng-strategy.webp',
      mainImageThumb: 'https://fixtures.invalid/images/books/example-crafting-eng-strategy-thumb.webp',
      mainImageCard: 'https://fixtures.invalid/images/books/example-crafting-eng-strategy-card.webp',
      mainImageAvif: 'https://fixtures.invalid/images/books/example-crafting-eng-strategy.avif',
      mainImageThumbAvif: 'https://fixtures.invalid/images/books/example-crafting-eng-strategy-thumb.avif',
      mainImageCardAvif: 'https://fixtures.invalid/images/books/example-crafting-eng-strategy-card.avif',
      images: 'https://fixtures.invalid/images/books/example-crafting-eng-strategy-extra.webp',
      averageRating: '4.7',
      category: 'Technology, Business, Leadership',
      status: 'upNext',
      currentPage: 0,
      totalPages: 307,
      rating: 4,
      notes: 'Practical frameworks for engineering strategy at director+ level',
      startedAt: null,
      finishedAt: null
    }),
    createBook({
      asin: '0596517742',
      title: 'JavaScript: The Good Parts',
      author: 'Douglas Crockford',
      series: "O'Reilly Classics",
      seriesNumber: 1,
      seriesTotal: 12,
      description: placeholderText(200),
      publicationDate: '2008-05-15',
      publishedYear: 2008,
      isbn10: '0596517742',
      isbn13: '9780596517748',
      pageCount: 176,
      mainImage: 'https://fixtures.invalid/images/books/example-js-good-parts.webp',
      mainImageThumb: 'https://fixtures.invalid/images/books/example-js-good-parts-thumb.webp',
      mainImageCard: 'https://fixtures.invalid/images/books/example-js-good-parts-card.webp',
      mainImageAvif: 'https://fixtures.invalid/images/books/example-js-good-parts.avif',
      mainImageThumbAvif: 'https://fixtures.invalid/images/books/example-js-good-parts-thumb.avif',
      mainImageCardAvif: 'https://fixtures.invalid/images/books/example-js-good-parts-card.avif',
      images: 'https://fixtures.invalid/images/books/example-js-good-parts-extra.webp',
      averageRating: '4.1',
      category: 'Technology, Programming, JavaScript',
      status: 'finished',
      currentPage: 176,
      totalPages: 176,
      rating: 3,
      notes: 'Foundational but dated — many "bad parts" are now handled by TypeScript',
      startedAt: '2022-03-01T00:00:00Z',
      finishedAt: '2022-03-20T00:00:00Z'
    })
  ]
})

export const booksVariations = {baseline, empty, allReading, allCompleted, mixedStatus, withProgress, noCovers, seriesBooks, sixBooks, allFields, full}
