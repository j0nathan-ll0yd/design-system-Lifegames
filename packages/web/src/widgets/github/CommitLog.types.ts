export interface CommitLogProps {
  commits: {
  hash: string;
  message: string;
  repo: string;
  date: string;
  additions: number;
  deletions: number;
}[];
}
