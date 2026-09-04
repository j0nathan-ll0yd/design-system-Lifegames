// Known-answer suite for the Watch exclusions gate (F-014).
//
// This gate had no test. It is one of the five gates D3's catalog title named
// while only one of the six had a can-fail proof (atlas decision 0111 phase 1,
// backfill finding 1). A gate with no known-answer suite answers "is the estate
// clean?" and never "can this still fail?", which are different questions.
//
// Two shapes are proved below, plus the vacuity hole the refactor closed:
//
//   - A forbidden symbol reaching a Watch target must produce a blocking
//     finding, by FILENAME and by SOURCE REFERENCE, in both scan roots.
//   - A scan root that has been renamed away must RED. Before this change the
//     walk returned an empty list for a missing directory, so moving or
//     renaming a Watch target retired the gate silently at exit 0.
//
// Every case builds a throwaway fixture tree and points `scanWatchExclusions`
// at it with an explicit `root`. There is deliberately no environment variable
// for the root — same reasoning as check-swift-widget-purity.test.mjs.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {scanWatchExclusions} from '../checks/d3-watch-exclusions.mjs'

const COMPONENTS_WATCH = 'Sources/LifegamesComponentsWatch'
const WIDGETS_WATCH = 'Sources/LifegamesWidgetsWatch'

const CLEAN_VIEW = 'import SwiftUI\n\nstruct StepsView: View {\n  var body: some View { Text("steps") }\n}\n'

/**
 * Materialise a fixture repo.
 * @param {Record<string, string>} files repo-relative path → contents
 * @returns {string} the fixture root
 */
function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fixds-watch-'))
  for (const [rel, contents] of Object.entries(files)) {
    const full = path.join(root, rel)
    fs.mkdirSync(path.dirname(full), {recursive: true})
    fs.writeFileSync(full, contents)
  }
  return root
}

/** Both scan roots present and clean — the baseline every mutant is measured against. */
function cleanTree(extra = {}) {
  return fixture({[`${COMPONENTS_WATCH}/StepsView.swift`]: CLEAN_VIEW, [`${WIDGETS_WATCH}/SyncStatusWidget.swift`]: CLEAN_VIEW, ...extra})
}

// covers: widget-contract#The watch targets exclude the widgets that cannot run on watchOS
test('a clean Watch tree produces no finding and reports a non-empty corpus', () => {
  const result = scanWatchExclusions({root: cleanTree()})
  assert.deepEqual(result.findings, [])
  assert.deepEqual(result.missingDirs, [])
  assert.equal(result.scannedFileCount, 2)
})

// covers: widget-contract#The watch targets exclude the widgets that cannot run on watchOS
test('an ECG file name in the Watch components target is rejected', () => {
  const result = scanWatchExclusions({root: cleanTree({[`${COMPONENTS_WATCH}/ECGStrip.swift`]: CLEAN_VIEW})})
  const hit = result.findings.find((f) => f.kind === 'filename' && f.symbol === 'ECG')
  assert.ok(hit, `expected a filename finding for ECG, got ${JSON.stringify(result.findings)}`)
  assert.equal(hit.file, `${COMPONENTS_WATCH}/ECGStrip.swift`)
})

test('a PulsingMapMarker reference inside a Watch widget source is rejected', () => {
  const result = scanWatchExclusions({
    root: cleanTree({[`${WIDGETS_WATCH}/MapWidget.swift`]: 'import SwiftUI\n\nstruct MapWidget: View {\n  var body: some View { PulsingMapMarker() }\n}\n'})
  })
  const hit = result.findings.find((f) => f.kind === 'reference' && f.symbol === 'PulsingMapMarker')
  assert.ok(hit, `expected a reference finding for PulsingMapMarker, got ${JSON.stringify(result.findings)}`)
  assert.equal(hit.file, `${WIDGETS_WATCH}/MapWidget.swift`)
  assert.equal(hit.line, 4)
})

test('a forbidden symbol in a NESTED directory under a scan root is still found', () => {
  const result = scanWatchExclusions({root: cleanTree({[`${WIDGETS_WATCH}/Health/Deep/ECGTile.swift`]: CLEAN_VIEW})})
  assert.ok(result.findings.some((f) => f.file === `${WIDGETS_WATCH}/Health/Deep/ECGTile.swift`))
})

test('a symbol that merely SUFFIXES a forbidden family still matches, a prefixed one does not', () => {
  const suffixed = scanWatchExclusions({root: cleanTree({[`${WIDGETS_WATCH}/Variant.swift`]: 'import SwiftUI\nlet v = ECGV2Config()\n'})})
  assert.ok(suffixed.findings.some((f) => f.symbol === 'ECG'))

  const prefixed = scanWatchExclusions({root: cleanTree({[`${WIDGETS_WATCH}/Variant.swift`]: 'import SwiftUI\nlet v = GECGConfig()\n'})})
  assert.deepEqual(prefixed.findings, [])
})

test('a renamed-away scan root REDS instead of silently scanning nothing', () => {
  // The whole vacuity hole in one fixture: LifegamesWidgetsWatch is gone, so the
  // pre-refactor gate walked an empty list for it and exited 0 with no finding.
  const root = fixture({[`${COMPONENTS_WATCH}/StepsView.swift`]: CLEAN_VIEW})
  const result = scanWatchExclusions({root})
  assert.deepEqual(result.missingDirs, [WIDGETS_WATCH])
  const hit = result.findings.find((f) => f.kind === 'missing-scan-root')
  assert.ok(hit, 'a missing scan root must be a finding, not silence')
  assert.equal(hit.file, WIDGETS_WATCH)
})

test('an EMPTY fixture root reds on both scan roots — the gate cannot be aimed at nothing', () => {
  const result = scanWatchExclusions({root: fixture({})})
  assert.deepEqual(result.missingDirs, [COMPONENTS_WATCH, WIDGETS_WATCH])
  assert.equal(result.findings.length, 2)
  assert.equal(result.scannedFileCount, 0)
})

test('the real repository tree passes the gate', () => {
  const result = scanWatchExclusions()
  assert.deepEqual(result.findings, [])
  assert.ok(result.scannedFileCount > 0, 'the real Watch targets must contribute a non-empty corpus')
})
