export interface WaffleGridProps {
  categoryBreakdown: {
    category: string;
    visitCount: number;
    totalMinutes: number;
  }[];
  totalVisits: number;
}
