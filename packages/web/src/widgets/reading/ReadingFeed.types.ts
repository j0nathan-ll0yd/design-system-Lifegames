// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @j0nathan-ll0yd/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

export interface Article {
  title: string;
  source: string;
  date: string;
}

export interface ReadingFeedProps {
  reading: {
    articles: Article[];
  };
}
