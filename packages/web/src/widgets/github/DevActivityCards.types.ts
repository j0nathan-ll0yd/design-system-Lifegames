export interface DevActivityCardsProps {
  events: {
  type: string;
  repo: string;
  title: string;
  date: string;
  hash: string;
  additions: number;
  deletions: number;
}[];
}
