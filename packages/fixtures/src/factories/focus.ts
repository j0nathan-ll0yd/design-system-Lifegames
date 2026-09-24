import {HIDING_FOCUS_MODES} from '@j0nathan-ll0yd/portal-contract/constants'
import type {FocusExport} from '@j0nathan-ll0yd/portal-contract/schemas'
import {isoTimestamp} from './helpers'

/**
 * Days before the reference instant used for an auto-supplied `hidingSince`. A
 * hiding mode always started in the past, so the default sits behind `generatedAt`.
 */
const DEFAULT_HIDING_SINCE_DAYS_AGO = 2

/**
 * True when `currentFocus` names a hiding mode. Sourced from the contract's own
 * HIDING_FOCUS_MODES rather than a local string list, so the set cannot drift from
 * the `if`/`then` branch in focus-export.schema.json that consumes it.
 */
function isHidingMode(currentFocus: string): boolean {
  return (HIDING_FOCUS_MODES as readonly string[]).includes(currentFocus)
}

/**
 * portal-contract 2.7.0 makes `hidingSince` conditionally REQUIRED: whenever
 * `currentFocus` names a hiding mode, focus-export.schema.json requires the key.
 * That formalised producer behaviour that already held — LP's
 * src/lambdas/api/focus.post.ts always stamps `hidingSince` when entering a hiding
 * mode — so a hiding-mode payload without it describes a state production cannot
 * emit.
 *
 * The key is therefore supplied automatically for hiding modes, and only for hiding
 * modes: a caller naming 'Work' or 'Do Not Disturb' without a timestamp gets the
 * default instead of an off-contract payload, while a non-hiding focus stays free of
 * a key the producer would not send. An explicit `hidingSince` override always wins.
 */
export function createFocusFixture(overrides?: Partial<FocusExport>): FocusExport {
  const fixture: FocusExport = {generatedAt: isoTimestamp(), currentFocus: 'Work', ...overrides}
  if (isHidingMode(fixture.currentFocus) && fixture.hidingSince === undefined) {
    fixture.hidingSince = isoTimestamp(DEFAULT_HIDING_SINCE_DAYS_AGO)
  }
  return fixture
}
