import type {GithubEventsExport} from '@lifegames/portal-contract/schemas'
import {createEvent, createGithubEventsFixture} from '../factories/github-events'
import {isoDate, isoTimestamp} from '../factories/helpers'

export const githubEventsVariations: Record<string, GithubEventsExport> = {
  baseline: createGithubEventsFixture(),

  empty: createGithubEventsFixture({events: []}),

  commitsOnly: createGithubEventsFixture({
    events: Array.from({length: 5}, (_, i) =>
      createEvent({
        type: 'commit',
        repo: i % 2 === 0 ? 'j0nathan-ll0yd/mantle' : 'j0nathan-ll0yd/j0nathan-ll0yd.github.io',
        title: `Commit number ${i + 1} in the sequence`,
        hash: `abc${i}def`,
        additions: (i + 1) * 10,
        deletions: i * 3,
        date: isoDate()
      }))
  }),

  prsOnly: createGithubEventsFixture({
    events: Array.from({length: 5}, (_, i) =>
      createEvent({
        type: i % 2 === 0 ? 'pr_merged' : 'pr_opened',
        repo: 'j0nathan-ll0yd/mantle',
        title: `Pull request number ${i + 1}`,
        number: i + 1,
        date: isoDate(),
        hash: undefined,
        additions: undefined,
        deletions: undefined
      }))
  }),

  overTen: createGithubEventsFixture({
    events: Array.from({length: 15}, (_, i) =>
      createEvent({
        type: i % 3 === 0 ? 'pr_merged' : 'commit',
        repo: i % 2 === 0 ? 'j0nathan-ll0yd/mantle' : 'j0nathan-ll0yd/j0nathan-ll0yd.github.io',
        title: `Event item ${i + 1} in large set`,
        date: isoDate(),
        hash: i % 3 !== 0 ? `hash${i}` : undefined,
        number: i % 3 === 0 ? i + 1 : undefined,
        additions: i % 3 !== 0 ? i * 5 : undefined,
        deletions: i % 3 !== 0 ? i * 2 : undefined
      })),
    generatedAt: isoTimestamp()
  }),

  // Maximally populated: all event types represented, all truly-optional keys
  // present (number, hash, additions, deletions) on every event. Max-count array.
  full: createGithubEventsFixture({
    events: [
      createEvent({
        type: 'commit',
        repo: 'j0nathan-ll0yd/mantle',
        title: 'Unify handler pattern across all Lambda functions for consistent error handling',
        date: isoDate(),
        hash: 'a9421b5',
        number: 142,
        additions: 245,
        deletions: 89
      }),
      createEvent({
        type: 'commit',
        repo: 'j0nathan-ll0yd/j0nathan-ll0yd.github.io',
        title: 'Implement skeleton loading states for all dashboard widgets with CSS animations',
        date: isoDate(),
        hash: 'b3c4d5e',
        number: 87,
        additions: 512,
        deletions: 134
      }),
      createEvent({
        type: 'pr_merged',
        repo: 'j0nathan-ll0yd/mantle',
        title: 'feat(auth): implement token refresh interceptor with retry logic',
        date: isoDate(),
        hash: 'c5d6e7f',
        number: 256,
        additions: 189,
        deletions: 45
      }),
      createEvent({
        type: 'pr_opened',
        repo: 'j0nathan-ll0yd/design-system-Lifegames',
        title: 'feat(fixtures): normalize variations with empty/baseline/full triad',
        date: isoDate(),
        hash: 'd7e8f9g',
        number: 60,
        additions: 1850,
        deletions: 120
      }),
      createEvent({
        type: 'commit',
        repo: 'j0nathan-ll0yd/mantle',
        title: 'Extract shared validation utilities into dedicated validation engine module',
        date: isoDate(),
        hash: 'e8f9g0h',
        number: 301,
        additions: 378,
        deletions: 156
      }),
      createEvent({
        type: 'pr_merged',
        repo: 'j0nathan-ll0yd/j0nathan-ll0yd.github.io',
        title: 'feat(widgets): add theatre reviews widget with grade-based color coding',
        date: isoDate(),
        hash: 'f9g0h1i',
        number: 42,
        additions: 634,
        deletions: 28
      }),
      createEvent({
        type: 'commit',
        repo: 'j0nathan-ll0yd/design-system-Lifegames',
        title: 'Add DTCG token definitions for neon accent colors and fluid typography scales',
        date: isoDate(),
        hash: 'g0h1i2j',
        number: 55,
        additions: 420,
        deletions: 67
      }),
      createEvent({
        type: 'pr_opened',
        repo: 'j0nathan-ll0yd/mantle',
        title: 'refactor(db): migrate DSQL schema to use branded column types for type safety',
        date: isoDate(),
        hash: 'h1i2j3k',
        number: 312,
        additions: 892,
        deletions: 445
      }),
      createEvent({
        type: 'commit',
        repo: 'j0nathan-ll0yd/j0nathan-ll0yd.github.io',
        title: 'Optimize Astro island hydration with visible intersection observer strategy',
        date: isoDate(),
        hash: 'i2j3k4l',
        number: 93,
        additions: 156,
        deletions: 72
      }),
      createEvent({
        type: 'pr_merged',
        repo: 'j0nathan-ll0yd/mantle',
        title: 'fix(export): prevent silent session drops during long-running health exports',
        date: isoDate(),
        hash: 'j3k4l5m',
        number: 289,
        additions: 98,
        deletions: 31
      }),
      createEvent({
        type: 'commit',
        repo: 'j0nathan-ll0yd/design-system-Lifegames',
        title: 'Generate Swift Package targets for all widget schemas with codegen pipeline',
        date: isoDate(),
        hash: 'k4l5m6n',
        number: 48,
        additions: 1240,
        deletions: 340
      }),
      createEvent({
        type: 'commit',
        repo: 'j0nathan-ll0yd/mantle',
        title: 'Add CloudFront cache invalidation after successful S3 export for all domains',
        date: isoDate(),
        hash: 'l5m6n7o',
        number: 315,
        additions: 267,
        deletions: 89
      })
    ]
  })
}
