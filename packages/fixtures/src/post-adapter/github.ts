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
import type {DashboardGithub} from '@lifegames/schemas'
import {authored} from './branded'

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

export const baseline = authored<DashboardGithub>({
  contributions: buildGrid(),
  totalContributions: 1847,
  contributionTypes: {commits: 1203, pullRequests: 289, issues: 142, reviews: 198, repositories: 15},
  streak: {current: 12, longest: 47},
  languages: {TypeScript: 432500, JavaScript: 298620, Python: 145300, Swift: 87432, Go: 54200, CSS: 38100, HTML: 22400, Shell: 8900},
  devActivity: [
    {
      type: 'commit',
      repo: 'mantle',
      title: 'Unify handler pattern',
      date: '2h ago',
      hash: 'a9421b5',
      additions: 28,
      deletions: 16,
      url: 'https://github.com/j0nathan-ll0yd/mantle/commit/a9421b5'
    },
    {
      type: 'pr_opened',
      repo: 'media-downloader',
      title: 'chore(deps): update yt-dlp',
      date: '1d ago',
      number: 388,
      additions: 1,
      deletions: 1,
      url: 'https://github.com/j0nathan-ll0yd/aws-cloudformation-media-downloader/pull/388'
    },
    {
      type: 'commit',
      repo: 'mantle',
      title: 'Add validation engine',
      date: '2d ago',
      hash: 'b3c4d5e',
      additions: 45,
      deletions: 12,
      url: 'https://github.com/j0nathan-ll0yd/mantle/commit/b3c4d5e'
    },
    {
      type: 'commit',
      repo: 'portfolio',
      title: 'Add skeleton loading states',
      date: '3d ago',
      hash: '9deedf9',
      additions: 156,
      deletions: 24,
      url: 'https://github.com/j0nathan-ll0yd/j0nathan-ll0yd.github.io/commit/9deedf9'
    },
    {
      type: 'commit',
      repo: 'mantle',
      title: 'Extract shared utilities',
      date: '5d ago',
      hash: 'f6g7h8i',
      additions: 89,
      deletions: 34,
      url: 'https://github.com/j0nathan-ll0yd/mantle/commit/f6g7h8i'
    }
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
    {
      type: 'commit',
      repo: 'mantle',
      title: 'Unify handler pattern across all Lambda functions for consistent error handling',
      date: '1h ago',
      hash: 'a9421b5',
      additions: 245,
      deletions: 89,
      url: 'https://github.com/j0nathan-ll0yd/mantle/commit/a9421b5'
    },
    {
      type: 'pr_merged',
      repo: 'design-system',
      title: 'feat(fixtures): normalize variations with empty/baseline/full triad',
      date: '3h ago',
      number: 60,
      additions: 1850,
      deletions: 120,
      url: 'https://github.com/j0nathan-ll0yd/design-system-Lifegames/pull/60'
    },
    {
      type: 'commit',
      repo: 'portfolio',
      title: 'Implement skeleton loading states for all dashboard widgets with CSS animations',
      date: '1d ago',
      hash: 'b3c4d5e',
      additions: 512,
      deletions: 134,
      url: 'https://github.com/j0nathan-ll0yd/j0nathan-ll0yd.github.io/commit/b3c4d5e'
    },
    {
      type: 'pr_opened',
      repo: 'mantle',
      title: 'refactor(db): migrate DSQL schema to use branded column types for type safety',
      date: '2d ago',
      number: 312,
      additions: 892,
      deletions: 445,
      url: 'https://github.com/j0nathan-ll0yd/mantle/pull/312'
    },
    {
      type: 'commit',
      repo: 'media-downloader',
      title: 'Add CloudFront cache invalidation after successful S3 export for all domains',
      date: '3d ago',
      hash: 'c5d6e7f',
      additions: 267,
      deletions: 89,
      url: 'https://github.com/j0nathan-ll0yd/aws-cloudformation-media-downloader/commit/c5d6e7f'
    },
    {
      type: 'pr_merged',
      repo: 'portfolio',
      title: 'feat(widgets): add theatre reviews widget with grade-based color coding',
      date: '4d ago',
      number: 42,
      additions: 634,
      deletions: 28,
      url: 'https://github.com/j0nathan-ll0yd/j0nathan-ll0yd.github.io/pull/42'
    },
    {
      type: 'commit',
      repo: 'design-system',
      title: 'Add DTCG token definitions for neon accent colors and fluid typography scales',
      date: '5d ago',
      hash: 'd7e8f9g',
      additions: 420,
      deletions: 67,
      url: 'https://github.com/j0nathan-ll0yd/design-system-Lifegames/commit/d7e8f9g'
    },
    {
      type: 'commit',
      repo: 'mantle',
      title: 'Extract shared validation utilities into dedicated validation engine module',
      date: '6d ago',
      hash: 'e8f9g0h',
      additions: 378,
      deletions: 156,
      url: 'https://github.com/j0nathan-ll0yd/mantle/commit/e8f9g0h'
    },
    {
      type: 'pr_opened',
      repo: 'ios-app',
      title: 'feat(gallery): add SwiftUI design gallery with neon console exploration',
      date: '1w ago',
      number: 15,
      additions: 1240,
      deletions: 340,
      url: 'https://github.com/j0nathan-ll0yd/ios-LifegamesPortal/pull/15'
    },
    {
      type: 'commit',
      repo: 'mantle',
      title: 'Optimize Lambda cold start by lazy-loading non-critical modules at invocation time',
      date: '1w ago',
      hash: 'f9g0h1i',
      additions: 98,
      deletions: 31,
      url: 'https://github.com/j0nathan-ll0yd/mantle/commit/f9g0h1i'
    }
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
