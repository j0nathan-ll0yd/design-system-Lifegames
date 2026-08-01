import type {FocusExport} from '@j0nathan-ll0yd/portal-contract/schemas'
import {isoTimestamp} from './helpers'

export function createFocusFixture(overrides?: Partial<FocusExport>): FocusExport {
  return {generatedAt: isoTimestamp(), currentFocus: 'Work', ...overrides}
}
