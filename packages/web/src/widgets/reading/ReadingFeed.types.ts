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
