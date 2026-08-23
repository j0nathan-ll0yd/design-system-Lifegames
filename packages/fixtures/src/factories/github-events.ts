import type {GithubEventsExport} from '@j0nathan-ll0yd/portal-contract/schemas'
import {isoDate, isoTimestamp} from './helpers'
import {PUBLIC_GITHUB_COMMITS, PUBLIC_GITHUB_PULLS} from '../github-references'

const defaultCommit = PUBLIC_GITHUB_COMMITS[5]

export function createEvent(overrides?: Partial<GithubEventsExport['events'][number]>): GithubEventsExport['events'][number] {
  return {
    type: 'commit',
    repo: defaultCommit.repository,
    title: defaultCommit.title,
    date: isoDate(),
    hash: defaultCommit.hash,
    additions: 12,
    deletions: 3,
    ...overrides
  }
}

export function createGithubEventsFixture(overrides?: Partial<GithubEventsExport>): GithubEventsExport {
  const portfolioEgress = PUBLIC_GITHUB_COMMITS[1]
  const designSystemCatalog = PUBLIC_GITHUB_COMMITS[5]
  const designSystemFixtures = PUBLIC_GITHUB_COMMITS[6]
  const portfolioReading = PUBLIC_GITHUB_PULLS[0]
  const designSystemDocs = PUBLIC_GITHUB_PULLS[3]

  return {
    generatedAt: isoTimestamp(),
    events: [
      createEvent({
        type: 'commit',
        repo: designSystemCatalog.repository,
        title: designSystemCatalog.title,
        date: isoDate(),
        hash: designSystemCatalog.hash,
        additions: 45,
        deletions: 8
      }),
      createEvent({
        type: 'commit',
        repo: portfolioEgress.repository,
        title: portfolioEgress.title,
        date: isoDate(),
        hash: portfolioEgress.hash,
        additions: 22,
        deletions: 11
      }),
      createEvent({
        type: 'commit',
        repo: designSystemFixtures.repository,
        title: designSystemFixtures.title,
        date: isoDate(),
        hash: designSystemFixtures.hash,
        additions: 7,
        deletions: 2
      }),
      createEvent({type: 'pr_merged', repo: portfolioReading.repository, title: portfolioReading.title, date: isoDate(), number: portfolioReading.number}),
      createEvent({type: 'pr_opened', repo: designSystemDocs.repository, title: designSystemDocs.title, date: isoDate(), number: designSystemDocs.number})
    ],
    ...overrides
  }
}
