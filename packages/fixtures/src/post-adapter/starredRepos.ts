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
import type {GithubStarredReposExport} from '@lifegames/portal-contract/schemas'
import {type AdaptedStarredRepo, adaptStarredRepos} from '@lifegames/web/runtime/adapters'

// Stable generation timestamp shared by the raw input and the adapter clock so
// "N weeks/days ago" strings never drift between fixture-gen runs.
const STABLE_NOW_ISO = '2026-03-18T12:00:00.000Z'
const STABLE_NOW_MS = new Date(STABLE_NOW_ISO).getTime()

function daysBefore(days: number): string {
  return new Date(STABLE_NOW_MS - days * 24 * 60 * 60 * 1000).toISOString()
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
      languages: [{language: 'JavaScript', lines: 12400}],
      starredAt: daysBefore(2)
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
      languages: [{language: 'TypeScript', lines: 8900}],
      starredAt: daysBefore(5)
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
      languages: [{language: 'Shell', lines: 3200}],
      starredAt: daysBefore(9)
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
      languages: [{language: 'HTML', lines: 5600}],
      starredAt: daysBefore(16)
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
      starredAt: daysBefore(23)
    }
  ]
}

// Maximal raw input: all nullable fields non-null (description, licenseKey,
// licenseName, licenseSpdxId), multiple languages, topics populated. Six repos
// with diverse star ages for broader relative-time formatting coverage.
const fullRaw: GithubStarredReposExport = {
  generatedAt: STABLE_NOW_ISO,
  repos: [
    {
      ownerLogin: 'vercel',
      ownerHtmlUrl: 'https://github.com/vercel',
      name: 'next.js',
      htmlUrl: 'https://github.com/vercel/next.js',
      description: 'The React Framework for the Web — production-grade, server-rendered React applications',
      forksCount: 27800,
      stargazersCount: 128500,
      watchersCount: 128500,
      openIssuesCount: 2450,
      topics: ['nextjs', 'react', 'framework', 'ssr', 'typescript', 'web'],
      size: 524288,
      licenseKey: 'mit',
      licenseName: 'MIT License',
      licenseSpdxId: 'MIT',
      languages: [
        {language: 'TypeScript', lines: 1850000},
        {language: 'JavaScript', lines: 420000},
        {language: 'Rust', lines: 95000}
      ],
      starredAt: daysBefore(1)
    },
    {
      ownerLogin: 'denoland',
      ownerHtmlUrl: 'https://github.com/denoland',
      name: 'deno',
      htmlUrl: 'https://github.com/denoland/deno',
      description: 'A modern runtime for JavaScript and TypeScript built on V8, Rust, and Tokio',
      forksCount: 5400,
      stargazersCount: 98200,
      watchersCount: 98200,
      openIssuesCount: 1830,
      topics: ['deno', 'runtime', 'typescript', 'javascript', 'rust', 'v8'],
      size: 262144,
      licenseKey: 'mit',
      licenseName: 'MIT License',
      licenseSpdxId: 'MIT',
      languages: [
        {language: 'Rust', lines: 920000},
        {language: 'TypeScript', lines: 310000},
        {language: 'JavaScript', lines: 85000}
      ],
      starredAt: daysBefore(3)
    },
    {
      ownerLogin: 'biomejs',
      ownerHtmlUrl: 'https://github.com/biomejs',
      name: 'biome',
      htmlUrl: 'https://github.com/biomejs/biome',
      description: 'A performant toolchain for web projects — linting, formatting, and more in one tool',
      forksCount: 890,
      stargazersCount: 16400,
      watchersCount: 16400,
      openIssuesCount: 245,
      topics: ['linter', 'formatter', 'rust', 'toolchain'],
      size: 65536,
      licenseKey: 'apache-2.0',
      licenseName: 'Apache License 2.0',
      licenseSpdxId: 'Apache-2.0',
      languages: [
        {language: 'Rust', lines: 520000},
        {language: 'TypeScript', lines: 48000}
      ],
      starredAt: daysBefore(8)
    },
    {
      ownerLogin: 'drizzle-team',
      ownerHtmlUrl: 'https://github.com/drizzle-team',
      name: 'drizzle-orm',
      htmlUrl: 'https://github.com/drizzle-team/drizzle-orm',
      description: 'Headless TypeScript ORM with a head — lightweight, performant, type-safe SQL query builder',
      forksCount: 1200,
      stargazersCount: 25800,
      watchersCount: 25800,
      openIssuesCount: 520,
      topics: ['orm', 'typescript', 'sql', 'database', 'drizzle'],
      size: 98304,
      licenseKey: 'apache-2.0',
      licenseName: 'Apache License 2.0',
      licenseSpdxId: 'Apache-2.0',
      languages: [
        {language: 'TypeScript', lines: 380000},
        {language: 'JavaScript', lines: 62000},
        {language: 'SQL', lines: 15000}
      ],
      starredAt: daysBefore(15)
    },
    {
      ownerLogin: 'tauri-apps',
      ownerHtmlUrl: 'https://github.com/tauri-apps',
      name: 'tauri',
      htmlUrl: 'https://github.com/tauri-apps/tauri',
      description: 'Build smaller, faster, and more secure desktop and mobile applications with a web frontend',
      forksCount: 2800,
      stargazersCount: 86500,
      watchersCount: 86500,
      openIssuesCount: 960,
      topics: ['tauri', 'desktop', 'mobile', 'rust', 'webview'],
      size: 196608,
      licenseKey: 'mit',
      licenseName: 'MIT License',
      licenseSpdxId: 'MIT',
      languages: [
        {language: 'Rust', lines: 680000},
        {language: 'TypeScript', lines: 120000},
        {language: 'Swift', lines: 35000},
        {language: 'Kotlin', lines: 28000}
      ],
      starredAt: daysBefore(22)
    },
    {
      ownerLogin: 'astro-community',
      ownerHtmlUrl: 'https://github.com/astro-community',
      name: 'astro',
      htmlUrl: 'https://github.com/astro-community/astro',
      description: 'The web framework for content-driven websites with island architecture and zero JS by default',
      forksCount: 3200,
      stargazersCount: 47600,
      watchersCount: 47600,
      openIssuesCount: 680,
      topics: ['astro', 'framework', 'ssg', 'islands', 'web'],
      size: 131072,
      licenseKey: 'mit',
      licenseName: 'MIT License',
      licenseSpdxId: 'MIT',
      languages: [
        {language: 'TypeScript', lines: 640000},
        {language: 'JavaScript', lines: 180000},
        {language: 'CSS', lines: 42000}
      ],
      starredAt: daysBefore(30)
    }
  ]
}

// Run the REAL adapter with the stable clock → deterministic post-adapter shape.
export const baseline: AdaptedStarredRepo[] = adaptStarredRepos(baselineRaw, STABLE_NOW_MS)

// Empty starred list — exercises the "no starred repos" rendering path.
export const empty: AdaptedStarredRepo[] = adaptStarredRepos({generatedAt: STABLE_NOW_ISO, repos: []}, STABLE_NOW_MS)

// Maximally populated: all nullable fields non-null, multiple languages, topics,
// diverse star ages. Derived via the real adapter for deterministic output.
export const full: AdaptedStarredRepo[] = adaptStarredRepos(fullRaw, STABLE_NOW_MS)

export const starredReposPostAdapter = {baseline, empty, full} satisfies Record<
  string,
  AdaptedStarredRepo[]
>
