// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @lifegames/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

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
