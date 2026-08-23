// Post-adapter display fixtures for the GitHub widgets (DevActivityLog +
// contribution-grid panels).
//
// DashboardGithub is a DS-authored aggregate shape with NO raw LP export
// equivalent — it is computed from the GitHub API by the DS pipeline, not produced
// by any runtime adapter (adaptGithubEvents produces a DIFFERENT, narrower
// AdaptedGithubEvent[] shape used only by the runtime updater). These fixtures are
// authored directly against `@j0nathan-ll0yd/schemas` `DashboardGithub`
// (authored/dashboard-github.schema.json) and feed the SSR shell.
//
// `devActivity[].date` is a pre-formatted relative string ("2h ago"), so it is
// already deterministic — no clock injection needed for this domain.
import type {DashboardGithub} from '@j0nathan-ll0yd/schemas'
import {
  githubCommitUrl,
  githubPullUrl,
  PUBLIC_GITHUB_COMMITS,
  PUBLIC_GITHUB_PULLS,
  type PublicGithubCommitReference,
  type PublicGithubPullReference
} from '../github-references'
import {authored} from './branded'

type DashboardGithubEvent = NonNullable<DashboardGithub['devActivity']>[number]

// Deterministic 52x7 contribution grid. Generated from a fixed integer sequence
// (NOT Math.random) so re-runs are byte-identical. Each cell is a small count.
function buildGrid(): [number, number, number, number, number, number, number][] {
  type Week = [number, number, number, number, number, number, number]
  const weeks: Week[] = []
  for (let w = 0; w < 52; w++) {
    const days: number[] = []
    for (let d = 0; d < 7; d++) {
      // Weekends (d=0 Sun, d=6 Sat) skew lower; a stable pseudo-pattern otherwise.
      const base = (w * 7 + d) % 5
      const weekendDamp = d === 0 || d === 6 ? 0 : 1
      days.push(base * weekendDamp)
    }
    weeks.push(days as Week)
  }
  return weeks
}

// Higher-activity grid for `full`: weekday cells are larger, weekends have some.
function buildFullGrid(): [number, number, number, number, number, number, number][] {
  type Week = [number, number, number, number, number, number, number]
  const weeks: Week[] = []
  for (let w = 0; w < 52; w++) {
    const days: number[] = []
    for (let d = 0; d < 7; d++) {
      const base = ((w * 7 + d) % 7) + 1
      const weekendDamp = d === 0 || d === 6 ? 1 : 3
      days.push(base * weekendDamp)
    }
    weeks.push(days as Week)
  }
  return weeks
}

function commitActivity(ref: PublicGithubCommitReference, date: string, additions: number, deletions: number): DashboardGithubEvent {
  return {type: 'commit', repo: ref.displayRepository, title: ref.title, date, hash: ref.hash, additions, deletions, url: githubCommitUrl(ref)}
}

function pullActivity(
  type: 'pr_merged' | 'pr_opened',
  ref: PublicGithubPullReference,
  date: string,
  additions: number,
  deletions: number
): DashboardGithubEvent {
  return {type, repo: ref.displayRepository, title: ref.title, date, number: ref.number, additions, deletions, url: githubPullUrl(ref)}
}

export const baseline = authored<DashboardGithub>({
  contributions: buildGrid(),
  totalContributions: 1847,
  contributionTypes: {commits: 1203, pullRequests: 289, issues: 142, reviews: 198, repositories: 15},
  streak: {current: 12, longest: 47},
  languages: {TypeScript: 432500, JavaScript: 298620, Python: 145300, Swift: 87432, Go: 54200, CSS: 38100, HTML: 22400, Shell: 8900},
  devActivity: [
    commitActivity(PUBLIC_GITHUB_COMMITS[5], '2h ago', 28, 16),
    pullActivity('pr_opened', PUBLIC_GITHUB_PULLS[6], '1d ago', 1, 1),
    commitActivity(PUBLIC_GITHUB_COMMITS[1], '2d ago', 45, 12),
    commitActivity(PUBLIC_GITHUB_COMMITS[0], '3d ago', 156, 24),
    commitActivity(PUBLIC_GITHUB_COMMITS[6], '5d ago', 89, 34)
  ],
  commitHours: [2, 0, 0, 0, 0, 1, 3, 5, 12, 18, 22, 15, 8, 14, 20, 19, 16, 10, 6, 4, 5, 8, 6, 3],
  weeklyCommits: [15, 22, 18, 31, 12, 25, 19, 28, 14, 23, 17, 20],
  stats: {repos: 42, stars: 128, contributions: 1847},
  topRepos: [
    {name: 'myapp', stars: 45, language: 'TypeScript', description: 'Personal app'},
    {name: 'api-gateway', stars: 32, language: 'Go', description: 'API gateway service'},
    {name: 'realtime-service', stars: 28, language: 'JavaScript', description: 'WebSocket service'},
    {name: 'ml-pipeline', stars: 15, language: 'Python', description: 'ML data pipeline'},
    {name: 'ios-app', stars: 8, language: 'Swift', description: 'iOS companion app'}
  ]
})

// Empty: zeroed grid (still 52x7 of zeros for layout), zero stats, no activity.
// Exercises the "no contributions yet" rendering path.
export const empty = authored<DashboardGithub>({
  contributions: Array.from({length: 52}, () => [0, 0, 0, 0, 0, 0, 0] as [number, number, number, number, number, number, number]),
  totalContributions: 0,
  contributionTypes: {commits: 0, pullRequests: 0, issues: 0, reviews: 0, repositories: 0},
  streak: {current: 0, longest: 0},
  languages: {},
  devActivity: [],
  commitHours: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  weeklyCommits: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  stats: {repos: 0, stars: 0, contributions: 0},
  topRepos: []
})

// Maximally populated: all optional fields present (languages, devActivity,
// commitHours, weeklyCommits, stats, topRepos), higher contribution counts,
// more languages, more activity events, more top repos, highest realistic values.
export const full = authored<DashboardGithub>({
  contributions: buildFullGrid(),
  totalContributions: 4892,
  contributionTypes: {commits: 3245, pullRequests: 812, issues: 389, reviews: 326, repositories: 120},
  streak: {current: 67, longest: 142},
  languages: {
    TypeScript: 1285000,
    JavaScript: 642300,
    Python: 389000,
    Swift: 245600,
    Go: 178400,
    Rust: 134200,
    CSS: 98500,
    HTML: 67800,
    Shell: 42300,
    SQL: 28100,
    Kotlin: 18500,
    Ruby: 12400
  },
  devActivity: [
    commitActivity(PUBLIC_GITHUB_COMMITS[2], '1h ago', 245, 89),
    pullActivity('pr_merged', PUBLIC_GITHUB_PULLS[3], '3h ago', 1850, 120),
    commitActivity(PUBLIC_GITHUB_COMMITS[3], '1d ago', 512, 134),
    pullActivity('pr_opened', PUBLIC_GITHUB_PULLS[7], '2d ago', 892, 445),
    commitActivity(PUBLIC_GITHUB_COMMITS[10], '3d ago', 267, 89),
    pullActivity('pr_merged', PUBLIC_GITHUB_PULLS[0], '4d ago', 634, 28),
    commitActivity(PUBLIC_GITHUB_COMMITS[7], '5d ago', 420, 67),
    commitActivity(PUBLIC_GITHUB_COMMITS[8], '6d ago', 378, 156),
    pullActivity('pr_opened', PUBLIC_GITHUB_PULLS[8], '1w ago', 1240, 340),
    commitActivity(PUBLIC_GITHUB_COMMITS[11], '1w ago', 98, 31)
  ],
  commitHours: [
    4,
    1,
    0,
    0,
    0,
    2,
    6,
    12,
    24,
    38,
    45,
    32,
    18,
    28,
    42,
    39,
    34,
    22,
    14,
    8,
    10,
    16,
    12,
    6
  ],
  weeklyCommits: [32, 45, 38, 62, 28, 52, 41, 58, 34, 48, 36, 44],
  stats: {repos: 86, stars: 342, contributions: 4892},
  topRepos: [
    {name: 'mantle', stars: 128, language: 'TypeScript', description: 'Serverless infrastructure framework with type-safe resource bindings'},
    {name: 'design-system', stars: 64, language: 'TypeScript', description: 'Cross-platform design system with DTCG tokens and SwiftUI components'},
    {name: 'portfolio', stars: 45, language: 'TypeScript', description: 'Personal data dashboard built with Astro and real-time health widgets'},
    {name: 'media-downloader', stars: 38, language: 'TypeScript', description: 'Automated media pipeline with CloudFront delivery and S3 storage'},
    {name: 'ios-app', stars: 22, language: 'Swift', description: 'iOS companion app with WidgetKit and SwiftUI design gallery'},
    {name: 'api-gateway', stars: 18, language: 'Go', description: 'High-performance API gateway with rate limiting and circuit breakers'},
    {name: 'ml-pipeline', stars: 15, language: 'Python', description: 'ML data pipeline for health metric anomaly detection and trend analysis'},
    {name: 'realtime-service', stars: 12, language: 'TypeScript', description: 'WebSocket service for live dashboard updates with pub/sub fanout'}
  ]
})

export const githubPostAdapter = {baseline, empty, full}
