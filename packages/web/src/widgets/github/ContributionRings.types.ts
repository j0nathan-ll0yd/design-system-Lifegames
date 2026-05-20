export interface ContributionRingsProps {
  commits: {
  count: number;
  pct: number;
};
  pullRequests: {
  count: number;
  pct: number;
};
  issues: {
  count: number;
  pct: number;
};
  reviews: {
  count: number;
  pct: number;
};
}
