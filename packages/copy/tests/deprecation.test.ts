// The deprecation guard of the copy build (DEPRECATION.md, "Copy Keys"). A key
// marked `deprecated: true` in a rich schema must name its replacement (a live,
// undeprecated leaf of the same namespace) or state that there is none. The
// build exits 1 on any problem this returns.
import {describe, expect, it} from 'vitest'
import {spawnSync} from 'node:child_process'
import {cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {deprecationProblems} from '../scripts/deprecation'

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..')
const REPLACED = 'Deprecated: use `identity.navigation.backLink` instead. Removed in the next major release.'

const leaf = {$ref: '#/$defs/CopyString'}
const DEFS = {CopyString: {properties: {value: {type: 'string'}, _meta: {}}}, CopyLink: {properties: {value: {type: 'object'}, _meta: {}}}}
const schema = (backLink: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  type: 'object',
  $defs: DEFS,
  properties: {
    navigation: {type: 'object', properties: {backLink: leaf}},
    privacy: {type: 'object', ...extra, properties: {backLink: {...leaf, ...backLink}, link: {$ref: '#/$defs/CopyLink'}}}
  }
})

describe('copy deprecation guard', () => {
  it('a deprecated key that names a live replacement passes', () => {
    expect(deprecationProblems(schema({deprecated: true, description: REPLACED}), 'identity')).toEqual([])
  })

  it('a deprecated key with no replacement passes when it starts by saying so', () => {
    expect(deprecationProblems(schema({deprecated: true, description: 'Deprecated: no replacement. Removed in the next major release.'}), 'identity'))
      .toEqual([])
  })

  it.each([
    ['no description', {deprecated: true}],
    ['a loose "no replacement"', {deprecated: true, description: 'No replacement yet, use identity.navigation.backLink.'}],
    ['a replacement not at the start', {deprecated: true, description: 'Old. Deprecated: use `identity.navigation.backLink` instead.'}]
  ])('fails %s', (_name, backLink) => {
    expect(deprecationProblems(schema(backLink), 'identity')).toEqual([
      'identity.privacy.backLink: the description must start "Deprecated: use `<key>` instead." or "Deprecated: no replacement."'
    ])
  })

  it('fails a replacement that names no leaf', () => {
    const s = schema({deprecated: true, description: 'Deprecated: use `identity.navigation.home` instead.'})
    expect(deprecationProblems(s, 'identity')).toEqual(['identity.privacy.backLink: replacement identity.navigation.home names no leaf in identity'])
  })

  it('fails a replacement that names a group', () => {
    const s = schema({deprecated: true, description: 'Deprecated: use `identity.navigation` instead.'})
    expect(deprecationProblems(s, 'identity')).toEqual(['identity.privacy.backLink: replacement identity.navigation names no leaf in identity'])
  })

  it('fails a replacement in another namespace', () => {
    const s = schema({deprecated: true, description: 'Deprecated: use `widgets.navigation.backLink` instead.'})
    expect(deprecationProblems(s, 'identity')).toEqual(['identity.privacy.backLink: replacement widgets.navigation.backLink names no leaf in identity'])
  })

  it('fails a replacement that is itself deprecated', () => {
    const s = schema({deprecated: true, description: 'Deprecated: use `identity.privacy.backLink` instead.'})
    expect(deprecationProblems(s, 'identity')).toEqual(['identity.privacy.backLink: replacement identity.privacy.backLink is itself deprecated'])
  })

  it('fails a deprecated flag that is not the boolean true', () => {
    expect(deprecationProblems(schema({deprecated: 'true', description: REPLACED}), 'identity')).toEqual([
      'identity.privacy.backLink: deprecated must be the boolean true, not "true"'
    ])
  })

  it('fails a deprecated group', () => {
    expect(deprecationProblems(schema({}, {deprecated: true}), 'identity')).toEqual([
      'identity.privacy: a group cannot be deprecated; deprecate each of its leaves'
    ])
  })

  it('fails a deprecated object-valued leaf', () => {
    const s = schema({})
    ;(s.properties.privacy.properties as Record<string, unknown>).link = {$ref: '#/$defs/CopyLink', deprecated: true, description: REPLACED}
    expect(deprecationProblems(s, 'identity')).toEqual([
      'identity.privacy.link: an object-valued leaf cannot be deprecated; its flat $ref drops the annotation in Zod and Swift'
    ])
  })

  it('every shipped schema passes', () => {
    const files = readdirSync(join(PKG, 'schema')).filter((f) => f.endsWith('.schema.json'))
    expect(files.length).toBeGreaterThan(0)
    for (const f of files) {
      const rich = JSON.parse(readFileSync(join(PKG, 'schema', f), 'utf8'))
      expect(deprecationProblems(rich, f.replace('.schema.json', '')), f).toEqual([])
    }
  })
})

// The build itself calls the guard: run it from a scratch copy of the package
// whose identity schema names no replacement. identity is the first namespace,
// and the guard runs before any artifact is written.
describe('copy build: the deprecation guard is wired in', () => {
  it('exits 1 and names the key when a deprecation names no replacement', () => {
    const root = mkdtempSync(join(tmpdir(), 'copy-deprecation-'))
    try {
      const pkg = join(root, 'packages', 'copy')
      for (const entry of ['package.json', 'scripts', 'schema', 'src']) {
        cpSync(join(PKG, entry), join(pkg, entry), {recursive: true})
      }
      symlinkSync(join(PKG, 'node_modules'), join(pkg, 'node_modules'))
      const schemaPath = join(pkg, 'schema', 'identity.schema.json')
      writeFileSync(schemaPath, readFileSync(schemaPath, 'utf8').replace(REPLACED, 'Deprecated.'))
      const run = spawnSync(join(PKG, 'node_modules', '.bin', 'tsx'), [join(pkg, 'scripts', 'build.ts')], {encoding: 'utf8'})
      expect(run.status).toBe(1)
      expect(run.stderr).toContain('copy:build — DEPRECATION policy FAILED (identity):')
      expect(run.stderr).toContain('identity.privacy.backLink: the description must start')
    } finally {
      rmSync(root, {recursive: true, force: true})
    }
  }, 60_000)
})
