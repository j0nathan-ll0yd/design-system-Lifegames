export interface PlaceLeaderboardV3Props {
  topPlaces: {
    name: string;
    category: string | null;
    visitCount: number;
    totalDurationMinutes: number;
    lastVisitAt: string | null;
  }[];
}
