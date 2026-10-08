// The copy build's Swift shadowing guard (atlas decision 0160, verifier L-4):
// the reserved names come from Sources/*, a clash fails, and today's generated
// copy structs clash with nothing.
import {readdirSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import {describe, expect, it} from 'vitest'
import {designSystemPublicSwiftTypes, swiftShadowClashes} from '../scripts/swift-shadow'

const SOURCES = join(__dirname, '..', '..', '..', 'Sources')
const reserved = designSystemPublicSwiftTypes(SOURCES)

function generatedCopyStructs(): {name: string; namespace: string}[] {
  const dir = join(SOURCES, 'LifegamesCopy')
  return readdirSync(dir).filter((f) => f.endsWith('.generated.swift')).flatMap((f) =>
    [...readFileSync(join(dir, f), 'utf-8').matchAll(/^public struct ([A-Za-z0-9_]+)/gm)].map((m) => ({name: m[1]!, namespace: f}))
  )
}

describe('Swift shadowing guard', () => {
  it('derives the reserved set from the public types in Sources/*, excluding LifegamesCopy', () => {
    expect(reserved.get('WidgetState')).toBe('LifegamesComponents')
    expect(reserved.size).toBeGreaterThan(20)
    const copyOwn = generatedCopyStructs().map((s) => s.name)
    expect(copyOwn.filter((n) => reserved.get(n) === 'LifegamesCopy')).toEqual([])
  })

  it('a copy struct named like a public design-system type is a clash', () => {
    const clashes = swiftShadowClashes([{name: 'WidgetState', namespace: 'widgets'}, {name: 'WidgetStateCopy', namespace: 'widgets'}], reserved)
    expect(clashes).toEqual([{name: 'WidgetState', namespace: 'widgets', module: 'LifegamesComponents'}])
  })

  it('the committed generated copy structs shadow no public design-system type', () => {
    expect(swiftShadowClashes(generatedCopyStructs(), reserved)).toEqual([])
  })
})
