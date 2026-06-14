import type { GithubStarredReposExport } from '@lifegames/portal-contract/schemas';
import { createStarredReposFixture } from '../factories/starred-repos';
import { isoTimestamp } from '../factories/helpers';

export const starredReposVariations: Record<string, GithubStarredReposExport> = {
  baseline: createStarredReposFixture(),

  // 8 days before the stable reference instant (deterministic; was Date.now()).
  oldTimestamp: createStarredReposFixture({
    generatedAt: isoTimestamp(8),
  }),
};
