// mantle-cli-output: test file, not a CLI script (marker satisfies scripts/-dir convention scan)
import {describe, test} from 'node:test'
import assert from 'node:assert/strict'
import {buildMatrix, canonicalize, sortFindings} from './audit-widget-matrix.mjs'

describe('canonicalize', () => {
  test('strips a trailing V<digits> suffix', () => {
    assert.equal(canonicalize('PlaceLeaderboardV3'), 'PlaceLeaderboard')
    assert.equal(canonicalize('ExplorationOdometerV3'), 'ExplorationOdometer')
  })

  test('strips a trailing View suffix (Swift type name spelling)', () => {
    assert.equal(canonicalize('BioTerminalView'), 'BioTerminal')
    assert.equal(canonicalize('HeartRateView'), 'HeartRate')
  })

  test('leaves names with neither suffix untouched', () => {
    assert.equal(canonicalize('SystemStatus'), 'SystemStatus')
  })

  test('is a no-op on an already-canonical name', () => {
    assert.equal(canonicalize(canonicalize('PlaceLeaderboardV3')), 'PlaceLeaderboard')
  })
})

function noopProbes() {
  return {
    hasAstroImpl: () => false,
    hasSwiftViewImpl: () => false,
    fixtureExists: () => false,
    hasDocPageImpl: () => false,
    hasStorybookStoryImpl: () => false,
    hasSwiftSnapshotImpl: () => false
  }
}

describe('buildMatrix — MovementRings-style registry gap', () => {
  // Reproduces the real drift found in this repo 2026-07-16: a widget fully
  // shipped on disk (astro + Swift View) and marked production:true in
  // widget-manifest.json, but entirely absent from production-widgets.json —
  // the registry scripts/widget-compliance.mjs treats as authoritative.
  const sources = {
    productionRegistry: [
      // Note: no entry for "MovementRings" on any platform.
      {name: 'HeartRate', platform: 'web', buildStatus: 'shipped'}
    ],
    manifestWidgets: [
      {name: 'MovementRings', production: true, fixturePath: 'health/movement-rings.json'},
      {name: 'HeartRate', production: true, fixturePath: 'health/heart-rate.json'}
    ],
    consumersDoc: {consumedWidgets: ['MovementRings', 'HeartRate'], widgets: [], generatedAt: new Date().toISOString()},
    docsInventoryWidgets: [{id: 'MovementRings', hasStory: false}],
    ...noopProbes(),
    hasAstroImpl: (name) => ['MovementRings', 'HeartRate'].includes(name),
    hasSwiftViewImpl: (name) => ['MovementRings', 'HeartRate'].includes(name)
  }

  test('flags a HIGH finding when manifest says production but the registry has no entry', () => {
    const {findings} = buildMatrix(sources)
    const hit = findings.find((f) => f.id === 'MovementRings' && f.severity === 'high' && /production-widgets\.json.*no entry/.test(f.message))
    assert.ok(hit, `expected a HIGH registry-gap finding for MovementRings, got: ${JSON.stringify(findings, null, 2)}`)
  })

  test('does not raise the same finding for a widget present in both sources', () => {
    const {findings} = buildMatrix(sources)
    const falsePositive = findings.find((f) => f.id === 'HeartRate' && /no entry for it on any platform/.test(f.message))
    assert.equal(falsePositive, undefined)
  })

  test('flags the self-inconsistency: consumedWidgets references a widget missing from widgets[]', () => {
    const {findings} = buildMatrix(sources)
    const hit = findings.find((f) => f.id === 'MovementRings' && /self-inconsistent/.test(f.message))
    assert.ok(hit, 'expected a self-inconsistency finding for MovementRings')
  })
})

describe('buildMatrix — naming variants', () => {
  test('merges View-suffixed (Swift) and bare (web) spellings into one row, no spurious finding', () => {
    const sources = {
      productionRegistry: [
        {name: 'BioTerminal', platform: 'web', buildStatus: 'shipped'},
        {name: 'BioTerminalView', platform: 'swift', buildStatus: 'shipped'}
      ],
      manifestWidgets: [],
      consumersDoc: {},
      docsInventoryWidgets: [],
      ...noopProbes()
    }
    const {rows, findings} = buildMatrix(sources)
    assert.equal(rows.length, 1, 'expected View-suffix and bare spelling to merge into one canonical row')
    assert.equal(rows[0].id, 'BioTerminal')
    const spuriousVariantFinding = findings.find((f) => f.id === 'BioTerminal' && /naming variant/.test(f.message))
    assert.equal(spuriousVariantFinding, undefined, 'web/Swift name pairing is by design, not drift')
  })

  test('flags a genuine V3-suffix spelling mismatch between sources', () => {
    const sources = {
      productionRegistry: [
        {name: 'PlaceLeaderboardV3', platform: 'web', buildStatus: 'dev-only'}
      ],
      manifestWidgets: [
        {name: 'PlaceLeaderboard', production: true, fixturePath: 'location/place-leaderboard-v3.json'}
      ],
      consumersDoc: {},
      docsInventoryWidgets: [],
      ...noopProbes(),
      fixtureExists: () => true
    }
    const {findings} = buildMatrix(sources)
    const hit = findings.find((f) => f.id === 'PlaceLeaderboard' && f.severity === 'info' && /naming variant/.test(f.message))
    assert.ok(hit, 'expected an info-level naming-variant finding for the V3 spelling split')
  })
})

describe('buildMatrix — docs/widget-inventory.json hasStory vs filesystem', () => {
  test('flags a mismatch when the registry field disagrees with the storybook filesystem probe', () => {
    const sources = {
      productionRegistry: [],
      manifestWidgets: [],
      consumersDoc: {},
      docsInventoryWidgets: [{id: 'MovementRings', hasStory: false}],
      ...noopProbes(),
      hasStorybookStoryImpl: (name) => name === 'MovementRings'
    }
    const {findings} = buildMatrix(sources)
    const hit = findings.find((f) => f.id === 'MovementRings' && /hasStory:false.*hasStorybookStory:true/.test(f.message))
    assert.ok(hit, 'expected a hasStory-vs-filesystem mismatch finding')
  })

  test('does not flag when the registry field agrees with the filesystem', () => {
    const sources = {
      productionRegistry: [],
      manifestWidgets: [],
      consumersDoc: {},
      docsInventoryWidgets: [{id: 'SomeWidget', hasStory: true}],
      ...noopProbes(),
      hasStorybookStoryImpl: (name) => name === 'SomeWidget'
    }
    const {findings} = buildMatrix(sources)
    const falsePositive = findings.find((f) => f.id === 'SomeWidget' && /hasStory/.test(f.message))
    assert.equal(falsePositive, undefined)
  })
})

describe('buildMatrix — widget-consumers.json staleness', () => {
  test('flags generatedAt older than the 14-day threshold', () => {
    const nowMs = Date.parse('2026-07-16T00:00:00.000Z')
    const sources = {
      productionRegistry: [],
      manifestWidgets: [],
      consumersDoc: {generatedAt: '2026-06-13T23:54:38.858Z'},
      docsInventoryWidgets: [],
      ...noopProbes(),
      nowMs
    }
    const {findings} = buildMatrix(sources)
    const expectedDays = Math.round((nowMs - Date.parse(sources.consumersDoc.generatedAt)) / 86_400_000)
    const hit = findings.find((f) => f.id === '(widget-consumers.json)' && f.message.includes(`${expectedDays} days old`))
    assert.ok(hit, `expected a staleness finding mentioning ${expectedDays} days old, got: ${JSON.stringify(findings)}`)
  })

  test('does not flag generatedAt within the threshold', () => {
    const nowMs = Date.parse('2026-07-16T00:00:00.000Z')
    const sources = {
      productionRegistry: [],
      manifestWidgets: [],
      consumersDoc: {generatedAt: '2026-07-10T00:00:00.000Z'},
      docsInventoryWidgets: [],
      ...noopProbes(),
      nowMs
    }
    const {findings} = buildMatrix(sources)
    const hit = findings.find((f) => f.id === '(widget-consumers.json)')
    assert.equal(hit, undefined)
  })
})

describe('buildMatrix — fixture triad', () => {
  test('flags missing empty/populated-max fixture variants', () => {
    const sources = {
      productionRegistry: [],
      manifestWidgets: [{name: 'Widget', production: true, fixturePath: 'cat/widget.json'}],
      consumersDoc: {},
      docsInventoryWidgets: [],
      ...noopProbes(),
      fixtureExists: (relPath) => relPath === 'cat/widget.json' // only the base fixture exists
    }
    const {findings} = buildMatrix(sources)
    const hit = findings.find((f) => f.id === 'Widget' && /missing fixture variant/.test(f.message))
    assert.ok(hit)
    assert.match(hit.message, /empty/)
    assert.match(hit.message, /populated-max/)
  })

  test('does not flag when the full triad exists', () => {
    const sources = {
      productionRegistry: [],
      manifestWidgets: [{name: 'Widget', production: true, fixturePath: 'cat/widget.json'}],
      consumersDoc: {},
      docsInventoryWidgets: [],
      ...noopProbes(),
      fixtureExists: () => true
    }
    const {findings} = buildMatrix(sources)
    const hit = findings.find((f) => f.id === 'Widget' && /missing fixture variant/.test(f.message))
    assert.equal(hit, undefined)
  })
})

describe('buildMatrix — clean fixture set', () => {
  test('produces zero findings when every source and filesystem probe agrees', () => {
    const sources = {
      productionRegistry: [{name: 'Widget', platform: 'web', buildStatus: 'shipped'}],
      manifestWidgets: [{name: 'Widget', production: true, fixturePath: 'cat/widget.json'}],
      consumersDoc: {consumedWidgets: ['Widget'], widgets: [{name: 'Widget'}], generatedAt: new Date().toISOString()},
      docsInventoryWidgets: [{id: 'Widget', hasStory: true}],
      hasAstroImpl: (name) => name === 'Widget',
      hasSwiftViewImpl: (name) => name === 'Widget',
      fixtureExists: () => true,
      hasDocPageImpl: (name) => name === 'widget',
      hasStorybookStoryImpl: (name) => name === 'Widget',
      hasSwiftSnapshotImpl: (name) => name === 'Widget'
    }
    const {findings} = buildMatrix(sources)
    assert.deepEqual(findings, [], `expected no findings for a fully consistent fixture set, got: ${JSON.stringify(findings, null, 2)}`)
  })
})

describe('sortFindings', () => {
  test('orders by severity (high > medium > low > info), then id', () => {
    const input = [
      {id: 'Z', severity: 'info', message: 'a'},
      {id: 'A', severity: 'high', message: 'b'},
      {id: 'B', severity: 'high', message: 'c'},
      {id: 'M', severity: 'medium', message: 'd'},
      {id: 'L', severity: 'low', message: 'e'}
    ]
    const sorted = sortFindings(input)
    assert.deepEqual(sorted.map((f) => f.id), ['A', 'B', 'M', 'L', 'Z'])
  })

  test('does not mutate the input array', () => {
    const input = [
      {id: 'Z', severity: 'info', message: 'a'},
      {id: 'A', severity: 'high', message: 'b'}
    ]
    const copy = [...input]
    sortFindings(input)
    assert.deepEqual(input, copy)
  })
})
