export interface ActivityFeedProps {
  events: {
  type: string;
  repo: string;
  title: string;
  date: string;
  detail: string;
}[];
}
