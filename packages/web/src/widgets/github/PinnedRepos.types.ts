export interface PinnedReposProps {
  repos: {
  name: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  languageColor: string;
  url: string;
}[];
}
