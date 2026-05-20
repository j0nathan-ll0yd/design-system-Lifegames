export interface StarredTimelineProps {
  repos: {
  owner: string;
  name: string;
  description: string;
  stars: number;
  language: string;
  languageColor: string;
  starredAt: string;
}[];
}
