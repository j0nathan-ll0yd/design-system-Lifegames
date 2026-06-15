// Post-adapter display fixtures for the GitHub widgets (DevActivityLog +
// contribution-grid panels).
//
// DashboardGithub is a DS-authored aggregate shape with NO raw LP export
// equivalent — it is computed from the GitHub API by the DS pipeline, not produced
// by any runtime adapter (adaptGithubEvents produces a DIFFERENT, narrower
// AdaptedGithubEvent[] shape used only by the runtime updater). These fixtures are
// authored directly against `@lifegames/schemas` `DashboardGithub`
// (authored/dashboard-github.schema.json) and feed the SSR shell.
//
// `devActivity[].date` is a pre-formatted relative string ("2h ago"), so it is
// already deterministic — no clock injection needed for this domain.
import type { DashboardGithub } from '@lifegames/schemas';

// Deterministic 52x7 contribution grid. Generated from a fixed integer sequence
// (NOT Math.random) so re-runs are byte-identical. Each cell is a small count.
function buildGrid(): [number, number, number, number, number, number, number][] {
  type Week = [number, number, number, number, number, number, number];
  const weeks: Week[] = [];
  for (let w = 0; w < 52; w++) {
    const days: number[] = [];
    for (let d = 0; d < 7; d++) {
      // Weekends (d=0 Sun, d=6 Sat) skew lower; a stable pseudo-pattern otherwise.
      const base = (w * 7 + d) % 5;
      const weekendDamp = d === 0 || d === 6 ? 0 : 1;
      days.push(base * weekendDamp);
    }
    weeks.push(days as Week);
  }
  return weeks;
}

// SchemaDerived<T> adds a nominal brand symbol that object literals cannot
// satisfy structurally. The fixtures ARE schema-valid; cast bypasses the brand.
export const baseline = {
  contributions: buildGrid(),
  totalContributions: 1847,
  contributionTypes: {
    commits: 1203,
    pullRequests: 289,
    issues: 142,
    reviews: 198,
    repositories: 15,
  },
  streak: { current: 12, longest: 47 },
  languages: {
    TypeScript: 432500,
    JavaScript: 298620,
    Python: 145300,
    Swift: 87432,
    Go: 54200,
    CSS: 38100,
    HTML: 22400,
    Shell: 8900,
  },
  devActivity: [
    {
      type: 'commit',
      repo: 'mantle',
      title: 'Unify handler pattern',
      date: '2h ago',
      hash: 'a9421b5',
      additions: 28,
      deletions: 16,
      url: 'https://github.com/j0nathan-ll0yd/mantle/commit/a9421b5',
    },
    {
      type: 'pr_opened',
      repo: 'media-downloader',
      title: 'chore(deps): update yt-dlp',
      date: '1d ago',
      number: 388,
      additions: 1,
      deletions: 1,
      url: 'https://github.com/j0nathan-ll0yd/aws-cloudformation-media-downloader/pull/388',
    },
    {
      type: 'commit',
      repo: 'mantle',
      title: 'Add validation engine',
      date: '2d ago',
      hash: 'b3c4d5e',
      additions: 45,
      deletions: 12,
      url: 'https://github.com/j0nathan-ll0yd/mantle/commit/b3c4d5e',
    },
    {
      type: 'commit',
      repo: 'portfolio',
      title: 'Add skeleton loading states',
      date: '3d ago',
      hash: '9deedf9',
      additions: 156,
      deletions: 24,
      url: 'https://github.com/j0nathan-ll0yd/j0nathan-ll0yd.github.io/commit/9deedf9',
    },
    {
      type: 'commit',
      repo: 'mantle',
      title: 'Extract shared utilities',
      date: '5d ago',
      hash: 'f6g7h8i',
      additions: 89,
      deletions: 34,
      url: 'https://github.com/j0nathan-ll0yd/mantle/commit/f6g7h8i',
    },
  ],
  commitHours: [2, 0, 0, 0, 0, 1, 3, 5, 12, 18, 22, 15, 8, 14, 20, 19, 16, 10, 6, 4, 5, 8, 6, 3],
  weeklyCommits: [15, 22, 18, 31, 12, 25, 19, 28, 14, 23, 17, 20],
  stats: { repos: 42, stars: 128, contributions: 1847 },
  topRepos: [
    { name: 'myapp', stars: 45, language: 'TypeScript', description: 'Personal app' },
    { name: 'api-gateway', stars: 32, language: 'Go', description: 'API gateway service' },
    {
      name: 'realtime-service',
      stars: 28,
      language: 'JavaScript',
      description: 'WebSocket service',
    },
    { name: 'ml-pipeline', stars: 15, language: 'Python', description: 'ML data pipeline' },
    { name: 'ios-app', stars: 8, language: 'Swift', description: 'iOS companion app' },
  ],
} as unknown as DashboardGithub;

// Empty: zeroed grid (still 52x7 of zeros for layout), zero stats, no activity.
// Exercises the "no contributions yet" rendering path.
export const empty = {
  contributions: Array.from(
    { length: 52 },
    () => [0, 0, 0, 0, 0, 0, 0] as [number, number, number, number, number, number, number],
  ),
  totalContributions: 0,
  contributionTypes: { commits: 0, pullRequests: 0, issues: 0, reviews: 0, repositories: 0 },
  streak: { current: 0, longest: 0 },
  languages: {},
  devActivity: [],
  commitHours: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  weeklyCommits: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  stats: { repos: 0, stars: 0, contributions: 0 },
  topRepos: [],
} as unknown as DashboardGithub;

export const githubPostAdapter = { baseline, empty };
