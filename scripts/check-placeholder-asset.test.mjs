// Guards the first-party image placeholder (atlas decision 0086).
//
// The canonical asset ships inside the published package at
// packages/web/src/assets/no-cover.svg. Every in-repo app that renders the web
// widgets serves its own copy from <app>/public/images/no-cover.svg, because a
// package's src/ is not on any static route. Each copy can drift or go missing,
// so the identity is asserted here rather than left to a comment.
//
// The apps are DISCOVERED, never hand-listed. apps/docs rendered the widgets for
// months with no copy at all: its Bookshelf page painted 36 broken images while
// this file checked only apps/portfolio.

import {test} from 'node:test'
import assert from 'node:assert/strict'
import {existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {fileURLToPath} from 'node:url'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CANONICAL = path.join(repoRoot, 'packages/web/src/assets/no-cover.svg')

// Must match PLACEHOLDER_IMAGE_SRC in packages/web/src/runtime/image-utils.ts.
const PLACEHOLDER_IMAGE_SRC = '/images/no-cover.svg'

const SOURCE_EXTENSIONS = new Set(['.astro', '.mdx', '.ts', '.tsx', '.mts', '.js', '.jsx', '.mjs'])
const SKIPPED_DIRS = new Set(['node_modules', 'dist', 'public', '.astro', 'storybook-static', '__snapshots__'])
// A stylesheet cannot emit the placeholder; only widget, island and runtime code can.
const STYLESHEET = /\.(css|scss|sass|less)$/

// `import x from 'spec'`, `import 'spec'`, `export ... from 'spec'`, `import('spec')`.
// Line-leading, so a CSS `@import` and a path quoted in prose do not count.
const IMPORT_SPECIFIER = /^\s*(?:import|export)\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]\s*\)/gm

function configFiles(appDir) {
  const found = []
  for (const dir of [appDir, path.join(appDir, '.storybook')]) {
    if (!existsSync(dir)) {
      continue
    }
    for (const name of readdirSync(dir)) {
      if (/^(.*\.config|main)\.(m?[jt]s|cjs)$/.test(name)) {
        found.push(path.join(dir, name))
      }
    }
  }
  return found
}

// Aliases an app declares as `'@name': path.resolve(__dirname, '<dir>')` that point into packages/web/src.
function webAliases(appDir, webSrc) {
  const aliases = []
  for (const file of configFiles(appDir)) {
    const text = readFileSync(file, 'utf8')
    for (const m of text.matchAll(/['"](@[\w-]+)['"]\s*:\s*path\.resolve\(\s*__dirname\s*,\s*['"]([^'"]+)['"]\s*\)/g)) {
      const target = path.resolve(path.dirname(file), m[2])
      if (isInside(target, webSrc)) {
        aliases.push(m[1])
      }
    }
  }
  return aliases
}

// Files outside the app that its config pulls in by glob, such as Storybook's
// `stories` entries: a story under packages/web/stories renders inside the app.
// Each root carries the glob's file-name pattern, so only matching files count.
function globbedRoots(appDir) {
  const roots = []
  for (const file of configFiles(appDir)) {
    const text = readFileSync(file, 'utf8')
    for (const m of text.matchAll(/['"](\.{1,2}\/[^'"]*\*[^'"]*)['"]/g)) {
      const glob = m[1]
      const dir = path.resolve(path.dirname(file), glob.slice(0, glob.search(/[*{]/)))
      if (existsSync(dir) && !isInside(dir, appDir)) {
        roots.push({dir, name: basenamePattern(glob)})
      }
    }
  }
  return roots
}

// The last segment of a glob as a RegExp: `*` and `{a,b}` only.
function basenamePattern(glob) {
  const segment = glob.slice(glob.lastIndexOf('/') + 1)
  const body = segment.replace(/[.+^$()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\{([^}]*)\}/g, (_, alts) => `(?:${alts.split(',').join('|')})`)
  return new RegExp(`^${body}$`)
}

function* sourceFiles(dir, name = /./) {
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    if (entry.isSymbolicLink()) {
      continue
    }
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) {
        yield* sourceFiles(full, name)
      }
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name)) && name.test(entry.name)) {
      yield full
    }
  }
}

function isInside(target, dir) {
  const rel = path.relative(dir, target)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

function importsWidgetCode(specifier, fromFile, webPackage, aliases, webSrc) {
  if (STYLESHEET.test(specifier)) {
    return false
  }
  if (specifier === webPackage || specifier.startsWith(webPackage + '/')) {
    return true
  }
  if (aliases.some((a) => specifier === a || specifier.startsWith(a + '/'))) {
    return true
  }
  if (specifier.startsWith('.')) {
    return isInside(path.resolve(path.dirname(fromFile), specifier), webSrc)
  }
  return false
}

/**
 * Every apps/* package that renders web widget code, each with the first import
 * that proves it. An app that imports only the web stylesheets is not listed.
 */
export function discoverWidgetApps(root) {
  const appsDir = path.join(root, 'apps')
  const webSrc = path.join(root, 'packages/web/src')
  // The published name, read where it is declared rather than restated here.
  const webPackage = JSON.parse(readFileSync(path.join(root, 'packages/web/package.json'), 'utf8')).name
  const apps = []
  for (const entry of readdirSync(appsDir, {withFileTypes: true})) {
    const appDir = path.join(appsDir, entry.name)
    if (!entry.isDirectory() || !existsSync(path.join(appDir, 'package.json'))) {
      continue
    }
    const aliases = webAliases(appDir, webSrc)
    let evidence = null
    for (const {dir, name} of [{dir: appDir}, ...globbedRoots(appDir)]) {
      for (const file of sourceFiles(dir, name)) {
        for (const m of readFileSync(file, 'utf8').matchAll(IMPORT_SPECIFIER)) {
          const specifier = m[1] ?? m[2]
          if (importsWidgetCode(specifier, file, webPackage, aliases, webSrc)) {
            evidence = `${path.relative(root, file)} imports '${specifier}'`
            break
          }
        }
        if (evidence) {
          break
        }
      }
      if (evidence) {
        break
      }
    }
    if (evidence) {
      apps.push({app: path.relative(root, appDir), evidence})
    }
  }
  return apps.sort((a, b) => a.app.localeCompare(b.app))
}

const widgetApps = discoverWidgetApps(repoRoot)

test('discovery finds at least one app that renders the web widgets', () => {
  assert.ok(widgetApps.length > 0, 'no apps/* package imports widget code; discovery is broken, not the tree')
})

for (const {app, evidence} of widgetApps) {
  test(`${app} serves ${PLACEHOLDER_IMAGE_SRC} byte-identical to the canonical asset (${evidence})`, () => {
    for (const file of configFiles(path.join(repoRoot, app))) {
      assert.doesNotMatch(readFileSync(file, 'utf8'), /\bpublicDir\b/,
        `${path.relative(repoRoot, file)} moves the static root; this check assumes ${app}/public`)
    }
    const served = path.join(repoRoot, app, 'public', PLACEHOLDER_IMAGE_SRC)
    assert.ok(existsSync(served), `${path.relative(repoRoot, served)} is missing; ${app} renders broken placeholder images`)
    assert.deepEqual(readFileSync(served), readFileSync(CANONICAL), `${path.relative(repoRoot, served)} drifted from packages/web/src/assets/no-cover.svg`)
  })
}

// Known answers for the discovery itself. Without them a classifier that stopped
// matching would shrink the app list, and the loop above would pass on fewer apps.
test('discovery classifies apps by what they import, not by name', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'placeholder-discovery-'))
  const write = (rel, text) => {
    mkdirSync(path.dirname(path.join(root, rel)), {recursive: true})
    writeFileSync(path.join(root, rel), text)
  }
  try {
    write('packages/web/package.json', JSON.stringify({name: '@scope/web'}))
    write('packages/web/src/widgets/reading/Shelf.astro', '---\n---\n')
    write('packages/web/stories/Shelf.stories.ts', "import {render} from '../src/runtime/render'\n")
    write('packages/web/stories/Styles.stories.ts', "import '../src/styles/a.css'\n")
    // Inside a globbed root but not a story: the glob's file-name pattern excludes it.
    write('packages/web/src/widgets/reading/Shelf.ts', "import {x} from '../../runtime/x'\n")
    // Alias into packages/web/src, imported from a page.
    write('apps/alias/package.json', '{}')
    write('apps/alias/astro.config.mjs',
      "export default {vite: {resolve: {alias: {'@widgets': path.resolve(__dirname, '../../packages/web/src/widgets')}}}}\n")
    write('apps/alias/src/pages/a.astro', "---\nimport Shelf from '@widgets/reading/Shelf.astro'\n---\n")
    // The package name, from an inline <script>.
    write('apps/pkg/package.json', '{}')
    write('apps/pkg/src/pages/b.astro', "<script>\n  import {x} from '@scope/web/runtime'\n</script>\n")
    // Stories pulled in by glob from outside the app.
    write('apps/stories/package.json', '{}')
    write('apps/stories/.storybook/main.ts', "export default {stories: ['../../../packages/web/stories/**/*.stories.ts']}\n")
    // A story glob over the widget tree that matches no story file.
    write('apps/widgetglob/package.json', '{}')
    write('apps/widgetglob/.storybook/main.ts', "export default {stories: ['../../../packages/web/src/widgets/**/*.stories.{ts,tsx}']}\n")
    // Stylesheets only: it can never request the placeholder.
    write('apps/styles/package.json', '{}')
    write('apps/styles/src/a.ts', "import '@scope/web/styles/components.css'\n")
    write('apps/styles/src/b.astro', "<style>\n  @import '@scope/web/styles/layout.css';\n</style>\n<p>see packages/web/src/widgets</p>\n")
    // An alias that does not point into packages/web/src.
    write('apps/other/package.json', '{}')
    write('apps/other/astro.config.mjs', "export default {alias: {'@widgets': path.resolve(__dirname, './src/widgets')}}\n")
    write('apps/other/src/c.ts', "import w from '@widgets/thing'\n")
    // No package.json: not an app.
    write('apps/loose/src/d.ts', "import x from '@scope/web'\n")

    assert.deepEqual(discoverWidgetApps(root).map((a) => a.app), ['apps/alias', 'apps/pkg', 'apps/stories'])
  } finally {
    rmSync(root, {recursive: true, force: true})
  }
})

// The gate this file was missing. It asserted the two copies were identical and
// correctly placed, but never that the bytes are a RENDERABLE image -- so 3.0.0
// shipped a placeholder that no browser could decode. An `--` inside an XML
// comment is illegal, which makes the SVG malformed; `fetch` still returns 200
// with the right Content-Type, and only an <img> decode reveals it. The
// end-to-end proof (does it paint?) is
// packages/web/tests/browser/image-fallback.browser.test.ts; this is the cheap
// fast-fail that does not need a browser.
test('the placeholder is well-formed XML, so an <img> can actually decode it', () => {
  const svg = readFileSync(CANONICAL, 'utf8')
  for (const comment of svg.matchAll(/<!--([\s\S]*?)-->/g)) {
    assert.ok(!comment[1].includes('--'), 'an XML comment may not contain "--"; this SVG will not decode in an <img>')
  }
  assert.ok(!svg.includes('--!>'), 'malformed XML comment terminator')
  assert.match(svg.trimStart(), /^<svg\b/, 'the placeholder must be a standalone <svg> document')
})

test('the runtime placeholder constant is same-origin and unchanged', () => {
  const source = readFileSync(path.join(repoRoot, 'packages/web/src/runtime/image-utils.ts'), 'utf8')
  const match = source.match(/export const PLACEHOLDER_IMAGE_SRC = '([^']+)'/)
  assert.ok(match, 'PLACEHOLDER_IMAGE_SRC not found in image-utils.ts')
  assert.equal(match[1], PLACEHOLDER_IMAGE_SRC)
  assert.ok(match[1].startsWith('/'), 'the placeholder must be a same-origin path, never an absolute URL')
})
