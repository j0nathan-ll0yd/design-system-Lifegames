export interface StreakCalendarProps {
  last90Days: {
    date: string;
    count: number;
    uniquePlaces: number;
    totalDurationMinutes: number;
  }[];
  streaks: {
    currentStreak: number;
    longestStreak: number;
    totalActiveDays: number;
  };
}
