export interface ContributionCalendarProps {
  weeks: {
    firstDay: string;
    days: {
      date: string;
      count: number;
      level: number;
    }[];
  }[];
  months: string[];
}
