/**
 * Public GitHub references used by fixtures that render clickable links.
 *
 * Every entry was verified against the unauthenticated public GitHub surface on
 * 2026-08-22. Keep this catalog explicit: fixture data is representative, but a
 * rendered link must still resolve for a visitor who is not signed in.
 */
export interface PublicGithubCommitReference {
  repository: string
  displayRepository: string
  hash: string
  title: string
}

export interface PublicGithubPullReference {
  repository: string
  displayRepository: string
  number: number
  title: string
}

export const PUBLIC_GITHUB_REPOSITORIES = [
  'j0nathan-ll0yd/j0nathan-ll0yd.github.io',
  'j0nathan-ll0yd/design-system-Lifegames',
  'j0nathan-ll0yd/mantle-OfflineMediaDownloader',
  'code-yeongyu/oh-my-openagent',
  'memvid/claude-brain',
  'alienplatform/alien',
  'macOS26/Agent',
  'modelcontextprotocol/typescript-sdk',
  'vercel/next.js',
  'denoland/deno',
  'astro-community/astro',
  'biomejs/biome',
  'drizzle-team/drizzle-orm',
  'tauri-apps/tauri',
  // SSR known-answer targets (decision 0160). Disjoint from every other fixture so a
  // rendered value proves SSR read THIS payload. Verified public via the GitHub API.
  'octocat/Hello-World',
  'docker-library/busybox',
  'docker-library/hello-world'
] as const

export const PUBLIC_GITHUB_COMMITS = [
  {
    repository: 'j0nathan-ll0yd/j0nathan-ll0yd.github.io',
    displayRepository: 'portfolio',
    hash: '9deedf9',
    title: 'Add skeleton loading states for live-data dashboard widgets'
  },
  {
    repository: 'j0nathan-ll0yd/j0nathan-ll0yd.github.io',
    displayRepository: 'portfolio',
    hash: '336f56e',
    title: 'Pre-flight egress probe to distinguish runner-egress-down from site-down'
  },
  {
    repository: 'j0nathan-ll0yd/j0nathan-ll0yd.github.io',
    displayRepository: 'portfolio',
    hash: '1e1178d',
    title: 'Enforce RSS feed specification provenance'
  },
  {
    repository: 'j0nathan-ll0yd/j0nathan-ll0yd.github.io',
    displayRepository: 'portfolio',
    hash: '1e932ef',
    title: 'Wire the openspec-covers gate as a blocking per-PR job'
  },
  {
    repository: 'j0nathan-ll0yd/j0nathan-ll0yd.github.io',
    displayRepository: 'portfolio',
    hash: '7389db4',
    title: 'Move off broken pnpm 11.13.0 and re-apply action-setup'
  },
  {
    repository: 'j0nathan-ll0yd/design-system-Lifegames',
    displayRepository: 'design-system',
    hash: '67fd9f2',
    title: 'Add component catalog fleet generation'
  },
  {
    repository: 'j0nathan-ll0yd/design-system-Lifegames',
    displayRepository: 'design-system',
    hash: 'ab08ec7',
    title: 'Align fixture catalog with initializer states'
  },
  {repository: 'j0nathan-ll0yd/design-system-Lifegames', displayRepository: 'design-system', hash: '8037546', title: 'Add component catalog prop depth'},
  {repository: 'j0nathan-ll0yd/design-system-Lifegames', displayRepository: 'design-system', hash: '7b805ba', title: 'Pilot the component-contract catalog'},
  {
    repository: 'j0nathan-ll0yd/design-system-Lifegames',
    displayRepository: 'design-system',
    hash: 'b1049dc',
    title: 'Move the design system off broken pnpm 11.13.0'
  },
  {
    repository: 'j0nathan-ll0yd/mantle-OfflineMediaDownloader',
    displayRepository: 'media-downloader',
    hash: 'ffdf547',
    title: 'Block new uncovered OpenSpec requirements'
  },
  {
    repository: 'j0nathan-ll0yd/mantle-OfflineMediaDownloader',
    displayRepository: 'media-downloader',
    hash: '19a42a6',
    title: 'Activate Docker-free prebuilt-image deploys'
  }
] as const satisfies readonly PublicGithubCommitReference[]

export const PUBLIC_GITHUB_PULLS = [
  {
    repository: 'j0nathan-ll0yd/j0nathan-ll0yd.github.io',
    displayRepository: 'portfolio',
    number: 42,
    title: 'Fix reading-feed items hidden by an animation race'
  },
  {repository: 'j0nathan-ll0yd/j0nathan-ll0yd.github.io', displayRepository: 'portfolio', number: 192, title: 'Enforce RSS feed specification provenance'},
  {
    repository: 'j0nathan-ll0yd/j0nathan-ll0yd.github.io',
    displayRepository: 'portfolio',
    number: 191,
    title: 'Wire the openspec-covers gate as a blocking per-PR job'
  },
  {
    repository: 'j0nathan-ll0yd/design-system-Lifegames',
    displayRepository: 'design-system',
    number: 206,
    title: 'Stop advertising the retired llms-small.txt'
  },
  {repository: 'j0nathan-ll0yd/design-system-Lifegames', displayRepository: 'design-system', number: 205, title: 'Fix stale references in live docs'},
  {repository: 'j0nathan-ll0yd/design-system-Lifegames', displayRepository: 'design-system', number: 204, title: 'Add component catalog fleet generation'},
  {repository: 'j0nathan-ll0yd/mantle-OfflineMediaDownloader', displayRepository: 'media-downloader', number: 388, title: 'Update yt-dlp'},
  {
    repository: 'j0nathan-ll0yd/mantle-OfflineMediaDownloader',
    displayRepository: 'media-downloader',
    number: 615,
    title: 'Block new uncovered OpenSpec requirements'
  },
  {
    repository: 'j0nathan-ll0yd/mantle-OfflineMediaDownloader',
    displayRepository: 'media-downloader',
    number: 614,
    title: 'Refresh first-party lockfile pins'
  }
] as const satisfies readonly PublicGithubPullReference[]

/**
 * Verified public targets used ONLY by the `ssrKnownAnswer` githubEvents variation.
 * They are kept out of PUBLIC_GITHUB_COMMITS / PUBLIC_GITHUB_PULLS on purpose: other
 * variations index those arrays by position and modulo length, so appending would
 * change their generated bytes and break the known-answer disjointness.
 * Verified against the unauthenticated public GitHub surface on 2026-10-07.
 */
export const SSR_KNOWN_ANSWER_GITHUB_COMMITS = [
  {repository: 'octocat/Hello-World', displayRepository: 'Hello-World', hash: '7fd1a60', title: 'Merge pull request #6 from Spaceghost/patch-1'}
] as const satisfies readonly PublicGithubCommitReference[]

export const SSR_KNOWN_ANSWER_GITHUB_PULLS = [
  {repository: 'octocat/Hello-World', displayRepository: 'Hello-World', number: 6, title: 'New line at end of file.'}
] as const satisfies readonly PublicGithubPullReference[]

export function githubCommitUrl(ref: PublicGithubCommitReference): string {
  return `https://github.com/${ref.repository}/commit/${ref.hash}`
}

export function githubPullUrl(ref: PublicGithubPullReference): string {
  return `https://github.com/${ref.repository}/pull/${ref.number}`
}
