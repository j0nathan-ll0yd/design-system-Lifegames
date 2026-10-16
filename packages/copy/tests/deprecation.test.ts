// The deprecation guard of the copy build (DEPRECATION.md, "Copy keys"). A key
// marked `deprecated: true` in a rich schema must name its replacement — a leaf
// of the same namespace that exists — or state that there is none. The build
// throws on any problem this returns.
import {describe, expect, it} from 'vitest'
import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {deprecatedKeys, deprecationProblems} from '../scripts/deprecation'

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..')
const NAMESPACES = ['identity', 'widgets', 'a11y', 'app', 'permissions', 'profile', 'errors', 'llm']

const leaf = {$ref: '#/$defs/CopyString'}
const schema = (backLink: Record<string, unknown>) => ({
  type: 'object',
  properties: {navigation: {type: 'object', properties: {backLink: leaf}}, privacy: {type: 'object', properties: {backLink: {...leaf, ...backLink}}}}
})

describe('copy deprecation guard', () => {
  it('a deprecated key that names a live replacement passes', () => {
    const s = schema({deprecated: true, description: 'Deprecated: use `identity.navigation.backLink` instead. Removed in the next major release.'})
    expect(deprecationProblems(s, 'identity')).toEqual([])
    expect(deprecatedKeys(s, 'identity')).toEqual([{key: 'identity.privacy.backLink', replacedBy: 'identity.navigation.backLink'}])
  })

  it('a deprecated key with no replacement passes when it says so', () => {
    const s = schema({deprecated: true, description: 'Deprecated: no replacement. Removed in the next major release.'})
    expect(deprecationProblems(s, 'identity')).toEqual([])
    expect(deprecatedKeys(s, 'identity')).toEqual([{key: 'identity.privacy.backLink', replacedBy: null}])
  })

  it('fails a deprecated key with no description', () => {
    expect(deprecationProblems(schema({deprecated: true}), 'identity')).toEqual([
      'identity.privacy.backLink: deprecated with no description; name the replacement (use `<key>` instead) or state "no replacement"'
    ])
  })

  it('fails a replacement that names no leaf', () => {
    const s = schema({deprecated: true, description: 'Deprecated: use `identity.navigation.home` instead.'})
    expect(deprecationProblems(s, 'identity')).toEqual(['identity.privacy.backLink: replacement identity.navigation.home names no leaf in identity'])
  })

  it('fails a replacement in another namespace', () => {
    const s = schema({deprecated: true, description: 'Deprecated: use `widgets.navigation.backLink` instead.'})
    expect(deprecationProblems(s, 'identity')).toEqual(['identity.privacy.backLink: replacement widgets.navigation.backLink names no leaf in identity'])
  })

  it('fails a replacement that is itself deprecated', () => {
    const s = schema({deprecated: true, description: 'Deprecated: use `identity.privacy.backLink` instead.'})
    expect(deprecationProblems(s, 'identity')).toEqual(['identity.privacy.backLink: replacement identity.privacy.backLink is itself deprecated'])
  })

  it('every shipped schema passes', () => {
    for (const ns of NAMESPACES) {
      const rich = JSON.parse(readFileSync(join(PKG, 'schema', `${ns}.schema.json`), 'utf8'))
      expect(deprecationProblems(rich, ns), ns).toEqual([])
    }
  })
})
