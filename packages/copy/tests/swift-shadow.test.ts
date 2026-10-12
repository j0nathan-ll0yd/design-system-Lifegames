// The copy build's Swift shadowing guard (atlas decision 0160, verifier L-4):
// the reserved names come from Sources/* and Package.swift, a clash fails, and
// today's generated copy structs clash with nothing. swift-shadow-build.test.ts
// runs the real build against mutated scratch trees.
import {readdirSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import {describe, expect, it} from 'vitest'
import {
  copyVisibleModules,
  designSystemPublicSwiftTypes,
  reservedSwiftNames,
  stripSwiftCommentsAndStrings,
  swiftShadowClashes
} from '../scripts/swift-shadow'

const SOURCES = join(__dirname, '..', '..', '..', 'Sources')
const PACKAGE_SWIFT = join(__dirname, '..', '..', '..', 'Package.swift')
const declared = designSystemPublicSwiftTypes(SOURCES)
const reserved = reservedSwiftNames(SOURCES, PACKAGE_SWIFT)

function generatedCopyStructs(): {name: string; namespace: string}[] {
  const dir = join(SOURCES, 'LifegamesCopy')
  return readdirSync(dir).filter((f) => f.endsWith('.generated.swift')).flatMap((f) =>
    [...readFileSync(join(dir, f), 'utf-8').matchAll(/^public struct ([A-Za-z0-9_]+)/gm)].map((m) => ({name: m[1]!, namespace: f}))
  )
}

describe('Swift shadowing guard', () => {
  it('derives the declared set from the public types in Sources/*, excluding LifegamesCopy', () => {
    expect(declared.get('WidgetState')).toBe('LifegamesComponents')
    expect(declared.size).toBeGreaterThan(20)
    expect([...declared.values()]).not.toContain('LifegamesCopy')
  })

  it('reads the modules that see LifegamesCopy from the target graph in Package.swift', () => {
    const visible = copyVisibleModules(readFileSync(PACKAGE_SWIFT, 'utf-8'))
    // Direct (ComponentsCore, Widgets) and transitive (Components, through ComponentsCore) dependents.
    expect(visible).toContain('LifegamesComponentsCore')
    expect(visible).toContain('LifegamesWidgets')
    expect(visible).toContain('LifegamesComponents')
    // Tokens and Schemas never see the copy, and the copy is not its own dependent.
    expect(visible).not.toContain('LifegamesTokens')
    expect(visible).not.toContain('LifegamesSchemas')
    expect(visible).not.toContain('LifegamesCopy')
  })

  it('reserves the framework types the copy-visible modules reference unqualified', () => {
    for (const name of ['Color', 'Text', 'View', 'Image', 'Font']) {
      expect(reserved.get(name), name).toMatch(new RegExp(`^the type ${name} referenced unqualified in Lifegames\\w+ \\(`))
    }
    expect(reserved.get('WidgetState')).toBe('the public type LifegamesComponents.WidgetState')
  })

  it('a word in a comment or a string literal names no type', () => {
    const code = stripSwiftCommentsAndStrings('let a = "Recovery Day" // Nothing\n/* Hidden */ let b: Color = .red\nlet c = """\nWords Here\n"""')
    expect(code).not.toMatch(/Recovery|Nothing|Hidden|Words/)
    expect(code).toContain('Color')
  })

  it('a copy struct named like a reserved name is a clash, with the reason', () => {
    const clashes = swiftShadowClashes([{name: 'WidgetState', namespace: 'widgets'}, {name: 'Color', namespace: 'widgets'}, {
      name: 'WidgetStateCopy',
      namespace: 'widgets'
    }], reserved)
    expect(clashes.map((c) => c.name)).toEqual(['WidgetState', 'Color'])
    expect(clashes[0]!.reason).toBe('the public type LifegamesComponents.WidgetState')
  })

  it('the committed generated copy structs shadow no public design-system type', () => {
    expect(swiftShadowClashes(generatedCopyStructs(), reserved)).toEqual([])
  })
})
