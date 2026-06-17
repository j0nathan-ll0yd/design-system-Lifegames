// Post-adapter (display-shape) fixture barrel.
//
// These are the SSR-shell fixtures the web's loadDashboardData consumes. Each
// domain maps variation name → display shape typed from `@lifegames/schemas`
// (plus AdaptedStarredRepo[] from @lifegames/web for starredRepos, the one
// adapter-derived domain). The `baseline` variation is the default SSR shell;
// `empty` exercises the no-data path. Visual tests select variations explicitly.
import type {
  Profile,
  System,
  DashboardHealth,
  DashboardGithub,
  DashboardReading,
  DashboardBooks,
} from '@lifegames/schemas';
import type { AdaptedStarredRepo } from '@lifegames/web/runtime/adapters';

import { profilePostAdapter } from './post-adapter/profile';
import { healthPostAdapter } from './post-adapter/health';
import { githubPostAdapter } from './post-adapter/github';
import { readingPostAdapter } from './post-adapter/reading';
import { booksPostAdapter } from './post-adapter/books';
import { systemPostAdapter } from './post-adapter/system';
import { starredReposPostAdapter } from './post-adapter/starredRepos';

/**
 * The post-adapter SSR shell, keyed by domain then variation name. Mirrors the
 * web's `DashboardData` per-domain shapes. Add named variations per domain as
 * needed (baseline + empty + full exist for every domain today).
 */
export const fixtures = {
  profile: profilePostAdapter,
  health: healthPostAdapter,
  github: githubPostAdapter,
  reading: readingPostAdapter,
  books: booksPostAdapter,
  system: systemPostAdapter,
  starredRepos: starredReposPostAdapter,
} as const;

/** Variation keys available for every domain (empty, baseline, full — the normalized triad). */
export type FixtureVariation = keyof typeof profilePostAdapter;

/**
 * The post-adapter dashboard payload for a single variation — the exact shape the
 * web's `loadDashboardData()` returns. Phase B's shim composes this from `fixtures`.
 */
export interface DashboardFixture {
  profile: Profile;
  health: DashboardHealth;
  github: DashboardGithub;
  reading: DashboardReading;
  books: DashboardBooks;
  system: System;
  starredRepos: AdaptedStarredRepo[];
}

/**
 * Assemble the full post-adapter dashboard payload for a named variation.
 * Defaults to `baseline` (the representative SSR shell). Phase B calls this from
 * loadDashboardData() with `process.env.FIXTURE_VARIATION ?? 'baseline'`.
 */
export function getDashboardFixture(variation: FixtureVariation = 'baseline'): DashboardFixture {
  return {
    profile: fixtures.profile[variation],
    health: fixtures.health[variation],
    github: fixtures.github[variation],
    reading: fixtures.reading[variation],
    books: fixtures.books[variation],
    system: fixtures.system[variation],
    starredRepos: fixtures.starredRepos[variation],
  };
}

export {
  profilePostAdapter,
  healthPostAdapter,
  githubPostAdapter,
  readingPostAdapter,
  booksPostAdapter,
  systemPostAdapter,
  starredReposPostAdapter,
};
