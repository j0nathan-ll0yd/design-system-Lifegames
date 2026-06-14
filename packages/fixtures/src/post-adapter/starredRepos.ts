// Post-adapter display fixtures for the StarredRepoList widget.
//
// starredRepos is the ONLY domain whose post-adapter shape is mechanically derived
// by running the REAL runtime adapter (`adaptStarredRepos` from @lifegames/web) over
// a raw GithubStarredReposExport. To keep the relative-time output ("2 weeks ago")
// deterministic, the adapter is invoked with a STABLE injected `now` equal to the
// raw fixture's `generatedAt` — the same trick the web's loadDashboardData used.
//
// This proves the pattern the other six domains avoid (their display shapes are
// authored directly because the runtime adapters produce narrower/different
// shapes). For starredRepos the adapter output IS the display shape consumed by SSR.
import type { GithubStarredReposExport } from '@lifegames/portal-contract/schemas';
import { adaptStarredRepos, type AdaptedStarredRepo } from '@lifegames/web/runtime/adapters';

// Stable generation timestamp shared by the raw input and the adapter clock so
// "N weeks/days ago" strings never drift between fixture-gen runs.
const STABLE_NOW_ISO = '2026-03-18T12:00:00.000Z';
const STABLE_NOW_MS = new Date(STABLE_NOW_ISO).getTime();

function daysBefore(days: number): string {
  return new Date(STABLE_NOW_MS - days * 24 * 60 * 60 * 1000).toISOString();
}

// Raw export with a spread of star ages so the adapter exercises hours/days/weeks
// formatting deterministically. Five repos = the adapter's display cap.
const baselineRaw: GithubStarredReposExport = {
  generatedAt: STABLE_NOW_ISO,
  repos: [
    {
      ownerLogin: 'code-yeongyu',
      name: 'oh-my-openagent',
      htmlUrl: 'https://github.com/code-yeongyu/oh-my-openagent',
      stargazersCount: 53920,
      languages: [{ language: 'JavaScript', color: '#f1e05a' }],
      starredAt: daysBefore(2),
    },
    {
      ownerLogin: 'memvid',
      name: 'claude-brain',
      htmlUrl: 'https://github.com/memvid/claude-brain',
      stargazersCount: 465,
      languages: [{ language: 'TypeScript', color: '#3178c6' }],
      starredAt: daysBefore(5),
    },
    {
      ownerLogin: 'alienplatform',
      name: 'alien',
      htmlUrl: 'https://github.com/alienplatform/alien',
      stargazersCount: 151,
      languages: [{ language: 'Shell', color: '#89e051' }],
      starredAt: daysBefore(9),
    },
    {
      ownerLogin: 'macOS26',
      name: 'Agent',
      htmlUrl: 'https://github.com/macOS26/Agent',
      stargazersCount: 380,
      languages: [{ language: 'HTML', color: '#e34c26' }],
      starredAt: daysBefore(16),
    },
    {
      ownerLogin: 'zindexai',
      name: 'zindex',
      htmlUrl: 'https://github.com/zindexai/zindex',
      stargazersCount: 5,
      languages: [],
      starredAt: daysBefore(23),
    },
  ],
};

// Run the REAL adapter with the stable clock → deterministic post-adapter shape.
export const baseline: AdaptedStarredRepo[] = adaptStarredRepos(baselineRaw, STABLE_NOW_MS);

// Empty starred list — exercises the "no starred repos" rendering path.
export const empty: AdaptedStarredRepo[] = adaptStarredRepos(
  { generatedAt: STABLE_NOW_ISO, repos: [] },
  STABLE_NOW_MS,
);

export const starredReposPostAdapter = { baseline, empty } satisfies Record<
  string,
  AdaptedStarredRepo[]
>;
