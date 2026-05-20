export interface CommitTimelineProps {
  commits: {
  hash: string;
  message: string;
  repo: string;
  date: string;
  repoColor: string;
}[];
}
