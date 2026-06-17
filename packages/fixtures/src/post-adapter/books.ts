// Post-adapter display fixtures for the Bookshelf + BookModal widgets.
//
// DashboardBooks is a DS-owned display shape that is RICHER than the runtime
// adapter output: its bookMeta/statusLabels/stats and the books[] field set differ
// from adaptBooks() (which feeds the runtime updater). The SSR shell reads this
// authored display shape. Authored against `@lifegames/schemas` `DashboardBooks`
// (authored/dashboard-books.schema.json). All values absolute — deterministic.
import type { DashboardBooks } from '@lifegames/schemas';
import { authored } from './branded';

export const baseline = authored<DashboardBooks>({
  books: [
    {
      title: 'The Pragmatic Programmer',
      author: 'David Thomas',
      isbn: '9780135957059',
      asin: '0135957052',
      link: 'https://amzn.to/example1',
      status: 'in_progress',
      rating: null,
      progress: 55,
    },
    {
      title: 'Clean Code',
      author: 'Robert C. Martin',
      isbn: '9780132350884',
      asin: '0132350882',
      link: 'https://amzn.to/example2',
      status: 'completed',
      rating: 4,
      progress: 100,
    },
    {
      title: 'Designing Data-Intensive Applications',
      author: 'Martin Kleppmann',
      isbn: '9781449373320',
      asin: '1449373321',
      link: 'https://amzn.to/example3',
      status: 'completed',
      rating: 5,
      progress: 100,
    },
    {
      title: 'A Philosophy of Software Design',
      author: 'John Ousterhout',
      isbn: '9781732102200',
      asin: '173210220X',
      link: 'https://amzn.to/example4',
      status: 'next',
      rating: null,
      progress: 0,
    },
  ],
  bookMeta: {
    '0135957052': {
      seriesName: null,
      seriesNumber: null,
      seriesTotal: null,
      pages: 352,
      genres: ['Tech', 'Software Engineering'],
      year: 2019,
      desc: 'A timeless guide to writing better code, covering topics from clean design to pragmatic philosophy for professional software developers.',
    },
    '0132350882': {
      seriesName: null,
      seriesNumber: null,
      seriesTotal: null,
      pages: 431,
      genres: ['Tech', 'Software Engineering'],
      year: 2008,
      desc: 'Seminal book on writing readable, maintainable code with practical advice on naming, functions, classes, and more.',
    },
    '1449373321': {
      seriesName: null,
      seriesNumber: null,
      seriesTotal: null,
      pages: 611,
      genres: ['Tech', 'Databases'],
      year: 2017,
      desc: 'A comprehensive guide to the principles, design, and implementation of scalable, reliable data systems.',
    },
    '173210220X': {
      seriesName: null,
      seriesNumber: null,
      seriesTotal: null,
      pages: 190,
      genres: ['Tech', 'Software Design'],
      year: 2018,
      desc: 'A fresh look at the fundamental problem in computer science: how to decompose complex software systems into modules.',
    },
  },
  statusLabels: {
    next: 'Up Next',
    in_progress: 'Reading',
    completed: 'Recently Finished',
  },
  stats: {
    totalRead: 2,
    currentlyReading: 1,
    upNext: 1,
    avgRating: 4.5,
    booksThisYear: 3,
  },
});

// Empty bookshelf: no books, empty bookMeta, statusLabels retained (UI needs the
// label map even when the shelf is empty), zeroed stats.
export const empty = authored<DashboardBooks>({
  books: [],
  bookMeta: {},
  statusLabels: {
    next: 'Up Next',
    in_progress: 'Reading',
    completed: 'Recently Finished',
  },
  stats: {
    totalRead: 0,
    currentlyReading: 0,
    upNext: 0,
    avgRating: 0,
    booksThisYear: 0,
  },
});

// Maximally populated: many books across all statuses, all bookMeta populated with
// non-null series info, all stats at high realistic values, all nullable fields
// (rating, seriesName, seriesNumber, seriesTotal) set to non-null values.
export const full = authored<DashboardBooks>({
  books: [
    {
      title: 'The Tainted Cup',
      author: 'Robert Jackson Bennett',
      isbn: '9781984820716',
      asin: '1984820710',
      link: 'https://amzn.to/tainted-cup',
      status: 'completed',
      rating: 5,
      progress: 100,
    },
    {
      title: 'A Drop of Corruption',
      author: 'Robert Jackson Bennett',
      isbn: '9780593723845',
      asin: '0593723848',
      link: 'https://amzn.to/drop-of-corruption',
      status: 'completed',
      rating: 5,
      progress: 100,
    },
    {
      title: 'Foundryside',
      author: 'Robert Jackson Bennett',
      isbn: '9780525573845',
      asin: '0525573844',
      link: 'https://amzn.to/foundryside',
      status: 'completed',
      rating: 5,
      progress: 100,
    },
    {
      title: 'Shorefall',
      author: 'Robert Jackson Bennett',
      isbn: '9780593723814',
      asin: 'B07QVH2Q2K',
      link: 'https://amzn.to/shorefall',
      status: 'in_progress',
      rating: 4,
      progress: 63,
    },
    {
      title: 'Crafting Engineering Strategy',
      author: 'Will Larson',
      isbn: '9780593723857',
      asin: 'B0FBRJY116',
      link: 'https://amzn.to/crafting-eng-strategy',
      status: 'next',
      rating: 4,
      progress: 0,
    },
    {
      title: 'Designing Data-Intensive Applications',
      author: 'Martin Kleppmann',
      isbn: '9781449373320',
      asin: '1449373321',
      link: 'https://amzn.to/ddia',
      status: 'completed',
      rating: 5,
      progress: 100,
    },
  ],
  bookMeta: {
    '1984820710': {
      seriesName: 'Shadow of the Leviathan',
      seriesNumber: 1,
      seriesTotal: 3,
      pages: 432,
      genres: ['Fantasy', 'Mystery', 'Thriller'],
      year: 2024,
      desc: 'Outstanding mystery-fantasy hybrid with inventive worldbuilding — an investigator and her assistant solve murders in a city threatened by leviathans.',
    },
    '0593723848': {
      seriesName: 'Shadow of the Leviathan',
      seriesNumber: 2,
      seriesTotal: 3,
      pages: 480,
      genres: ['Fantasy', 'Mystery', 'Thriller'],
      year: 2025,
      desc: 'The political intrigue deepens as the investigation uncovers corruption at the heart of the empire — even better than the first installment.',
    },
    '0525573844': {
      seriesName: 'The Founders Trilogy',
      seriesNumber: 1,
      seriesTotal: 3,
      pages: 512,
      genres: ['Fantasy', 'Science Fiction'],
      year: 2018,
      desc: 'Ingenious magic system based on industrial programming — a thief discovers her city is built on ancient, dangerous technology called scriving.',
    },
    B07QVH2Q2K: {
      seriesName: 'The Founders Trilogy',
      seriesNumber: 2,
      seriesTotal: 3,
      pages: 496,
      genres: ['Fantasy', 'Science Fiction'],
      year: 2020,
      desc: 'The stakes escalate dramatically as an ancient intelligence returns to reshape reality — Valeria is a compelling antagonist who challenges everything.',
    },
    B0FBRJY116: {
      seriesName: 'Engineering Leadership Series',
      seriesNumber: 2,
      seriesTotal: 3,
      pages: 307,
      genres: ['Technology', 'Business', 'Leadership'],
      year: 2024,
      desc: 'Practical frameworks for engineering strategy at director+ level — covers organizational design, technical vision, and execution at scale.',
    },
    '1449373321': {
      seriesName: "O'Reilly Data Series",
      seriesNumber: 1,
      seriesTotal: 5,
      pages: 611,
      genres: ['Tech', 'Databases', 'Distributed Systems'],
      year: 2017,
      desc: 'A comprehensive guide to the principles, design, and implementation of scalable, reliable data systems from batch processing to stream processing.',
    },
  },
  statusLabels: {
    next: 'Up Next',
    in_progress: 'Reading',
    completed: 'Recently Finished',
  },
  stats: {
    totalRead: 42,
    currentlyReading: 3,
    upNext: 8,
    avgRating: 4.3,
    booksThisYear: 18,
  },
});

export const booksPostAdapter = { baseline, empty, full };
