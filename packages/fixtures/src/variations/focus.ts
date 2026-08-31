import type {FocusExport} from '@j0nathan-ll0yd/portal-contract/schemas'
import {createFocusFixture} from '../factories/focus'
import {isoTimestamp} from '../factories/helpers'

export const focusVariations: Record<string, FocusExport> = {
  baseline: createFocusFixture({currentFocus: 'Work'}),

  empty: createFocusFixture({currentFocus: ''}),

  dnd: createFocusFixture({currentFocus: 'Do Not Disturb'}),

  personal: createFocusFixture({currentFocus: 'Personal'}),

  // `full` is `dnd` plus the optional `hidingSince` (portal-contract 2.x): the
  // producer emits that key only while the current focus is a hiding mode, and
  // 'Do Not Disturb' is one, so the maximally-populated case is a hiding mode that
  // started before `generatedAt`.
  full: createFocusFixture({currentFocus: 'Do Not Disturb', hidingSince: isoTimestamp(2)})
}
