export interface StarredByLanguageProps {
  groups: {
  language: string;
  languageColor: string;
  repos: {
  owner: string;
  name: string;
  stars: number;
  starredAt: string;
}[];
}[];
}
