export interface DurationDonutProps {
  totalDurationHours: number;
  categoryBreakdown: {
    category: string;
    visitCount: number;
    totalMinutes: number;
  }[];
}
