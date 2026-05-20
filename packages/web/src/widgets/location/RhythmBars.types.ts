export interface RhythmBarsProps {
  last90Days: {
    date: string;
    count: number;
    uniquePlaces: number;
    totalDurationMinutes: number;
  }[];
}
