// Post-adapter display fixtures for the Bookshelf + BookModal widgets.
//
// DashboardBooks is a DS-owned display shape that is RICHER than the runtime
// adapter output: its bookMeta/statusLabels/stats and the books[] field set differ
// from adaptBooks() (which feeds the runtime updater). The SSR shell reads this
// authored display shape. Authored against `@j0nathan-ll0yd/schemas` `DashboardBooks`
// (authored/dashboard-books.schema.json). All values absolute — deterministic.
//
// COVER RULE: a non-null cover URL here must name an ASIN in COVERED_ASINS —
// an object the real books pipeline actually produced. The SSR shell renders
// these covers verbatim into `<img src>`, with no route interception in front of
// them, so a URL without a backing object is a guaranteed 403 on every page load
// (atlas 0086 issue #2). Books outside COVERED_ASINS carry null covers and the
// consumer paints the same-origin placeholder instead. `pnpm -F
// @j0nathan-ll0yd/fixtures test` enforces this.
import type {DashboardBooks} from '@j0nathan-ll0yd/schemas'
import {authored} from './branded'

// The four ASINs below are fixture-only stand-ins that the pipeline never
// processed: every /images/books/<asin>.{webp,avif} key 403s. Their covers are
// null so the SSR shell requests nothing for them.
export const baseline = authored<DashboardBooks>({
  books: [
    {
      title: 'The Pragmatic Programmer',
      author: 'David Thomas',
      isbn: '9780135957059',
      asin: '0135957052',
      mainImage: null,
      mainImageThumb: null,
      mainImageCard: null,
      mainImageAvif: null,
      mainImageThumbAvif: null,
      mainImageCardAvif: null,
      link: 'https://amzn.to/example1',
      status: 'reading',
      rating: null,
      progress: 55
    },
    {
      title: 'Clean Code',
      author: 'Robert C. Martin',
      isbn: '9780132350884',
      asin: '0132350882',
      mainImage: null,
      mainImageThumb: null,
      mainImageCard: null,
      mainImageAvif: null,
      mainImageThumbAvif: null,
      mainImageCardAvif: null,
      link: 'https://amzn.to/example2',
      status: 'finished',
      rating: 4,
      progress: 100,
      finishedAt: '2024-01-15T00:00:00Z'
    },
    {
      title: 'Designing Data-Intensive Applications',
      author: 'Martin Kleppmann',
      isbn: '9781449373320',
      asin: '1449373321',
      mainImage: null,
      mainImageThumb: null,
      mainImageCard: null,
      mainImageAvif: null,
      mainImageThumbAvif: null,
      mainImageCardAvif: null,
      link: 'https://amzn.to/example3',
      status: 'finished',
      rating: 5,
      progress: 100,
      finishedAt: '2023-11-20T00:00:00Z'
    },
    {
      title: 'A Philosophy of Software Design',
      author: 'John Ousterhout',
      isbn: '9781732102200',
      asin: '173210220X',
      mainImage: null,
      mainImageThumb: null,
      mainImageCard: null,
      mainImageAvif: null,
      mainImageThumbAvif: null,
      mainImageCardAvif: null,
      link: 'https://amzn.to/example4',
      status: 'upNext',
      rating: null,
      progress: 0
    }
  ],
  bookMeta: {
    '0135957052': {
      seriesName: null,
      seriesNumber: null,
      seriesTotal: null,
      pages: 352,
      genres: ['Tech', 'Software Engineering'],
      year: 2019,
      desc: 'A timeless guide to writing better code, covering topics from clean design to pragmatic philosophy for professional software developers.'
    },
    '0132350882': {
      seriesName: null,
      seriesNumber: null,
      seriesTotal: null,
      pages: 431,
      genres: ['Tech', 'Software Engineering'],
      year: 2008,
      desc: 'Seminal book on writing readable, maintainable code with practical advice on naming, functions, classes, and more.'
    },
    '1449373321': {
      seriesName: null,
      seriesNumber: null,
      seriesTotal: null,
      pages: 611,
      genres: ['Tech', 'Databases'],
      year: 2017,
      desc: 'A comprehensive guide to the principles, design, and implementation of scalable, reliable data systems.'
    },
    '173210220X': {
      seriesName: null,
      seriesNumber: null,
      seriesTotal: null,
      pages: 190,
      genres: ['Tech', 'Software Design'],
      year: 2018,
      desc: 'A fresh look at the fundamental problem in computer science: how to decompose complex software systems into modules.'
    }
  },
  statusLabels: {pending: 'Pending', reading: 'Reading', upNext: 'Up Next', finished: 'Finished'},
  stats: {totalRead: 2, currentlyReading: 1, upNext: 1, avgRating: 4.5, booksThisYear: 3}
})

// Empty bookshelf: no books, empty bookMeta, statusLabels retained (UI needs the
// label map even when the shelf is empty), zeroed stats.
export const empty = authored<DashboardBooks>({
  books: [],
  bookMeta: {},
  statusLabels: {pending: 'Pending', reading: 'Reading', upNext: 'Up Next', finished: 'Finished'},
  stats: {totalRead: 0, currentlyReading: 0, upNext: 0, avgRating: 0, booksThisYear: 0}
})

// Maximally populated: many books across all statuses, all bookMeta populated with
// non-null series info, all stats at high realistic values, all nullable fields
// (rating, seriesName, seriesNumber, seriesTotal, finishedAt) set to non-null values.
//
// Covers are the ONE exception to "every nullable field non-null": the last book
// (1449373321) is outside COVERED_ASINS, so its covers are null under the COVER
// RULE above. The other five carry real CloudFront objects, so this variation
// still exercises a rendered cover AND the placeholder in one shelf. The raw
// full-variation oracle (scripts/check-full-coverage.ts) walks generated/**, not
// this post-adapter tree, so it is unaffected.
export const full = authored<DashboardBooks>({
  books: [
    {
      title: 'The Tainted Cup',
      author: 'Robert Jackson Bennett',
      isbn: '9781984820716',
      asin: '1984820710',
      mainImage: 'https://d1pfm520aduift.cloudfront.net/images/books/1984820710.webp',
      mainImageThumb: 'https://d1pfm520aduift.cloudfront.net/images/books/1984820710-thumb.webp',
      mainImageCard: 'https://d1pfm520aduift.cloudfront.net/images/books/1984820710-card.webp',
      mainImageAvif: 'https://d1pfm520aduift.cloudfront.net/images/books/1984820710.avif',
      mainImageThumbAvif: 'https://d1pfm520aduift.cloudfront.net/images/books/1984820710-thumb.avif',
      mainImageCardAvif: 'https://d1pfm520aduift.cloudfront.net/images/books/1984820710-card.avif',
      link: 'https://amzn.to/tainted-cup',
      status: 'finished',
      rating: 5,
      progress: 100,
      finishedAt: '2024-03-10T00:00:00Z'
    },
    {
      title: 'A Drop of Corruption',
      author: 'Robert Jackson Bennett',
      isbn: '9780593723845',
      asin: '0593723848',
      mainImage: 'https://d1pfm520aduift.cloudfront.net/images/books/0593723848.webp',
      mainImageThumb: 'https://d1pfm520aduift.cloudfront.net/images/books/0593723848-thumb.webp',
      mainImageCard: 'https://d1pfm520aduift.cloudfront.net/images/books/0593723848-card.webp',
      mainImageAvif: 'https://d1pfm520aduift.cloudfront.net/images/books/0593723848.avif',
      mainImageThumbAvif: 'https://d1pfm520aduift.cloudfront.net/images/books/0593723848-thumb.avif',
      mainImageCardAvif: 'https://d1pfm520aduift.cloudfront.net/images/books/0593723848-card.avif',
      link: 'https://amzn.to/drop-of-corruption',
      status: 'finished',
      rating: 5,
      progress: 100,
      finishedAt: '2025-01-22T00:00:00Z'
    },
    {
      title: 'Foundryside',
      author: 'Robert Jackson Bennett',
      isbn: '9780525573845',
      asin: '0525573844',
      mainImage: 'https://d1pfm520aduift.cloudfront.net/images/books/0525573844.webp',
      mainImageThumb: 'https://d1pfm520aduift.cloudfront.net/images/books/0525573844-thumb.webp',
      mainImageCard: 'https://d1pfm520aduift.cloudfront.net/images/books/0525573844-card.webp',
      mainImageAvif: 'https://d1pfm520aduift.cloudfront.net/images/books/0525573844.avif',
      mainImageThumbAvif: 'https://d1pfm520aduift.cloudfront.net/images/books/0525573844-thumb.avif',
      mainImageCardAvif: 'https://d1pfm520aduift.cloudfront.net/images/books/0525573844-card.avif',
      link: 'https://amzn.to/foundryside',
      status: 'finished',
      rating: 5,
      progress: 100,
      finishedAt: '2023-08-15T00:00:00Z'
    },
    {
      title: 'Shorefall',
      author: 'Robert Jackson Bennett',
      isbn: '9780593723814',
      asin: 'B07QVH2Q2K',
      mainImage: 'https://d1pfm520aduift.cloudfront.net/images/books/B07QVH2Q2K.webp',
      mainImageThumb: 'https://d1pfm520aduift.cloudfront.net/images/books/B07QVH2Q2K-thumb.webp',
      mainImageCard: 'https://d1pfm520aduift.cloudfront.net/images/books/B07QVH2Q2K-card.webp',
      mainImageAvif: 'https://d1pfm520aduift.cloudfront.net/images/books/B07QVH2Q2K.avif',
      mainImageThumbAvif: 'https://d1pfm520aduift.cloudfront.net/images/books/B07QVH2Q2K-thumb.avif',
      mainImageCardAvif: 'https://d1pfm520aduift.cloudfront.net/images/books/B07QVH2Q2K-card.avif',
      link: 'https://amzn.to/shorefall',
      status: 'reading',
      rating: 4,
      progress: 63
    },
    {
      title: 'Crafting Engineering Strategy',
      author: 'Will Larson',
      isbn: '9780593723857',
      asin: 'B0FBRJY116',
      mainImage: 'https://d1pfm520aduift.cloudfront.net/images/books/B0FBRJY116.webp',
      mainImageThumb: 'https://d1pfm520aduift.cloudfront.net/images/books/B0FBRJY116-thumb.webp',
      mainImageCard: 'https://d1pfm520aduift.cloudfront.net/images/books/B0FBRJY116-card.webp',
      mainImageAvif: 'https://d1pfm520aduift.cloudfront.net/images/books/B0FBRJY116.avif',
      mainImageThumbAvif: 'https://d1pfm520aduift.cloudfront.net/images/books/B0FBRJY116-thumb.avif',
      mainImageCardAvif: 'https://d1pfm520aduift.cloudfront.net/images/books/B0FBRJY116-card.avif',
      link: 'https://amzn.to/crafting-eng-strategy',
      status: 'upNext',
      rating: 4,
      progress: 0
    },
    {
      title: 'Designing Data-Intensive Applications',
      author: 'Martin Kleppmann',
      isbn: '9781449373320',
      asin: '1449373321',
      mainImage: null,
      mainImageThumb: null,
      mainImageCard: null,
      mainImageAvif: null,
      mainImageThumbAvif: null,
      mainImageCardAvif: null,
      link: 'https://amzn.to/ddia',
      status: 'finished',
      rating: 5,
      progress: 100,
      finishedAt: '2022-05-30T00:00:00Z'
    }
  ],
  bookMeta: {
    '1984820710': {
      seriesName: 'Shadow of the Leviathan',
      seriesNumber: 1,
      seriesTotal: 3,
      pages: 432,
      genres: ['Fantasy', 'Mystery', 'Thriller'],
      year: 2024,
      desc:
        'Outstanding mystery-fantasy hybrid with inventive worldbuilding — an investigator and her assistant solve murders in a city threatened by leviathans.'
    },
    '0593723848': {
      seriesName: 'Shadow of the Leviathan',
      seriesNumber: 2,
      seriesTotal: 3,
      pages: 480,
      genres: ['Fantasy', 'Mystery', 'Thriller'],
      year: 2025,
      desc: 'The political intrigue deepens as the investigation uncovers corruption at the heart of the empire — even better than the first installment.'
    },
    '0525573844': {
      seriesName: 'The Founders Trilogy',
      seriesNumber: 1,
      seriesTotal: 3,
      pages: 512,
      genres: ['Fantasy', 'Science Fiction'],
      year: 2018,
      desc: 'Ingenious magic system based on industrial programming — a thief discovers her city is built on ancient, dangerous technology called scriving.'
    },
    B07QVH2Q2K: {
      seriesName: 'The Founders Trilogy',
      seriesNumber: 2,
      seriesTotal: 3,
      pages: 496,
      genres: ['Fantasy', 'Science Fiction'],
      year: 2020,
      desc:
        'The stakes escalate dramatically as an ancient intelligence returns to reshape reality — Valeria is a compelling antagonist who challenges everything.'
    },
    B0FBRJY116: {
      seriesName: 'Engineering Leadership Series',
      seriesNumber: 2,
      seriesTotal: 3,
      pages: 307,
      genres: ['Technology', 'Business', 'Leadership'],
      year: 2024,
      desc: 'Practical frameworks for engineering strategy at director+ level — covers organizational design, technical vision, and execution at scale.'
    },
    '1449373321': {
      seriesName: "O'Reilly Data Series",
      seriesNumber: 1,
      seriesTotal: 5,
      pages: 611,
      genres: ['Tech', 'Databases', 'Distributed Systems'],
      year: 2017,
      desc:
        'A comprehensive guide to the principles, design, and implementation of scalable, reliable data systems from batch processing to stream processing.'
    }
  },
  statusLabels: {pending: 'Pending', reading: 'Reading', upNext: 'Up Next', finished: 'Finished'},
  stats: {totalRead: 42, currentlyReading: 3, upNext: 8, avgRating: 4.3, booksThisYear: 18}
})

export const booksPostAdapter = {baseline, empty, full}
