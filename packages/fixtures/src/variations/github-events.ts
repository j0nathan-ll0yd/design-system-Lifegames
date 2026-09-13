import type {GithubEventsExport} from '@j0nathan-ll0yd/portal-contract/schemas'
import {createEvent, createGithubEventsFixture} from '../factories/github-events'
import {isoDate, isoTimestamp} from '../factories/helpers'
import {PUBLIC_GITHUB_COMMITS, PUBLIC_GITHUB_PULLS, type PublicGithubCommitReference, type PublicGithubPullReference} from '../github-references'

type GithubEvent = GithubEventsExport['events'][number]

function commitEvent(ref: PublicGithubCommitReference, additions: number, deletions: number, pull?: PublicGithubPullReference): GithubEvent {
  return createEvent({type: 'commit', repo: ref.repository, title: ref.title, date: isoDate(), hash: ref.hash, number: pull?.number, additions, deletions})
}

function pullEvent(
  type: 'pr_merged' | 'pr_opened',
  ref: PublicGithubPullReference,
  additions?: number,
  deletions?: number,
  commit?: PublicGithubCommitReference
): GithubEvent {
  return createEvent({type, repo: ref.repository, title: ref.title, date: isoDate(), number: ref.number, hash: commit?.hash, additions, deletions})
}

export const githubEventsVariations: Record<string, GithubEventsExport> = {
  baseline: createGithubEventsFixture(),

  empty: createGithubEventsFixture({events: []}),

  commitsOnly: createGithubEventsFixture({
    events: Array.from({length: 5}, (_, i) => {
      const ref = PUBLIC_GITHUB_COMMITS[i]!
      return commitEvent(ref, (i + 1) * 10, i * 3)
    })
  }),

  prsOnly: createGithubEventsFixture({
    events: Array.from({length: 5}, (_, i) => {
      const ref = PUBLIC_GITHUB_PULLS[i]!
      return pullEvent(i % 2 === 0 ? 'pr_merged' : 'pr_opened', ref)
    })
  }),

  overTen: createGithubEventsFixture({
    events: Array.from({length: 15}, (_, i) => {
      if (i % 3 === 0) {
        const ref = PUBLIC_GITHUB_PULLS[(i / 3) % PUBLIC_GITHUB_PULLS.length]!
        return pullEvent('pr_merged', ref)
      }
      const ref = PUBLIC_GITHUB_COMMITS[i % PUBLIC_GITHUB_COMMITS.length]!
      return commitEvent(ref, i * 5, i * 2)
    }),
    generatedAt: isoTimestamp()
  }),

  // Maximally populated: all event types represented, all truly-optional keys
  // present (number, hash, additions, deletions) on every event. Every URL-bearing
  // repo/hash/number tuple still points to a verified public GitHub target.
  full: createGithubEventsFixture({
    events: [
      commitEvent(PUBLIC_GITHUB_COMMITS[0], 245, 89, PUBLIC_GITHUB_PULLS[0]),
      commitEvent(PUBLIC_GITHUB_COMMITS[5], 512, 134, PUBLIC_GITHUB_PULLS[3]),
      pullEvent('pr_merged', PUBLIC_GITHUB_PULLS[6], 189, 45, PUBLIC_GITHUB_COMMITS[10]),
      pullEvent('pr_opened', PUBLIC_GITHUB_PULLS[1], 1850, 120, PUBLIC_GITHUB_COMMITS[2]),
      commitEvent(PUBLIC_GITHUB_COMMITS[6], 378, 156, PUBLIC_GITHUB_PULLS[4]),
      pullEvent('pr_merged', PUBLIC_GITHUB_PULLS[2], 634, 28, PUBLIC_GITHUB_COMMITS[3]),
      commitEvent(PUBLIC_GITHUB_COMMITS[7], 420, 67, PUBLIC_GITHUB_PULLS[5]),
      pullEvent('pr_opened', PUBLIC_GITHUB_PULLS[7], 892, 445, PUBLIC_GITHUB_COMMITS[11]),
      commitEvent(PUBLIC_GITHUB_COMMITS[4], 156, 72, PUBLIC_GITHUB_PULLS[0]),
      pullEvent('pr_merged', PUBLIC_GITHUB_PULLS[4], 98, 31, PUBLIC_GITHUB_COMMITS[8]),
      commitEvent(PUBLIC_GITHUB_COMMITS[10], 1240, 340, PUBLIC_GITHUB_PULLS[8]),
      commitEvent(PUBLIC_GITHUB_COMMITS[9], 267, 89, PUBLIC_GITHUB_PULLS[3])
    ]
  })
}
