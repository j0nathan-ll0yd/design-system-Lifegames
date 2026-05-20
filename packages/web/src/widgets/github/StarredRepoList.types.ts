export interface StarredRepoListProps {
  repos: {
  owner: string;
  name: string;
  stars: number;
  language: string;
  languageColor: string;
  starredAt: string;
}[];
}
