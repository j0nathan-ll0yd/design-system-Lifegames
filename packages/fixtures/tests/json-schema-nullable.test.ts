import {readdirSync, readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {dirname, join} from 'node:path'
import {describe, expect, it} from 'vitest'
import {isNullable, type JsonSchema, resolveNullable} from '../scripts/json-schema-nullable'

// check-full-coverage.ts counts a required nullable field only when isNullable
// recognizes it. portal-contract 2.8.0 moved from anyOf:[T, {type:'null'}] to
// type:[T, 'null'], and the anyOf-only walker went silent on 4 of 9 domains. These
// cases pin both forms; the sweep pins every null-admitting node actually shipped.

describe('isNullable / resolveNullable', () => {
  it('recognizes the anyOf null-branch form and unwraps it to the non-null branch', () => {
    const schema: JsonSchema = {anyOf: [{type: 'string'}, {type: 'null'}]}
    expect(isNullable(schema)).toBe(true)
    expect(resolveNullable(schema)).toEqual({type: 'string'})
  })

  it('recognizes the anyOf form with the null branch first', () => {
    const schema: JsonSchema = {anyOf: [{type: 'null'}, {type: 'number'}]}
    expect(isNullable(schema)).toBe(true)
    expect(resolveNullable(schema)).toEqual({type: 'number'})
  })

  it('recognizes the type-array form and unwraps it to the non-null type', () => {
    const schema: JsonSchema = {type: ['number', 'null']}
    expect(isNullable(schema)).toBe(true)
    expect(resolveNullable(schema)).toEqual({type: 'number'})
  })

  it('keeps sibling keywords when unwrapping a nullable object in type-array form', () => {
    const schema: JsonSchema = {type: ['object', 'null'], properties: {a: {type: 'string'}}, required: ['a']}
    expect(resolveNullable(schema)).toEqual({type: 'object', properties: {a: {type: 'string'}}, required: ['a']})
  })

  it('rejects non-nullable shapes and returns them unchanged', () => {
    const cases: JsonSchema[] = [
      {type: 'string'},
      {type: ['string', 'number']},
      {type: ['string', 'number', 'null']},
      {anyOf: [{type: 'string'}, {type: 'number'}]},
      {anyOf: [{type: 'string'}, {type: 'number'}, {type: 'null'}]},
      {}
    ]
    for (const schema of cases) {
      expect(isNullable(schema)).toBe(false)
      expect(resolveNullable(schema)).toBe(schema)
    }
  })
})

describe('installed portal-contract raw schemas', () => {
  const require = createRequire(import.meta.url)
  const rawDir = dirname(require.resolve('@j0nathan-ll0yd/portal-contract/raw-schemas/index.json'))
  const files = readdirSync(rawDir).filter((f) => f.endsWith('.schema.json'))

  function admitsNullDirectly(node: JsonSchema): boolean {
    const typeAdmits = Array.isArray(node.type) && node.type.includes('null')
    const branchAdmits = [...(node.anyOf ?? []), ...(node.oneOf ?? [])].some((b) => b.type === 'null')
    return typeAdmits || branchAdmits
  }

  function collect(node: unknown, out: JsonSchema[]): void {
    if (Array.isArray(node)) {
      node.forEach((n) => collect(n, out))
      return
    }
    if (node === null || typeof node !== 'object') {
      return
    }
    if (admitsNullDirectly(node as JsonSchema)) {
      out.push(node as JsonSchema)
    }
    Object.values(node).forEach((v) => collect(v, out))
  }

  it('every null-admitting node is a nullable the walker recognizes', () => {
    expect(files.length).toBeGreaterThan(0)
    const nodes: JsonSchema[] = []
    for (const file of files) {
      collect(JSON.parse(readFileSync(join(rawDir, file), 'utf-8')), nodes)
    }
    // Guards against a vacuous sweep: 2.8.0 ships 60 nullable nodes.
    expect(nodes.length).toBeGreaterThan(0)
    expect(nodes.filter((n) => !isNullable(n))).toEqual([])
  })
})
