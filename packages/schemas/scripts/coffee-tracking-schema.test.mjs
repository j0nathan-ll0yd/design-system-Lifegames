// Known-answer suite for authored/coffee-tracking.schema.json, the wire shape of
// CoffeeTrackingProps (Sources/LifegamesComponentsCore/Coffee/CoffeeTrackingProps.swift).
// Every coffee fixture is mapped and validates; a fixture that breaks the Swift
// type (wrong type, closed-set value outside the enum, missing stored property,
// encoded computed property) fails. Each case runs the real validate.ts.
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {after, test} from 'node:test'
import {fileURLToPath} from 'node:url'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const REPO_ROOT = join(HERE, '../../..')
const TSX = join(HERE, '../node_modules/.bin/tsx')
const VALIDATE = join(HERE, 'validate.ts')
const COFFEE_REL = 'Sources/LifegamesWidgets/Resources/widgets/coffee'
const SCHEMA = 'CoffeeTracking'
const COFFEE_FIXTURES = readdirSync(join(REPO_ROOT, COFFEE_REL)).filter((f) => f.endsWith('.json')).sort()
const BASE_FIXTURE = JSON.parse(readFileSync(join(REPO_ROOT, COFFEE_REL, 'coffee-tracking.connected-drinking.json'), 'utf8'))

const work = mkdtempSync(join(tmpdir(), 'coffee-schema-'))
after(() => rmSync(work, {recursive: true, force: true}))

function validate(map, cwd) {
  const mapPath = join(work, `map-${Math.random().toString(36).slice(2)}.json`)
  writeFileSync(mapPath, JSON.stringify(map))
  return spawnSync(TSX, [VALIDATE, `--map=${mapPath}`], {env: {...process.env, LIFEGAMES_VALIDATE_CWD: cwd}, encoding: 'utf8'})
}

let n = 0
// Validates one mutated copy of a real coffee fixture.
function validateMutant(mutate) {
  const dir = join(work, `case-${n++}`)
  mkdirSync(dir)
  const fixture = structuredClone(BASE_FIXTURE)
  mutate(fixture)
  writeFileSync(join(dir, 'mutant.json'), JSON.stringify(fixture))
  return validate({ds: {'mutant.json': {schema: SCHEMA}}}, dir)
}

test('the coffee fixture directory holds the nine known states', () => {
  assert.equal(COFFEE_FIXTURES.length, 9, COFFEE_FIXTURES.join(', '))
})

test('the shipped map wires every coffee fixture to CoffeeTracking', () => {
  const map = JSON.parse(readFileSync(join(HERE, '../fixture-map.json'), 'utf8'))
  for (const f of COFFEE_FIXTURES) {
    assert.equal(map.ds[`${COFFEE_REL}/${f}`]?.schema, SCHEMA, `${f} is not mapped to ${SCHEMA}`)
  }
})

test('every coffee fixture validates', () => {
  const map = {ds: Object.fromEntries(COFFEE_FIXTURES.map((f) => [`${COFFEE_REL}/${f}`, {schema: SCHEMA}]))}
  const r = validate(map, REPO_ROOT)
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, new RegExp(`OK: ${COFFEE_FIXTURES.length} fixture\\(s\\) validated successfully`))
})

test('the unmutated base fixture passes, so each mutant below fails on its mutation alone', () => {
  const r = validateMutant(() => {})
  assert.equal(r.status, 0, r.stderr)
})

test('a wrong-typed field fails', () => {
  const r = validateMutant((f) => {
    f.cupsToday = '3'
  })
  assert.equal(r.status, 1)
  assert.match(r.stderr, /x mutant\.json \[bucket: ds\] \(CoffeeTracking\)/)
  assert.match(r.stderr, /\/cupsToday: type — must be integer/)
})

test('a fractional value in an Int field fails', () => {
  const r = validateMutant((f) => {
    f.sessionElapsedSeconds = 62.5
  })
  assert.equal(r.status, 1)
  assert.match(r.stderr, /\/sessionElapsedSeconds: type — must be integer/)
})

test('a wrong-typed optional field fails', () => {
  const r = validateMutant((f) => {
    f.batteryPercent = '78'
  })
  assert.equal(r.status, 1)
  assert.match(r.stderr, /\/batteryPercent/)
})

test('a beverage outside CoffeeTrackingProps.Beverage fails', () => {
  const r = validateMutant((f) => {
    f.beverage = 'latte'
  })
  assert.equal(r.status, 1)
  assert.match(r.stderr, /\/beverage: enum/)
})

test('a connection outside CoffeeTrackingProps.ScaleConnection fails', () => {
  const r = validateMutant((f) => {
    f.connection = 'disconnected'
  })
  assert.equal(r.status, 1)
  assert.match(r.stderr, /\/connection: enum/)
})

test('a missing stored property fails', () => {
  const r = validateMutant((f) => {
    delete f.isCupOnScale
  })
  assert.equal(r.status, 1)
  assert.match(r.stderr, /required — must have required property 'isCupOnScale'/)
})

test('an encoded computed property fails', () => {
  const r = validateMutant((f) => {
    f.fillPercent = 0.6
  })
  assert.equal(r.status, 1)
  assert.match(r.stderr, /additionalProperties/)
})

test('the optional properties may be absent, as Codable decodes them with decodeIfPresent', () => {
  const r = validateMutant((f) => {
    delete f.errorMessage
    delete f.batteryPercent
  })
  assert.equal(r.status, 0, r.stderr)
})
