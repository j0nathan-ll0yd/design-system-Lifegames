// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @j0nathan-ll0yd/schemas (consumer-aggregate shapes).
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
  // Image field names come straight from the books export contract
  // (`mainImage*`). These previously read `cover*`, which no export has ever
  // emitted — so every AVIF source here was dead and the widget fell through
  // to a hard-coded Amazon URL (atlas decision 0086).
  mainImage?: string | null;
  mainImageThumb?: string | null;
  mainImageCard?: string | null;
  mainImageAvif?: string | null;
  mainImageThumbAvif?: string | null;
  mainImageCardAvif?: string | null;
  finishedAt?: string | null;
  startedAt?: string | null;
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
