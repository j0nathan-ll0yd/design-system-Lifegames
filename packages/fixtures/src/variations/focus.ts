import type { FocusExport } from '@lifegames/portal-contract/schemas';
import { createFocusFixture } from '../factories/focus';

export const focusVariations: Record<string, FocusExport> = {
  baseline: createFocusFixture({ currentFocus: 'Work' }),

  empty: createFocusFixture({ currentFocus: '' }),

  dnd: createFocusFixture({ currentFocus: 'Do Not Disturb' }),

  personal: createFocusFixture({ currentFocus: 'Personal' }),

  // `full` intentionally equals `dnd` — FocusExport is a scalar single-field
  // domain (generatedAt + currentFocus, both required non-nullable), so the
  // maximally-populated case is the longest valid Focus Mode string.
  full: createFocusFixture({ currentFocus: 'Do Not Disturb' }),
};
