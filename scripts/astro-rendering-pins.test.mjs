import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {test} from 'node:test'

// Astro 7 and Vite 8 changed four defaults that change what these apps render. Each pin below came
// from a before and after comparison of the built output (atlas decision 0163 open decision 1).
// apps/docs and apps/portfolio have no tests of their own, so dropping a pin from either stays green
// everywhere else. Change a pin only with a new comparison, then change this suite with it.
const repoRoot = resolve(import.meta.dirname, '..')

// Strips comments, so a pin that was commented out does not count.
const config = (file) => readFileSync(resolve(repoRoot, file), 'utf8').replace(/^\s*\/\/.*$/gm, '')

const PINS = {
  // 'jsx' drops the whitespace between multi-line elements, which readers see.
  compressHTML: /\bcompressHTML:\s*true\b/,
  // Lightning CSS drops `height: 100vh` before `height: 100dvh`.
  cssMinify: /\bcssMinify:\s*'esbuild'/,
  // Satteri prints `--` as an en dash, where remark prints an em dash.
  processor: /\bprocessor:\s*unified\(\)/,
  // @vite-pwa/astro 2 precaches the icons twice, and sw.js then fails to evaluate.
  includeManifestIcons: /\bincludeManifestIcons:\s*false\b/
}

const REQUIRED = [
  ['apps/docs/astro.config.mjs', ['compressHTML', 'cssMinify', 'processor']],
  ['apps/portfolio/astro.config.mjs', ['compressHTML', 'cssMinify', 'includeManifestIcons']],
  ['packages/web/tests/browser/fixture-app/astro.config.mjs', ['compressHTML', 'cssMinify']],
  ['packages/web/vitest.server-render.config.ts', ['compressHTML']]
]

for (const [file, pins] of REQUIRED) {
  for (const pin of pins) {
    test(`${file} keeps its ${pin} pin`, () => {
      assert.match(config(file), PINS[pin])
    })
  }
}

test('ci.yml and .husky/pre-push check the built service worker', () => {
  const command = 'node scripts/check-sw-precache.mjs'
  for (const file of ['.github/workflows/ci.yml', '.husky/pre-push']) {
    assert.ok(readFileSync(resolve(repoRoot, file), 'utf8').includes(command), `${file} must run: ${command}`)
  }
})
