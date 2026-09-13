// Raw (pre-adapter) books-export factories.
//
// The `example-*` cover keys below use the reserved `.invalid` TLD. They preserve
// the non-null raw export shape without pretending nonexistent objects live on the
// public CloudFront distribution. Playwright may still intercept them, but an
// accidental fetch cannot become first-party 403 noise.
import type {BooksExport} from '@j0nathan-ll0yd/portal-contract/schemas'
import {isoTimestamp, placeholderText} from './helpers'

type BookEntry = BooksExport['books'][number]

export function createBook(overrides: Partial<BookEntry> = {}): BookEntry {
  return {
    asin: '1984820710',
    title: 'The Tainted Cup',
    author: 'Robert Jackson Bennett',
    series: 'Shadow of the Leviathan',
    seriesNumber: 1,
    seriesTotal: 3,
    description: placeholderText(120),
    publicationDate: '2024-02-06',
    publishedYear: 2024,
    isbn10: '1984820710',
    isbn13: null,
    pageCount: 432,
    // Cover content version (LP #250). Null by default, which is what the producer
    // emits when a cover has no optimized derivatives — it keeps this entry coherent
    // with mainImageCard/mainImage*Avif/images all being null below.
    mainImageVersion: null,
    mainImage: 'https://fixtures.invalid/images/books/example-tainted-cup.webp',
    mainImageThumb: 'https://fixtures.invalid/images/books/example-tainted-cup-thumb.webp',
    mainImageCard: null,
    mainImageAvif: null,
    mainImageThumbAvif: null,
    mainImageCardAvif: null,
    images: null,
    averageRating: '4.5',
    category: 'Fantasy, Mystery, Thriller',
    status: 'finished',
    currentPage: null,
    totalPages: 432,
    rating: 5,
    notes: null,
    updatedAt: isoTimestamp(),
    ...overrides
  }
}

export function createBooksFixture(overrides: Partial<BooksExport> = {}): BooksExport {
  return {
    generatedAt: isoTimestamp(),
    books: [
      createBook({
        asin: '1984820710',
        title: 'The Tainted Cup',
        author: 'Robert Jackson Bennett',
        series: 'Shadow of the Leviathan',
        seriesNumber: 1,
        seriesTotal: 3,
        description: placeholderText(120),
        publicationDate: '2024-02-06',
        publishedYear: 2024,
        pageCount: 432,
        mainImage: 'https://fixtures.invalid/images/books/example-tainted-cup.webp',
        mainImageThumb: 'https://fixtures.invalid/images/books/example-tainted-cup-thumb.webp',
        averageRating: '4.5',
        category: 'Fantasy, Mystery, Thriller',
        status: 'finished',
        currentPage: null,
        totalPages: 432,
        rating: 5
      }),
      createBook({
        asin: '0593723848',
        title: 'A Drop of Corruption',
        author: 'Robert Jackson Bennett',
        series: 'Shadow of the Leviathan',
        seriesNumber: 2,
        seriesTotal: 3,
        description: placeholderText(120),
        publicationDate: '2025-02-04',
        publishedYear: 2025,
        pageCount: 480,
        mainImage: 'https://fixtures.invalid/images/books/example-drop-of-corruption.webp',
        mainImageThumb: 'https://fixtures.invalid/images/books/example-drop-of-corruption-thumb.webp',
        averageRating: '4.6',
        category: 'Fantasy, Mystery, Thriller',
        status: 'finished',
        currentPage: null,
        totalPages: 480,
        rating: 5
      }),
      createBook({
        asin: '0525573844',
        title: 'Foundryside',
        author: 'Robert Jackson Bennett',
        series: 'The Founders Trilogy',
        seriesNumber: 1,
        seriesTotal: 3,
        description: placeholderText(120),
        publicationDate: '2018-08-21',
        publishedYear: 2018,
        pageCount: 512,
        mainImage: 'https://fixtures.invalid/images/books/example-foundryside.webp',
        mainImageThumb: 'https://fixtures.invalid/images/books/example-foundryside-thumb.webp',
        averageRating: '4.3',
        category: 'Fantasy',
        status: 'finished',
        currentPage: null,
        totalPages: 512,
        rating: 5
      }),
      createBook({
        asin: 'B07QVH2Q2K',
        title: 'Shorefall',
        author: 'Robert Jackson Bennett',
        series: 'The Founders Trilogy',
        seriesNumber: 2,
        seriesTotal: 3,
        description: placeholderText(120),
        publicationDate: '2020-04-21',
        publishedYear: 2020,
        pageCount: null,
        mainImage: 'https://fixtures.invalid/images/books/example-shorefall.webp',
        mainImageThumb: 'https://fixtures.invalid/images/books/example-shorefall-thumb.webp',
        averageRating: '4.2',
        category: 'Fantasy',
        status: 'reading',
        currentPage: 166,
        totalPages: 496,
        rating: null
      }),
      createBook({
        asin: 'B0FBRJY116',
        title: 'Crafting Engineering Strategy',
        author: 'Will Larson',
        series: null,
        seriesNumber: null,
        seriesTotal: null,
        description: placeholderText(120),
        publicationDate: '2024-09-01',
        publishedYear: 2024,
        pageCount: 307,
        mainImage: 'https://fixtures.invalid/images/books/example-crafting-eng-strategy.webp',
        mainImageThumb: 'https://fixtures.invalid/images/books/example-crafting-eng-strategy-thumb.webp',
        averageRating: '4.7',
        category: 'Technology, Business',
        status: 'upNext',
        currentPage: null,
        totalPages: 307,
        rating: null
      })
    ],
    ...overrides
  }
}
