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
const copySkills = identity.person.skills;

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

/** The skills rendered under `$ printenv STACK` in a profile variation. */
function terminalSkills(variation: 'baseline' | 'full'): string[] {
  const lines = profilePostAdapter[variation].terminalLines;
  const promptIdx = lines.findIndex((l) => l.type === 'prompt' && l.text === '$ printenv STACK');
  expect(
    promptIdx,
    `${variation}: expected a '$ printenv STACK' prompt line`,
  ).toBeGreaterThanOrEqual(0);

  const output = lines[promptIdx + 1];
  if (!output || output.type !== 'output') {
    throw new Error(`${variation}: expected an output line after the STACK prompt`);
  }
  // `printenv` prints the value verbatim; output is `→ a b c` — space-separated.
  return (output.text ?? '').replace(/^→\s*/, '').split(/\s+/).filter(Boolean);
}

describe('bio-terminal skills ⟷ @lifegames/copy invariant', () => {
  // `printenv STACK` prints the env value verbatim — order-preserving (unlike `ls`),
  // so the baseline terminal skills MUST equal identity.person.skills exactly.
  it('baseline: terminal skills equal the copy skills, in order', () => {
    expect(terminalSkills('baseline')).toEqual([...copySkills]);
  });
  // `full` is an intentional max-population superset (adds python, rust) — it must
  // still contain every canonical skill.
  it('full: terminal skills are a superset of the copy skills', () => {
    const shown = terminalSkills('full');
    for (const skill of copySkills) {
      expect(shown, `full terminal skills should include ${skill}`).toContain(skill);
    }
  });
});
