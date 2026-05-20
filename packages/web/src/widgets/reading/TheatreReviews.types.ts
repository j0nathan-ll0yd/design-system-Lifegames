export interface TheatreReview {
  title: string;
  slug: string;
  url: string;
  author: string;
  publishedAt: string;
  rating: string | null;
  ratingNumeric: number | null;
  excerpt: string;
  imageUrl: string | null;
  imageUrlAvif: string | null;
  imageUrlCard: string | null;
  imageUrlCardAvif: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
}

export interface TheatreReviewsProps {
  reviews: TheatreReview[];
  totalReviews: number;
}
