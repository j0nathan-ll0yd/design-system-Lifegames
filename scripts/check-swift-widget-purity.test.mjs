// Known-answer suite for the Swift purity gate (P3 + F-015).
//
// This gate had no test at all — it was one of the three requirements
// grandfathered in openspec/covers-baseline.json as "enforced by a blocking
// gate with no known-answer test". Two defects lived in that blind spot:
//
//   - The forbidden-import scan walked ONLY Sources/LifegamesWidgets/, while
//     GOVERNANCE.md §5 P3 draws the ban around "a DS component". A component
//     under Sources/LifegamesComponents{,Core}/ could import HealthKit,
//     CoreLocation, ComposableArchitecture, APIClient or SharedModels and the
//     gate exited 0. The color detections already walked all three trees, so
//     the corpus was there and the import loop simply did not use it.
//   - An entry in widget-purity-exceptions.json exempted a Color(hex:) site on
//     (file, line) alone. The file's own $comment says "Reason MUST explain why
//     the raw color is required" and nothing parsed it, so a reasonless entry
//     silently suppressed a real finding.
//
// Every case below builds a throwaway fixture tree and points `scanPurity` at
// it with an explicit `root` argument. There is deliberately no environment
// variable for the root: a gate whose corpus can be relocated from the
// environment is a gate that can be aimed at an empty directory and told to
// report success.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {scanPurity} from './check-swift-widget-purity.mjs'

const WIDGET_DIR = 'Sources/LifegamesWidgets'
const COMPONENT_DIR = 'Sources/LifegamesComponents'
const COMPONENT_CORE_DIR = 'Sources/LifegamesComponentsCore'

/**
 * Materialise a fixture repo.
 * @param {Record<string, string>} files repo-relative path → contents
 * @returns {string} the fixture root
 */
function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fixds-purity-'))
  for (const [rel, contents] of Object.entries(files)) {
    const full = path.join(root, rel)
    fs.mkdirSync(path.dirname(full), {recursive: true})
    fs.writeFileSync(full, contents)
  }
  return root
}

/** Blocking findings whose label names a forbidden module. */
function importBlocks(result) {
  return result.blocking.filter((f) => /HealthKit|CoreLocation|ComposableArchitecture|APIClient|SharedModels/.test(f.label))
}

const PURE_VIEW = 'import SwiftUI\n\nstruct PureView: View {\n  var body: some View { Text("hi") }\n}\n'

// covers: widget-contract#A Swift widget or component source holds no unreviewed raw color literal
test('a clean widget-and-component tree produces no blocking finding', () => {
  const root = fixture({
    [`${WIDGET_DIR}/PureWidget.swift`]: PURE_VIEW,
    [`${COMPONENT_DIR}/PureComponent.swift`]: PURE_VIEW,
    [`${COMPONENT_CORE_DIR}/PureCore.swift`]: PURE_VIEW
  })
  const result = scanPurity({root})
  assert.deepEqual(result.blocking, [])
  assert.equal(result.widgetFileCount, 1)
  assert.equal(result.componentFileCount, 2)
})

// covers: widget-contract#A Swift widget or component source holds no unreviewed raw color literal
test('a WIDGET importing a sensor or state framework blocks', () => {
  for (const module of ['HealthKit', 'CoreLocation', 'ComposableArchitecture', 'APIClient', 'SharedModels']) {
    const root = fixture({[`${WIDGET_DIR}/Impure.swift`]: `import SwiftUI\nimport ${module}\n`})
    const hits = importBlocks(scanPurity({root}))
    assert.equal(hits.length, 1, `widget import of ${module} must block`)
    assert.equal(hits[0].file, `${WIDGET_DIR}/Impure.swift`)
    assert.equal(hits[0].line, 2)
  }
})

// covers: widget-contract#A Swift widget or component source holds no unreviewed raw color literal
test('a COMPONENT importing a sensor or state framework blocks (P3 covers components, not just widgets)', () => {
  for (const dir of [COMPONENT_DIR, COMPONENT_CORE_DIR]) {
    for (const module of ['HealthKit', 'CoreLocation', 'ComposableArchitecture', 'APIClient', 'SharedModels']) {
      const root = fixture({[`${dir}/Impure.swift`]: `import SwiftUI\nimport ${module}\n`})
      const hits = importBlocks(scanPurity({root}))
      assert.equal(hits.length, 1, `${dir} import of ${module} must block — GOVERNANCE.md §5 P3 bans it for "a DS component"`)
      assert.equal(hits[0].file, `${dir}/Impure.swift`)
    }
  }
})

// covers: widget-contract#A Swift widget or component source holds no unreviewed raw color literal
test('an un-exempted raw color literal blocks in a component as well as a widget', () => {
  for (const dir of [WIDGET_DIR, COMPONENT_DIR, COMPONENT_CORE_DIR]) {
    const root = fixture({[`${dir}/Colored.swift`]: 'import SwiftUI\nlet a = Color(hex: "#ff006e")\nlet b = Color(red: 1, green: 0, blue: 0.5)\n'})
    const labels = scanPurity({root}).blocking.map((f) => f.label)
    assert.deepEqual(labels.sort(), ['Color(hex:) raw literal', 'Color(red:green:blue:) raw literal'], `${dir} must report both raw color forms`)
  }
})

// covers: widget-contract#A Swift widget or component source holds no unreviewed raw color literal
test('an exemption carrying a reason exempts its site and does not block', () => {
  const root = fixture({
    [`${WIDGET_DIR}/Runtime.swift`]: 'import SwiftUI\nlet a = Color(hex: lang.color)\n',
    'widget-purity-exceptions.json': JSON.stringify({
      colorHex: [{file: `${WIDGET_DIR}/Runtime.swift`, line: 2, reason: 'Runtime data: the API supplies the hex.'}]
    })
  })
  const result = scanPurity({root})
  assert.deepEqual(result.blocking, [])
  assert.equal(result.exempted.length, 1)
  assert.equal(result.exceptionCount, 1)
})

// covers: widget-contract#A Swift widget or component source holds no unreviewed raw color literal
test('an exemption with no reason exempts nothing and is itself a blocking finding', () => {
  for (const reason of [undefined, '', '   ', 42]) {
    const entry = {file: `${WIDGET_DIR}/Runtime.swift`, line: 2}
    if (reason !== undefined) {
      entry.reason = reason
    }
    const root = fixture({
      [`${WIDGET_DIR}/Runtime.swift`]: 'import SwiftUI\nlet a = Color(hex: lang.color)\n',
      'widget-purity-exceptions.json': JSON.stringify({colorHex: [entry]})
    })
    const result = scanPurity({root})
    assert.equal(result.exceptionCount, 0, `reason ${JSON.stringify(reason)} must not register an exemption`)
    // Two blocking findings: the malformed record, and the now-unexempted site.
    const labels = result.blocking.map((f) => f.label)
    assert.ok(labels.some((l) => l.includes('not a usable record')),
      `reason ${JSON.stringify(reason)} must be reported as a malformed exemption, got ${JSON.stringify(labels)}`)
    assert.ok(labels.includes('Color(hex:) raw literal'), 'the site it claimed to exempt must be reported unexempted')
  }
})

// covers: widget-contract#A Swift widget or component source holds no unreviewed raw color literal
test('an unparseable exceptions file is RED, never an empty allow-list that passes', () => {
  const root = fixture({[`${WIDGET_DIR}/Pure.swift`]: PURE_VIEW, 'widget-purity-exceptions.json': '{ "colorHex": [ truncated'})
  const result = scanPurity({root})
  assert.equal(result.blocking.length, 1)
  assert.equal(result.blocking[0].label, 'unparseable exceptions file')
})

// covers: widget-contract#A Swift widget or component source holds no unreviewed raw color literal
test('UIKit alongside SwiftUI blocks in a component as well as a widget', () => {
  for (const dir of [WIDGET_DIR, COMPONENT_DIR, COMPONENT_CORE_DIR]) {
    const root = fixture({[`${dir}/Mixed.swift`]: 'import SwiftUI\nimport UIKit\n'})
    const labels = scanPurity({root}).blocking.map((f) => f.label)
    assert.deepEqual(labels, ['import UIKit alongside import SwiftUI'], `${dir} must report the co-import`)
  }
})

// covers: widget-contract#A Swift widget or component source holds no unreviewed raw color literal
test('UIKit without SwiftUI is allowed', () => {
  const root = fixture({[`${COMPONENT_DIR}/UIKitOnly.swift`]: 'import UIKit\n'})
  assert.deepEqual(scanPurity({root}).blocking, [])
})
