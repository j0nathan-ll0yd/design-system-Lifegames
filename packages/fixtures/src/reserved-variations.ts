// Package-internal constants for the normalized fixture variation triad.
// NOT exported from src/index.ts — consumed only by tests and scripts.

export const RESERVED_VARIATIONS = ['empty', 'baseline', 'full'] as const

export type ReservedVariation = (typeof RESERVED_VARIATIONS)[number]

export const VARIATION_EXCEPTIONS: Record<
  string,
  {domain: string; variation: ReservedVariation; rationale: string}[]
> = {}

// `focus` was excepted here while every one of its properties was required and
// non-nullable. portal-contract 2.x added the OPTIONAL `hidingSince`, so the walker
// now has an optional-key check to make and the exception is gone.
export const WALKER_EXCEPTIONS: Record<string, string> = {
  'health.quantities': 'additionalProperties schema — not walker-enumerable; covered by vitest factory-key assertion'
}
