import type {SchemaDerived} from '@lifegames/schemas'

// The SchemaDerived brand (see @lifegames/schemas branded.ts) is a compile-time-only
// `unique symbol` with no runtime representation, so a branded value cannot be
// produced by an object literal — it can only be asserted at a trusted authoring
// boundary. `authored` is that single boundary for the post-adapter display
// fixtures: the payload is structurally type-checked against the UNBRANDED shape
// (missing and excess properties are caught here), then the brand is applied via
// one localized assertion. Individual fixtures call `authored<T>({...})` and never
// cast themselves.
type Unbranded<T> = T extends SchemaDerived<infer U> ? U : T

export function authored<T>(value: Unbranded<T>): T {
  return value as T
}
