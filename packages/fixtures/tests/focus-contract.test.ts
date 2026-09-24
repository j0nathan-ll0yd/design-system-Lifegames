import {createRequire} from 'node:module'
import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {Ajv, type ValidateFunction} from 'ajv'
import addFormats from 'ajv-formats'
import {describe, expect, it} from 'vitest'
import {HIDING_FOCUS_MODES} from '@j0nathan-ll0yd/portal-contract/constants'
import type {FocusExport} from '@j0nathan-ll0yd/portal-contract/schemas'
import {createFocusFixture} from '../src/factories/focus'
import {focusVariations} from '../src/variations/focus'

/**
 * portal-contract 2.7.0 made `hidingSince` conditionally REQUIRED in
 * focus-export.schema.json: an `if`/`then` requires the key whenever `currentFocus`
 * names a hiding mode ('Work' or 'Do Not Disturb').
 *
 * @j0nathan-ll0yd/fixtures@1.3.4 shipped `baseline` ('Work') and `dnd` ('Do Not
 * Disturb') WITHOUT the key. Under 2.7.0 those payloads fail to decode, and in
 * j0nathan-ll0yd.github.io a failed focus decode drives `hiding` false, so the
 * privacy overlay never renders — a privacy control silently defeated by a stale
 * fixture. `scripts/validate.ts` catches it at build time; this suite pins it as a
 * test so the class cannot return unnoticed.
 *
 * The REJECT side is the load-bearing half. It asserts the old shape is refused,
 * which fails both if the schema is ever loosened and if the portal-contract
 * dependency regresses below 2.7.0 — behaviour the `^2.5.0` manifest range cannot
 * express on its own.
 */

const require = createRequire(import.meta.url)
const RAW_SCHEMAS_DIR = dirname(require.resolve('@j0nathan-ll0yd/portal-contract/raw-schemas/index.json'))
const FOCUS_SCHEMA_PATH = join(RAW_SCHEMAS_DIR, 'focus-export.schema.json')

const HERE = dirname(fileURLToPath(import.meta.url))
const GENERATED_FOCUS_DIR = resolve(HERE, '..', 'src', 'generated', 'focus')

const ajv = new Ajv({strict: false, allErrors: true, allowUnionTypes: true})
addFormats(ajv)
const validate: ValidateFunction = ajv.compile(JSON.parse(readFileSync(FOCUS_SCHEMA_PATH, 'utf-8')) as object)

function errorsFor(payload: unknown): string {
  return validate(payload) ? '' : ajv.errorsText(validate.errors)
}

function isHidingMode(currentFocus: string): boolean {
  return (HIDING_FOCUS_MODES as readonly string[]).includes(currentFocus)
}

const committedFixtures = existsSync(GENERATED_FOCUS_DIR)
  ? readdirSync(GENERATED_FOCUS_DIR).filter((name) => name.endsWith('.json')).sort().map((name) => ({
    name,
    payload: JSON.parse(readFileSync(join(GENERATED_FOCUS_DIR, name), 'utf-8')) as FocusExport
  }))
  : []

describe('the focus schema this suite compiled actually carries the 2.7.0 conditional', () => {
  it('names both hiding modes', () => {
    expect([...HIDING_FOCUS_MODES].sort()).toEqual(['Do Not Disturb', 'Work'])
  })

  // Guards against a vacuous suite: an if/then-less schema would let every
  // assertion below pass while enforcing nothing.
  it('declares an if/then branch requiring hidingSince', () => {
    const schema = JSON.parse(readFileSync(FOCUS_SCHEMA_PATH, 'utf-8')) as {
      if?: {properties?: {currentFocus?: {enum?: string[]}}}
      then?: {required?: string[]}
    }
    expect(schema.if?.properties?.currentFocus?.enum?.slice().sort()).toEqual(['Do Not Disturb', 'Work'])
    expect(schema.then?.required).toContain('hidingSince')
  })
})

describe('hiding-mode payloads without hidingSince are REJECTED (the 1.3.4 regression)', () => {
  it.each([...HIDING_FOCUS_MODES])('rejects currentFocus "%s" with no hidingSince', (mode: string) => {
    expect(validate({generatedAt: '2026-03-18T12:00:00.000Z', currentFocus: mode})).toBe(false)
    expect(ajv.errorsText(validate.errors)).toContain('hidingSince')
  })

  it('rejects the exact baseline.json bytes shipped by fixtures@1.3.4', () => {
    expect(validate({generatedAt: '2026-03-18T12:00:00.000Z', currentFocus: 'Work'})).toBe(false)
  })

  it('rejects the exact dnd.json bytes shipped by fixtures@1.3.4', () => {
    expect(validate({generatedAt: '2026-03-18T12:00:00.000Z', currentFocus: 'Do Not Disturb'})).toBe(false)
  })
})

describe('every committed generated focus fixture satisfies the published schema', () => {
  it('found the committed fixtures (guards against a vacuous suite)', () => {
    expect(committedFixtures.map((f) => f.name)).toEqual(['baseline.json', 'dnd.json', 'empty.json', 'full.json', 'personal.json'])
  })

  it.each(committedFixtures.map((f) => f.name))('%s validates', (name: string) => {
    const fixture = committedFixtures.find((f) => f.name === name)!
    expect(errorsFor(fixture.payload), `${name} ${JSON.stringify(fixture.payload)}`).toBe('')
  })

  it('carries hidingSince on exactly the hiding-mode fixtures', () => {
    const withKey = committedFixtures.filter((f) => f.payload.hidingSince !== undefined).map((f) => f.name)
    const hidingMode = committedFixtures.filter((f) => isHidingMode(f.payload.currentFocus)).map((f) => f.name)
    expect(withKey).toEqual(hidingMode)
    expect(hidingMode).toEqual(['baseline.json', 'dnd.json', 'full.json'])
  })

  it('stamps hidingSince at or before generatedAt', () => {
    for (const {name, payload} of committedFixtures) {
      if (payload.hidingSince === undefined) {
        continue
      }
      expect(Date.parse(payload.hidingSince), name).toBeLessThanOrEqual(Date.parse(payload.generatedAt))
    }
  })
})

describe('the factory cannot produce an off-contract hiding payload', () => {
  it('validates with no overrides at all', () => {
    expect(errorsFor(createFocusFixture())).toBe('')
  })

  it.each([...HIDING_FOCUS_MODES])('supplies hidingSince for "%s" when the caller omits it', (mode: string) => {
    const fixture = createFocusFixture({currentFocus: mode})
    expect(fixture.hidingSince).toBeDefined()
    expect(errorsFor(fixture)).toBe('')
  })

  it.each(['', 'Personal', 'Deep Work'])('omits hidingSince for non-hiding focus "%s"', (mode: string) => {
    const fixture = createFocusFixture({currentFocus: mode})
    expect(fixture.hidingSince).toBeUndefined()
    expect(errorsFor(fixture)).toBe('')
  })

  it('honours an explicit hidingSince override', () => {
    const fixture = createFocusFixture({currentFocus: 'Work', hidingSince: '2026-03-01T00:00:00.000Z'})
    expect(fixture.hidingSince).toBe('2026-03-01T00:00:00.000Z')
  })
})

describe('the in-memory variations match the committed bytes', () => {
  it.each(Object.keys(focusVariations))('%s validates', (variation: string) => {
    expect(errorsFor(focusVariations[variation]), variation).toBe('')
  })
})
