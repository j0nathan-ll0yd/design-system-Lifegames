#!/usr/bin/env node
// mantle-cli-output: compliance matrix report for stdout
/**
 * Widget Compliance Matrix — Design System Edition
 *
 * Reads production-widgets.json as the authoritative registry and checks
 * each widget against the codebase (astro files, fixtures, manifest).
 *
 * Usage: node audits/checks/d3-widget-compliance.mjs
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..')

function readJSON(relativePath) {
  const fullPath = path.join(ROOT, relativePath)
  if (!fs.existsSync(fullPath)) {
    return null
  }
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8'))
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath))
}

const registry = readJSON('Sources/LifegamesWidgets/Resources/production-widgets.json')
if (!registry) {
  console.error('ERROR: production-widgets.json not found')
  process.exit(1)
}

const manifest = readJSON('Sources/LifegamesWidgets/Resources/widgets/widget-manifest.json')
const manifestByName = new Map()
if (manifest) {
  for (const w of manifest.widgets) {
    manifestByName.set(w.name, w)
  }
}
// Also index by the V3-suffixed names used in production-widgets.json
// since manifest uses shorter names (e.g. "PlaceLeaderboard" vs "PlaceLeaderboardV3")
// Exported for reuse by audits/checks/d1-widget-matrix.mjs, which reconciles this
// same V3 naming split across a wider set of registries.
export const MANIFEST_ALIASES = {PlaceLeaderboardV3: 'PlaceLeaderboard', ExplorationOdometerV3: 'ExplorationOdometer'}

// Exported for reuse by audits/checks/d1-widget-matrix.mjs.
export function toKebabName(name) {
  return name.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/V(\d)/g, '-v$1').toLowerCase()
}

console.log('Widget Compliance Matrix (Design System)')
console.log('========================================\n')

const cols = ['Widget', 'Status', 'Astro', 'Fixture', 'Manifest']
const widths = [28, 10, 7, 9, 10]

console.log(cols.map((c, i) => c.padEnd(widths[i])).join(' '))
console.log(cols.map((_, i) => '-'.repeat(widths[i])).join(' '))

let gaps = 0

// Only web-platform entries have an .astro mirror + fixture + manifest entry.
// Swift-platform entries (R7 registry completion) are tracked for governance
// (consumers/status/plannedSurface) but have no web artifacts to check here.
const webRegistry = registry.filter((w) => w.platform !== 'swift')

webRegistry.forEach((widget) => {
  const astroExists = fileExists(`packages/web/src/widgets/${widget.fileRelativeToWidgets}`)
  const manifestKey = MANIFEST_ALIASES[widget.name] || widget.name
  const manifestEntry = manifestByName.get(manifestKey)
  const inManifest = !!manifestEntry

  let hasFixture = false
  if (manifestEntry) {
    hasFixture = fileExists(`Sources/LifegamesWidgets/Resources/widgets/${manifestEntry.fixturePath}`)
  } else {
    const category = widget.fileRelativeToWidgets.split('/')[0]
    const kebabName = toKebabName(widget.name)
    hasFixture = fileExists(`Sources/LifegamesWidgets/Resources/widgets/${category}/${kebabName}.json`)
  }

  if (!astroExists || !hasFixture || !inManifest) {
    gaps++
  }

  console.log([
    widget.name.padEnd(widths[0]),
    widget.status.padEnd(widths[1]),
    (astroExists ? 'YES' : 'NO').padEnd(widths[2]),
    (hasFixture ? 'YES' : 'NO').padEnd(widths[3]),
    (inManifest ? 'YES' : 'NO').padEnd(widths[4])
  ].join(' '))
})

console.log(
  `\nTotal: ${webRegistry.length} web widgets (${webRegistry.filter((w) => w.buildStatus === 'shipped').length} shipped, ${
    webRegistry.filter((w) => w.buildStatus === 'dev-only').length
  } dev-only); ${registry.length - webRegistry.length} swift entries (governance-tracked, no web artifacts)`
)

if (gaps > 0) {
  console.log(`\n${gaps} widget(s) have compliance gaps.`)
  process.exit(1)
}

console.log('\nAll widgets compliant.')
