// Storybook loads the website's stylesheet set, in its order, so the visual gate
// measures the render production ships. Before this, it loaded a set no production page
// loaded: no effects, no a11y, no layout, and tokens/animations, which no page loads.
//
// CI here cannot read the website repo, so this list is a committed copy of
// j0nathan-ll0yd.github.io src/layouts/Dashboard.astro:294-302 (the processed global
// style block) and :428 (layout.css), read at website commit 4c6bf398. Update it in the
// same change that adopts a website layout change.
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const WEBSITE_STYLESHEETS = [
  '@j0nathan-ll0yd/tokens/preamble',
  '@j0nathan-ll0yd/tokens/fonts',
  '@j0nathan-ll0yd/tokens/css.layered',
  '@j0nathan-ll0yd/tokens/compat',
  '@j0nathan-ll0yd/web/styles/components.css',
  '@j0nathan-ll0yd/tokens/effects',
  '@j0nathan-ll0yd/tokens/reset',
  '@j0nathan-ll0yd/web/styles/a11y.css',
  '@j0nathan-ll0yd/web/styles/view-transitions.css',
  '@j0nathan-ll0yd/web/styles/layout.css'
]

/** Files the website layout does not load, each because a story needs it. preview.ts says why. */
const STORYBOOK_ONLY = ['@j0nathan-ll0yd/tokens/shadcn', '@j0nathan-ll0yd/web/styles/primitives.css']

/** The CSS entrypoints a source file imports, in order. */
function stylesheetImports(source) {
  return [...source.matchAll(/^import '([^']+)';?$/gm)].map((m) => m[1])
}

function read(path) {
  return readFileSync(new URL(path, new URL('..', import.meta.url)), 'utf8')
}

test('Storybook loads the website set in its order, then only the listed additions', () => {
  assert.deepEqual(stylesheetImports(read('apps/storybook/.storybook/preview.ts')), [...WEBSITE_STYLESHEETS, ...STORYBOOK_ONLY])
})

test('preview.ts justifies each addition', () => {
  const preview = read('apps/storybook/.storybook/preview.ts')
  assert.match(preview, /- tokens\/shadcn: /)
  assert.match(preview, /- primitives\.css: /)
  assert.match(preview, /Dashboard\.astro:294-302/)
})

test('the behavioral suite renders the same set in the same order', () => {
  // tests/browser/fail-visible.test.ts asserts motion on this page, and fonts load there too.
  const fixture = stylesheetImports(read('packages/web/tests/browser/fixture-app/src/pages/fail-visible-website.astro'))
  const asEntrypoint = (specifier) => {
    const web = specifier.match(/\/src\/styles\/(.+)$/)
    if (web) {
      return `@j0nathan-ll0yd/web/styles/${web[1]}`
    }
    const token = specifier.match(/\/tokens\/(?:src|dist)\/(.+)\.css$/)
    return token ? `@j0nathan-ll0yd/tokens/${token[1] === 'tokens-layered' ? 'css.layered' : token[1]}` : specifier
  }
  assert.deepEqual(fixture.map(asEntrypoint), WEBSITE_STYLESHEETS)
})

test('every listed entrypoint resolves to a file in its package', () => {
  const tokens = JSON.parse(read('packages/tokens/package.json')).exports
  for (const entrypoint of [...WEBSITE_STYLESHEETS, ...STORYBOOK_ONLY]) {
    const token = entrypoint.match(/^@j0nathan-ll0yd\/tokens\/(.+)$/)
    if (token) {
      assert.ok(typeof tokens[`./${token[1]}`] === 'string', `${entrypoint} is not exported`)
    } else {
      const name = entrypoint.replace('@j0nathan-ll0yd/web/styles/', '')
      assert.ok(read(`packages/web/src/styles/${name}`).length > 0, `${entrypoint} is empty`)
    }
  }
})

test('can fail: a dropped, a reordered and an extra import each red', () => {
  const expected = [...WEBSITE_STYLESHEETS, ...STORYBOOK_ONLY]
  const preview = read('apps/storybook/.storybook/preview.ts')
  const dropped = preview.replace(`import '@j0nathan-ll0yd/tokens/effects'\n`, '')
  const reordered = preview.replace(`import '@j0nathan-ll0yd/tokens/effects'\nimport '@j0nathan-ll0yd/tokens/reset'\n`,
    `import '@j0nathan-ll0yd/tokens/reset'\nimport '@j0nathan-ll0yd/tokens/effects'\n`)
  const extra = `${preview}\nimport '@j0nathan-ll0yd/tokens/animations'\n`
  for (const mutant of [dropped, reordered, extra]) {
    assert.notEqual(mutant, preview, 'the mutation applies')
    assert.notDeepEqual(stylesheetImports(mutant), expected)
  }
})
