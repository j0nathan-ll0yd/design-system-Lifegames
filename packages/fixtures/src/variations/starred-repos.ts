import type {GithubStarredReposExport} from '@lifegames/portal-contract/schemas'
import {createStarredReposFixture} from '../factories/starred-repos'
import {isoTimestamp} from '../factories/helpers'

export const starredReposVariations: Record<string, GithubStarredReposExport> = {
  baseline: createStarredReposFixture(),

  empty: createStarredReposFixture({repos: []}),

  // 8 days before the stable reference instant (deterministic; was Date.now()).
  oldTimestamp: createStarredReposFixture({generatedAt: isoTimestamp(8)}),

  // Maximally populated: several repos, all nullable fields non-null (description,
  // licenseKey, licenseName, licenseSpdxId), multiple languages, topics populated.
  full: createStarredReposFixture({
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
        starredAt: isoTimestamp(1)
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
        starredAt: isoTimestamp(3)
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
        starredAt: isoTimestamp(7)
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
        starredAt: isoTimestamp(12)
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
        starredAt: isoTimestamp(18)
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
        starredAt: isoTimestamp(25)
      }
    ]
  })
}
