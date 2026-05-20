export interface StarredRepoCardsProps {
  repos: {
  owner: string;
  name: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  languageColor: string;
  url: string;
}[];
}
