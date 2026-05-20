export interface RepoShowcaseProps {
  repos: {
  name: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  languageColor: string;
  topics: string[];
  url: string;
}[];
}
