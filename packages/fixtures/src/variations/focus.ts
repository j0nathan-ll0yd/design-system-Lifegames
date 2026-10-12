import type {FocusExport} from '@j0nathan-ll0yd/portal-contract/schemas'
import {createFocusFixture} from '../factories/focus'
import {isoTimestamp} from '../factories/helpers'

// portal-contract 2.7.0 makes `hidingSince` conditionally REQUIRED, not optional:
// focus-export.schema.json carries an `if`/`then` that requires the key whenever
// `currentFocus` names a hiding mode (HIDING_FOCUS_MODES — 'Work' or 'Do Not
// Disturb'). Every hiding-mode variation below therefore carries it, each at a
// distinct offset so the three stay distinguishable on disk; the non-hiding
// variations ('' and 'Personal') must NOT carry it, because the producer only stamps
// it on entering a hiding mode. See the factory for the producer citation.
// SSR known answer (decision 0160): a NON-hiding mode, so the focus widget is visible and
// the label is the rendered known answer. No hidingSince (producer stamps it only for
// hiding modes).
export const ssrKnownAnswer: FocusExport = createFocusFixture({currentFocus: 'Reading Time Kappa-7731'})

export const focusVariations: Record<string, FocusExport> = {
  ssrKnownAnswer,

  baseline: createFocusFixture({currentFocus: 'Work', hidingSince: isoTimestamp(1)}),

  empty: createFocusFixture({currentFocus: ''}),

  dnd: createFocusFixture({currentFocus: 'Do Not Disturb', hidingSince: isoTimestamp(3)}),

  personal: createFocusFixture({currentFocus: 'Personal'}),

  // `full` is the maximally-populated case: every key in the schema present, which
  // for this domain means a hiding mode that started before `generatedAt`.
  full: createFocusFixture({currentFocus: 'Do Not Disturb', hidingSince: isoTimestamp(2)})
}
