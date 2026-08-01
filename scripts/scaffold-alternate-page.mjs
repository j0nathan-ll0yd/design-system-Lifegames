#!/usr/bin/env node
/**
 * Scaffolds an alternate widget page and empty fixture stubs.
 *
 * Usage:
 *   node scripts/scaffold-alternate-page.mjs --name ActivityFeed --category github
 *   node scripts/scaffold-alternate-page.mjs --name ActivityFeed --category github --force
 */

import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs'
import {dirname, resolve} from 'path'
import {fileURLToPath} from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// --- CLI args ---
const args = process.argv.slice(2)
function getArg(flag) {
  const i = args.indexOf(flag)
  return i !== -1 ? args[i + 1] : null
}
const name = getArg('--name')
const category = getArg('--category')
const force = args.includes('--force')

if (!name || !category) {
  console.error('Usage: node scripts/scaffold-alternate-page.mjs --name <WidgetName> --category <category> [--force]')
  process.exit(1)
}

// --- Kebab conversion with acronym handling ---
// Special-case known acronyms so "GitHubHeatmap" → "github-heatmap" not "git-hub-heatmap"
const ACRONYM_MAP = {GitHub: 'Github', OG: 'Og'}

function toKebab(str) {
  let s = str
  for (const [acronym, replacement] of Object.entries(ACRONYM_MAP)) {
    s = s.replaceAll(acronym, replacement)
  }
  return s.replace(/([A-Z])/g, (m, c, offset) => (offset === 0 ? c.toLowerCase() : '-' + c.toLowerCase())).replace(/^-/, '')
}

const kebab = toKebab(name)
const catCapitalized = category.charAt(0).toUpperCase() + category.slice(1)

// --- Load manifest ---
const manifestPath = resolve(ROOT, 'Sources/LifegamesWidgets/Resources/widgets/widget-manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
const widgetEntry = manifest.widgets.find((w) => w.name === name && w.category === category)

if (!widgetEntry) {
  console.error(`Widget "${name}" with category "${category}" not found in widget-manifest.json`)
  process.exit(1)
}

// --- iOS detection ---
// Category dir uses Title-case (e.g. "GitHub" → "GitHub", "identity" → "Identity")
// Actual dirs found: GitHub, Health, Identity, Location, Other, Reading, Runtime, Resources
const SWIFT_CATEGORY_MAP = {github: 'GitHub', health: 'Health', identity: 'Identity', location: 'Location', other: 'Other', reading: 'Reading'}
const swiftCategoryDir = SWIFT_CATEGORY_MAP[category] ?? catCapitalized
const swiftViewFile = `${name}View.swift`
const swiftViewPath = resolve(ROOT, 'Sources/LifegamesWidgets', swiftCategoryDir, swiftViewFile)
const swiftExists = existsSync(swiftViewPath)
const swiftRelPath = `Sources/LifegamesWidgets/${swiftCategoryDir}/${swiftViewFile}`

// --- Check for .astro component ---
const astroComponentPath = resolve(ROOT, 'packages/web/src/widgets', category, `${name}.astro`)
if (!existsSync(astroComponentPath)) {
  console.warn(`Warning: No .astro component found at packages/web/src/widgets/${category}/${name}.astro`)
  console.warn('Skipping page generation (OGImage case or component not yet created).')
  process.exit(0)
}

// --- Output paths ---
const pageDir = resolve(ROOT, 'apps/docs/src/pages/alternates', category)
const pagePath = resolve(pageDir, `${kebab}.astro`)
const fixtureDir = resolve(ROOT, 'Sources/LifegamesWidgets/Resources/widgets', category)

// --- Guard: skip if exists and not forced ---
if (existsSync(pagePath) && !force) {
  console.log(`Page already exists: apps/docs/src/pages/alternates/${category}/${kebab}.astro`)
  console.log('Use --force to overwrite.')
} else {
  mkdirSync(pageDir, {recursive: true})

  const page = generateAstroPage({name, category, kebab, swiftExists, swiftRelPath, fixturePath: widgetEntry.fixturePath})
  writeFileSync(pagePath, page, 'utf-8')
  console.log(`Created: apps/docs/src/pages/alternates/${category}/${kebab}.astro`)
}

// --- Fixture stubs ---
const fixtureVariants = [
  `${kebab}.skeleton.json`,
  `${kebab}.empty.json`,
  `${kebab}.populated-min.json`,
  `${kebab}.populated-max.json`,
  `${kebab}.variation-a.json`,
  `${kebab}.variation-b.json`,
  `${kebab}.variation-c.json`
]

for (const fname of fixtureVariants) {
  const fpath = resolve(fixtureDir, fname)
  if (existsSync(fpath)) {
    console.log(`Skipping existing fixture: ${fname}`)
  } else {
    writeFileSync(fpath, '{}\n', 'utf-8')
    console.log(`Created fixture stub: Sources/LifegamesWidgets/Resources/widgets/${category}/${fname}`)
  }
}

console.log('Done.')

// --- Page template ---
function generateAstroPage({name, category, kebab, swiftExists, swiftRelPath, fixturePath}) {
  const webPath = `packages/web/src/widgets/${category}/${name}.astro`
  const typesPath = `packages/web/src/widgets/${category}/${name}.types.ts`
  const fixtureFixedPath = `Sources/LifegamesWidgets/Resources/widgets/${fixturePath}`

  const iosCrossPlatformLine = swiftExists
    ? `        <li><strong>iOS:</strong> <code>${swiftRelPath}</code></li>`
    : `        <li><strong>iOS:</strong> Not yet ported</li>`

  return `---
import '@j0nathan-ll0yd/tokens/fonts';
import '@j0nathan-ll0yd/tokens/css';
import '@j0nathan-ll0yd/tokens/compat';
import '@j0nathan-ll0yd/tokens/components';
import '@j0nathan-ll0yd/tokens/effects';
import '@j0nathan-ll0yd/tokens/layout';
import '@j0nathan-ll0yd/tokens/base';
import '@j0nathan-ll0yd/tokens/docs-chrome';

import ${name} from '@widgets/${category}/${name}.astro';
import fixture from '@fixtures/${category}/${kebab}.json';
import StateMatrix from '../../../components/StateMatrix.astro';
import VariationGrid from '../../../components/VariationGrid.astro';
import ResponsiveDemo from '../../../components/ResponsiveDemo.astro';
import WidgetPageScript from '../../../components/WidgetPageScript.astro';
import fixture_skeleton from '@fixtures/${category}/${kebab}.skeleton.json';
import fixture_empty from '@fixtures/${category}/${kebab}.empty.json';
import fixture_populated_min from '@fixtures/${category}/${kebab}.populated-min.json';
import fixture_populated_max from '@fixtures/${category}/${kebab}.populated-max.json';
import var_a from '@fixtures/${category}/${kebab}.variation-a.json';
import var_b from '@fixtures/${category}/${kebab}.variation-b.json';
import var_c from '@fixtures/${category}/${kebab}.variation-c.json';
---

<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name} — Lifegames Design System</title>
</head>
<body>
  <div class="wd-page">
    <a class="wd-back" href="/alternates/">&#8592; Back to alternates</a>

    <div class="wd-header">
      <h1 class="wd-title">${name}</h1>
      <span class="wd-badge wd-badge--dev">Alternate</span>
      <span class="wd-cat">${category}</span>
    </div>

    <section class="wd-section">
      <h2 class="wd-section-title">Live Demo</h2>
      <ResponsiveDemo widgetName="${name}" category="${category}" fixture={fixture} Comp={${name}} />
    </section>

    <section class="wd-section">
      <h2 class="wd-section-title">State Matrix</h2>
      <StateMatrix
        widgetName="${name}"
        category="${category}"
        states={[{ state: "skeleton", fixture: fixture_skeleton }, { state: "empty", fixture: fixture_empty }, { state: "populated-min", fixture: fixture_populated_min }, { state: "populated-max", fixture: fixture_populated_max }]}
      />
    </section>

    <section class="wd-section">
      <h2 class="wd-section-title">Variations</h2>
      <VariationGrid
        widgetName="${name}"
        category="${category}"
        variations={[
          { label: "variation-a", fixture: var_a, caption: "Variation A." },
          { label: "variation-b", fixture: var_b, caption: "Variation B." },
          { label: "variation-c", fixture: var_c, caption: "Variation C." },
        ]}
      />
    </section>

    <section class="wd-section">
      <h2 class="wd-section-title">Props</h2>
      <p class="wd-text">
        See <code>${typesPath}</code> for the full interface.
      </p>
    </section>

    <section class="wd-section">
      <h2 class="wd-section-title">Usage</h2>
      <pre class="wd-code"><code>---
import ${name} from '@j0nathan-ll0yd/web/widgets/${category}/${name}.astro';
---
&lt;${name} &#123;...data&#125; /&gt;</code></pre>
    </section>

    <section class="wd-section">
      <h2 class="wd-section-title">Cross-Platform</h2>
      <ul class="wd-list">
        <li><strong>Web:</strong> <code>${webPath}</code></li>
${iosCrossPlatformLine}
        <li><strong>Fixture:</strong> <code>${fixtureFixedPath}</code></li>
      </ul>
    </section>
  </div>
  <WidgetPageScript />
</body>
</html>
`
}
