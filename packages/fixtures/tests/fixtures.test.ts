import { describe, it, expect } from 'vitest';
import { fixtures, rawFixtures, getDashboardFixture } from '../src/index';
import type { AdaptedStarredRepo } from '@lifegames/web/runtime/adapters';

// starredRepos has no standalone Ajv schema (it is AdaptedStarredRepo[]), so its
// shape + determinism are asserted here rather than in scripts/validate.ts.

describe('post-adapter fixtures barrel', () => {
  it('exposes baseline + empty for every post-adapter domain', () => {
    for (const [domain, variations] of Object.entries(fixtures)) {
      expect(Object.keys(variations), `${domain} variations`).toEqual(
        expect.arrayContaining(['baseline', 'empty']),
      );
    }
  });

  it('getDashboardFixture(baseline) returns all seven domains', () => {
    const d = getDashboardFixture('baseline');
    expect(Object.keys(d).sort()).toEqual(
      ['books', 'github', 'health', 'profile', 'reading', 'starredRepos', 'system'].sort(),
    );
  });

  it('getDashboardFixture defaults to baseline', () => {
    expect(getDashboardFixture()).toEqual(getDashboardFixture('baseline'));
  });
});

describe('starredRepos post-adapter (adapter-derived, deterministic clock)', () => {
  it('baseline caps at five repos and is fully shaped', () => {
    const repos = fixtures.starredRepos.baseline;
    expect(repos.length).toBe(5);
    for (const r of repos) {
      expect(r).toMatchObject<Partial<AdaptedStarredRepo>>({
        owner: expect.any(String),
        name: expect.any(String),
        url: expect.stringContaining('https://github.com/'),
        stars: expect.any(Number),
        language: expect.any(String),
        languageColor: expect.stringMatching(/^#/),
        starredAt: expect.any(String),
      });
    }
  });

  it('produces deterministic relative-time strings via the stable injected clock', () => {
    // 2 days, 5 days, 9 days, 16 days, 23 days before the fixed STABLE_NOW.
    expect(fixtures.starredRepos.baseline.map((r) => r.starredAt)).toEqual([
      '2 days ago',
      '5 days ago',
      '1 week ago',
      '2 weeks ago',
      '3 weeks ago',
    ]);
  });

  it('empty starred list is an empty array', () => {
    expect(fixtures.starredRepos.empty).toEqual([]);
  });
});

describe('raw fixtures barrel', () => {
  it('exposes the ten raw domains', () => {
    expect(Object.keys(rawFixtures).sort()).toEqual(
      [
        'articles',
        'books',
        'focus',
        'githubEvents',
        'health',
        'location',
        'sleep',
        'starredRepos',
        'theatreReviews',
        'workouts',
      ].sort(),
    );
  });

  it('every raw domain has a baseline variation', () => {
    for (const [domain, variations] of Object.entries(rawFixtures)) {
      expect(Object.keys(variations), `${domain} raw variations`).toContain('baseline');
    }
  });
});
