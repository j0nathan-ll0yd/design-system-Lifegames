// Package-internal constants for the normalized fixture variation triad.
// NOT exported from src/index.ts — consumed only by tests and scripts.

export const RESERVED_VARIATIONS = ['empty', 'baseline', 'full'] as const;

export type ReservedVariation = (typeof RESERVED_VARIATIONS)[number];

export const VARIATION_EXCEPTIONS: Record<
  string,
  { domain: string; variation: ReservedVariation; rationale: string }[]
> = {};

export const WALKER_EXCEPTIONS: Record<string, string> = {
  'health.quantities':
    'additionalProperties schema — not walker-enumerable; covered by vitest factory-key assertion',
  focus:
    'all properties required and non-nullable — nothing for the walker to verify; covered by Ajv + manual review',
};
