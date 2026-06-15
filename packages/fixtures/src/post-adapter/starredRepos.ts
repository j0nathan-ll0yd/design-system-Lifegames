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
      ownerHtmlUrl: 'https://github.com/code-yeongyu',
      name: 'oh-my-openagent',
      htmlUrl: 'https://github.com/code-yeongyu/oh-my-openagent',
      description: 'An open-source OpenAI agent',
      forksCount: 312,
      stargazersCount: 53920,
      watchersCount: 53920,
      openIssuesCount: 8,
      topics: [],
      size: 1024,
      licenseKey: null,
      licenseName: null,
      licenseSpdxId: null,
      languages: [{ language: 'JavaScript', lines: 12400 }],
      starredAt: daysBefore(2),
    },
    {
      ownerLogin: 'memvid',
      ownerHtmlUrl: 'https://github.com/memvid',
      name: 'claude-brain',
      htmlUrl: 'https://github.com/memvid/claude-brain',
      description: 'Memory layer for Claude',
      forksCount: 22,
      stargazersCount: 465,
      watchersCount: 465,
      openIssuesCount: 3,
      topics: [],
      size: 256,
      licenseKey: 'mit',
      licenseName: 'MIT License',
      licenseSpdxId: 'MIT',
      languages: [{ language: 'TypeScript', lines: 8900 }],
      starredAt: daysBefore(5),
    },
    {
      ownerLogin: 'alienplatform',
      ownerHtmlUrl: 'https://github.com/alienplatform',
      name: 'alien',
      htmlUrl: 'https://github.com/alienplatform/alien',
      description: 'Alien deployment platform',
      forksCount: 5,
      stargazersCount: 151,
      watchersCount: 151,
      openIssuesCount: 1,
      topics: [],
      size: 512,
      licenseKey: null,
      licenseName: null,
      licenseSpdxId: null,
      languages: [{ language: 'Shell', lines: 3200 }],
      starredAt: daysBefore(9),
    },
    {
      ownerLogin: 'macOS26',
      ownerHtmlUrl: 'https://github.com/macOS26',
      name: 'Agent',
      htmlUrl: 'https://github.com/macOS26/Agent',
      description: 'macOS 26 agent framework',
      forksCount: 18,
      stargazersCount: 380,
      watchersCount: 380,
      openIssuesCount: 2,
      topics: [],
      size: 768,
      licenseKey: null,
      licenseName: null,
      licenseSpdxId: null,
      languages: [{ language: 'HTML', lines: 5600 }],
      starredAt: daysBefore(16),
    },
    {
      ownerLogin: 'zindexai',
      ownerHtmlUrl: 'https://github.com/zindexai',
      name: 'zindex',
      htmlUrl: 'https://github.com/zindexai/zindex',
      description: null,
      forksCount: 0,
      stargazersCount: 5,
      watchersCount: 5,
      openIssuesCount: 0,
      topics: [],
      size: 64,
      licenseKey: null,
      licenseName: null,
      licenseSpdxId: null,
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
