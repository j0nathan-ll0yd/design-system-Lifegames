export interface StreakCounterProps {
  current: number;
  longest: number;
  recentDays: {
    date: string;
    active: boolean;
  }[];
}
