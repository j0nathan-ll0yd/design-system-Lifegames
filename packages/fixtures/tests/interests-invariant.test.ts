import { describe, it, expect } from 'vitest';
import { profilePostAdapter } from '../src/post-adapter/profile';
import { identity } from '@lifegames/copy';

// The bio terminal simulates `ls -m interests/`, which sorts alphabetically. This
// binds the terminal's interests to the canonical @lifegames/copy list
// (identity.person.interests — curated order, feeds llms-full.txt via
// llm-content/view.ts) so the two cannot silently drift: the terminal MUST be
// exactly the copy interests, sorted. The divergence in ORDER is intentional
// (copy stays curated for the LLM; the terminal is sorted because `ls` sorts);
// the divergence in MEMBERSHIP is a bug, which this test forbids.

const copyInterests = identity.person.interests;

/** The interests rendered under `$ ls -m interests/` in a profile variation. */
function terminalInterests(variation: 'baseline' | 'full'): string[] {
  const lines = profilePostAdapter[variation].terminalLines;
  const promptIdx = lines.findIndex((l) => l.type === 'prompt' && l.text === '$ ls -m interests/');
  expect(
    promptIdx,
    `${variation}: expected a '$ ls -m interests/' prompt line`,
  ).toBeGreaterThanOrEqual(0);

  const output = lines[promptIdx + 1];
  if (!output || output.type !== 'output') {
    throw new Error(`${variation}: expected an output line after the interests prompt`);
  }
  // Output text is `→ a, b, c` — strip the arrow, split on commas, trim.
  return (output.text ?? '')
    .replace(/^→\s*/, '')
    .split(',')
    .map((s) => s.trim());
}

describe('bio-terminal interests ⟷ @lifegames/copy invariant', () => {
  // `empty` is cursor-only (no interests line) — only baseline + full carry it.
  for (const variation of ['baseline', 'full'] as const) {
    it(`${variation}: terminal interests are the copy interests, sorted`, () => {
      const shown = terminalInterests(variation);
      // Same membership as the canonical list (catches an add/remove either side).
      expect(new Set(shown)).toEqual(new Set(copyInterests));
      // Exactly alphabetical (catches mis-sorting — `ls` always sorts).
      expect(shown).toEqual([...copyInterests].sort());
    });
  }
});
