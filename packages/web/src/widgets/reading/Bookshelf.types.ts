// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @lifegames/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

export interface BookEntry {
  asin: string;
  isbn?: string;
  title: string;
  author: string;
  status: string;
  rating?: number;
  progress?: number;
  notes?: string;
  coverAvif?: string;
  coverCardAvif?: string;
  coverThumbAvif?: string;
}

export interface BookMeta {
  seriesName?: string;
  seriesNumber?: number;
  seriesTotal?: number;
  pages?: number;
  year?: number;
  publicationDate?: string;
  desc?: string;
  genres?: string[];
  cover?: string;
}

export interface BookshelfProps {
  books: {
    books: BookEntry[];
    bookMeta: Record<string, BookMeta>;
    statusLabels: Record<string, string>;
  };
}
