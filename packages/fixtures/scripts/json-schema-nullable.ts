// Nullable-schema helpers for check-full-coverage.ts, split out so the walker's
// nullable detection has a known-answer test (tests/json-schema-nullable.test.ts)
// independent of the published raw schemas' current form.

export interface JsonSchema {
  type?: string | string[]
  properties?: Record<string, JsonSchema>
  required?: string[]
  additionalProperties?: boolean | JsonSchema
  items?: JsonSchema
  anyOf?: JsonSchema[]
  oneOf?: JsonSchema[]
  allOf?: JsonSchema[]
  const?: unknown
}

/**
 * Returns true when schema is a two-member nullable: anyOf:[T, {type:'null'}] or
 * type:[T, 'null']. portal-contract 2.8.0 (zod 4.6.7) emits the type-array form for
 * a nullable primitive; earlier versions emitted the anyOf form. Both must count, or
 * condition (b) and the recursion go silent when the upstream generator changes form.
 */
export function isNullable(schema: JsonSchema): boolean {
  if (Array.isArray(schema.type)) {
    return schema.type.length === 2 && schema.type.includes('null')
  }
  if (!Array.isArray(schema.anyOf) || schema.anyOf.length !== 2) {
    return false
  }
  return schema.anyOf.some((s) => s.type === 'null')
}

/**
 * Unwraps a nullable to its non-null schema T. Returns the schema unchanged for any
 * other pattern.
 */
export function resolveNullable(schema: JsonSchema): JsonSchema {
  if (!isNullable(schema)) {
    return schema
  }
  if (Array.isArray(schema.type)) {
    return {...schema, type: schema.type.find((t) => t !== 'null')}
  }
  const nonNull = schema.anyOf!.find((s) => s.type !== 'null')
  return nonNull ?? schema
}
