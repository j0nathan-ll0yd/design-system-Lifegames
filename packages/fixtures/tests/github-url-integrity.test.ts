import {describe, expect, it} from 'vitest'
import {fixtures, rawFixtures} from '../src/index'
import {githubCommitUrl, githubPullUrl, PUBLIC_GITHUB_COMMITS, PUBLIC_GITHUB_PULLS, PUBLIC_GITHUB_REPOSITORIES} from '../src/github-references'

const publicRepositories = new Set<string>(PUBLIC_GITHUB_REPOSITORIES)
const publicCommitTargets = new Map(PUBLIC_GITHUB_COMMITS.map((ref) => [githubCommitUrl(ref), ref]))
const publicPullTargets = new Map(PUBLIC_GITHUB_PULLS.map((ref) => [githubPullUrl(ref), ref]))

describe('GitHub fixture URL integrity', () => {
  it('raw GitHub events only generate verified public commit and pull-request URLs', () => {
    for (const [variation, fixture] of Object.entries(rawFixtures.githubEvents)) {
      for (const event of fixture.events) {
        expect(publicRepositories.has(event.repo), `${variation}: unverified repository ${event.repo}`).toBe(true)

        if (event.type === 'commit') {
          const url = `https://github.com/${event.repo}/commit/${event.hash ?? ''}`
          expect(publicCommitTargets.has(url), `${variation}: fabricated or unverified commit URL ${url}`).toBe(true)
        }
        if (event.type === 'pr_opened' || event.type === 'pr_merged') {
          const url = `https://github.com/${event.repo}/pull/${event.number ?? ''}`
          expect(publicPullTargets.has(url), `${variation}: fabricated or unverified pull-request URL ${url}`).toBe(true)
        }
      }
    }
  })

  it('post-adapter activity URLs match their verified target and display repository', () => {
    for (const [variation, fixture] of Object.entries(fixtures.github)) {
      for (const event of fixture.devActivity) {
        if (event.type === 'commit') {
          const ref = publicCommitTargets.get(event.url)
          expect(ref, `${variation}: fabricated or unverified commit URL ${event.url}`).toBeDefined()
          expect(event.hash, `${variation}: commit hash must match its URL`).toBe(ref?.hash)
          expect(event.repo, `${variation}: commit repository label must match its URL`).toBe(ref?.displayRepository)
        }
        if (event.type === 'pr_opened' || event.type === 'pr_merged') {
          const ref = publicPullTargets.get(event.url)
          expect(ref, `${variation}: fabricated or unverified pull-request URL ${event.url}`).toBeDefined()
          expect(event.number, `${variation}: pull-request number must match its URL`).toBe(ref?.number)
          expect(event.repo, `${variation}: pull-request repository label must match its URL`).toBe(ref?.displayRepository)
        }
      }
    }
  })

  it('starred repository URLs are verified and agree with owner/name fields', () => {
    for (const [variation, fixture] of Object.entries(rawFixtures.starredRepos)) {
      for (const repo of fixture.repos) {
        const fullName = `${repo.ownerLogin}/${repo.name}`
        expect(publicRepositories.has(fullName), `${variation}: unverified starred repository ${fullName}`).toBe(true)
        expect(repo.ownerHtmlUrl).toBe(`https://github.com/${repo.ownerLogin}`)
        expect(repo.htmlUrl).toBe(`https://github.com/${fullName}`)
      }
    }

    for (const [variation, repos] of Object.entries(fixtures.starredRepos)) {
      for (const repo of repos) {
        const fullName = `${repo.owner}/${repo.name}`
        expect(publicRepositories.has(fullName), `${variation}: unverified adapted starred repository ${fullName}`).toBe(true)
        expect(repo.url).toBe(`https://github.com/${fullName}`)
      }
    }
  })
})
