import { updateTheatreReviews } from './updaters-theatre';
import type { TheatreReviewsExport } from '../types/exports';

export function initTheatreReviews(container: HTMLElement, fixtureData: { reviews: TheatreReviewsExport['reviews']; totalReviews: number }): void {
  const data: TheatreReviewsExport = {
    generatedAt: new Date().toISOString(),
    source: 'fixture',
    totalReviews: fixtureData.totalReviews,
    reviews: fixtureData.reviews,
  };
  updateTheatreReviews(data);
}
