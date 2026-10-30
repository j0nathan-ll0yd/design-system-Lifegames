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
import ts from 'typescript'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CANONICAL = path.join(repoRoot, 'packages/web/src/assets/no-cover.svg')

// Must match PLACEHOLDER_IMAGE_SRC in packages/web/src/runtime/image-utils.ts.
const PLACEHOLDER_IMAGE_SRC = '/images/no-cover.svg'

const SOURCE_EXTENSIONS = new Set(['.astro', '.md', '.mdx', '.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'])
const SKIPPED_DIRS = new Set(['node_modules', 'dist', 'public', '.astro', 'storybook-static', '__snapshots__'])
// A stylesheet cannot emit the placeholder; only widget, island and runtime code can.
const STYLESHEET = /\.(css|scss|sass|less)$/
const GLOB_CHAR = /[*?{[]/

function configFiles(appDir) {
  const found = []
  for (const dir of [appDir, path.join(appDir, '.storybook')]) {
    if (!existsSync(dir)) {
      continue
    }
    for (const name of readdirSync(dir).sort()) {
      if (/^(.*\.config|main)\.(m?[jt]s|c[jt]s)$/.test(name)) {
        found.push(path.join(dir, name))
      }
    }
  }
  return found
}

function scriptKind(file) {
  const ext = path.extname(file)
  if (ext === '.tsx' || ext === '.mdx' || ext === '.md') {
    return ts.ScriptKind.TSX
  }
  if (ext === '.jsx') {
    return ts.ScriptKind.JSX
  }
  return ['.js', '.mjs', '.cjs'].includes(ext) ? ts.ScriptKind.JS : ts.ScriptKind.TS
}

// Blanks every character outside `keep` except newlines, so line numbers survive.
function mask(text, keep) {
  const out = text.replace(/[^\n]/g, ' ').split('')
  for (const [from, to] of keep) {
    for (let i = from; i < to; i++) {
      out[i] = text[i]
    }
  }
  return out.join('')
}

// The module code of a file. An .astro file contributes its frontmatter and its
// <script> bodies; its markup and HTML comments are not code. An .md or .mdx file
// contributes its top-level ESM paragraphs only, so a fenced usage sample, prose
// and an MDX comment never count as an import.
function moduleCode(file, text) {
  const ext = path.extname(file)
  if (ext === '.astro') {
    const html = text.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ' '))
    const keep = []
    const front = html.match(/^\s*---\r?\n([\s\S]*?)\r?\n---/)
    if (front) {
      const at = html.indexOf(front[1])
      keep.push([at, at + front[1].length])
    }
    for (const m of html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
      const at = m.index + m[0].indexOf('>') + 1
      keep.push([at, at + m[1].length])
    }
    return mask(html, keep)
  }
  if (ext === '.md' || ext === '.mdx') {
    const keep = []
    let offset = 0
    let fence = null
    let esm = false
    for (const line of text.split('\n')) {
      const marker = line.match(/^\s*(`{3,}|~{3,})/)
      if (fence) {
        if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) {
          fence = null
        }
      } else if (marker) {
        fence = marker[1]
        esm = false
      } else {
        if (/^(import|export)\b/.test(line)) {
          esm = true
        } else if (line.trim() === '') {
          esm = false
        }
        if (esm) {
          keep.push([offset, offset + line.length])
        }
      }
      offset += line.length + 1
    }
    return mask(text, keep)
  }
  return text
}

function stringValue(node) {
  return node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : null
}

function isImportMetaGlob(expr) {
  return ts.isPropertyAccessExpression(expr) && expr.name.text === 'glob' && ts.isMetaProperty(expr.expression) &&
    expr.expression.keywordToken === ts.SyntaxKind.ImportKeyword
}

function isTypeOnlyImport(node) {
  const clause = node.importClause
  if (!clause) {
    return false
  }
  if (clause.isTypeOnly) {
    return true
  }
  const named = clause.namedBindings
  return !clause.name && named && ts.isNamedImports(named) && named.elements.length > 0 && named.elements.every((e) => e.isTypeOnly)
}

// Every runtime module reference in a file: static imports and re-exports (not
// type-only ones), `import()`, `require()`, and `import.meta.glob` patterns. A
// template-literal `import()` contributes its static head as a prefix.
function moduleRefs(file, text) {
  const source = ts.createSourceFile(file, moduleCode(file, text), ts.ScriptTarget.Latest, true, scriptKind(file))
  const refs = []
  const add = (node, kind, specifier) => {
    if (specifier) {
      refs.push({kind, specifier, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1})
    }
  }
  const visit = (node) => {
    if (ts.isImportDeclaration(node) && !isTypeOnlyImport(node)) {
      add(node, 'imports', stringValue(node.moduleSpecifier))
    } else if (ts.isExportDeclaration(node) && !node.isTypeOnly && node.moduleSpecifier) {
      add(node, 'imports', stringValue(node.moduleSpecifier))
    } else if (ts.isImportEqualsDeclaration(node) && !node.isTypeOnly && ts.isExternalModuleReference(node.moduleReference)) {
      add(node, 'imports', stringValue(node.moduleReference.expression))
    } else if (ts.isCallExpression(node)) {
      const [arg] = node.arguments
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require')) {
        add(node, 'imports', stringValue(arg) ?? (arg && ts.isTemplateExpression(arg) ? arg.head.text : null))
      } else if (isImportMetaGlob(node.expression) && arg) {
        for (const el of ts.isArrayLiteralExpression(arg) ? arg.elements : [arg]) {
          add(node, 'globs', stringValue(el))
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return refs
}

// The alias key a config string belongs to: the property that holds it, or the
// `find` of a `{find, replacement}` entry. Null when it sits in a plain list.
function aliasKey(node) {
  for (let n = node.parent; n; n = n.parent) {
    if (ts.isArrayLiteralExpression(n)) {
      return null
    }
    if (ts.isPropertyAssignment(n)) {
      const find = n.parent.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText().replace(/['"]/g, '') === 'find')
      if (find) {
        return stringValue(find.initializer) ?? `/${find.initializer.getText()}/`
      }
      return ts.isIdentifier(n.name) || ts.isStringLiteral(n.name) ? n.name.text : null
    }
  }
  return null
}

/**
 * What an app's configs say about packages/web/src. Any config string that
 * resolves into it is an alias target: object form, `{find, replacement}`, a
 * `new URL(..., import.meta.url)` wrapper and tsconfig `paths` all count. A
 * target with no readable alias key marks the app directly, which errs toward
 * checking an app rather than skipping it. Glob strings that leave the app,
 * such as Storybook `stories`, are extra source roots.
 */
function readConfigs(appDir, webSrc) {
  const aliases = new Set()
  const roots = []
  const unkeyed = []
  for (const file of configFiles(appDir)) {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, scriptKind(file))
    const visit = (node) => {
      const value = stringValue(node)
      if (value !== null && (value.startsWith('.') || path.isAbsolute(value)) && !STYLESHEET.test(value)) {
        const target = path.resolve(path.dirname(file), value)
        if (GLOB_CHAR.test(value)) {
          const dir = path.resolve(path.dirname(file), value.slice(0, value.search(GLOB_CHAR)))
          if (value.startsWith('.') && existsSync(dir) && !isInside(dir, appDir)) {
            roots.push({dir, name: basenamePattern(value)})
          }
        } else if (isInside(target, webSrc)) {
          const key = aliasKey(node)
          if (key) {
            aliases.add(key)
          } else {
            unkeyed.push(
              `${path.relative(appDir, file)}:${
                source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
              } points '${value}' into packages/web/src`
            )
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  for (const name of readdirSync(appDir).filter((n) => /^tsconfig(\..+)?\.json$/.test(n)).sort()) {
    const file = path.join(appDir, name)
    const {config, error} = ts.parseConfigFileTextToJson(file, readFileSync(file, 'utf8'))
    assert.ok(!error, `${path.relative(appDir, file)} does not parse`)
    const options = config?.compilerOptions ?? {}
    const base = path.resolve(appDir, options.baseUrl ?? '.')
    for (const [key, targets] of Object.entries(options.paths ?? {})) {
      if (targets.some((t) => isInside(path.resolve(base, t.replace(/\*.*$/, '')), webSrc))) {
        aliases.add(key.replace(/\/?\*$/, ''))
      }
    }
  }
  return {aliases: [...aliases], roots, unkeyed}
}

// The last segment of a glob as a RegExp: `*` and `{a,b}` only.
function basenamePattern(glob) {
  const segment = glob.slice(glob.lastIndexOf('/') + 1)
  const body = segment.replace(/[.+^$()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\{([^}]*)\}/g, (_, alts) => `(?:${alts.split(',').join('|')})`)
  return new RegExp(`^${body}$`)
}

function* sourceFiles(dir, name = /./) {
  for (const entry of readdirSync(dir, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
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

// Vite resolves a leading `/` against the project root (the app) and a relative
// pattern against the importing file; any other pattern starts with an alias.
function globsWidgetCode(pattern, fromFile, appDir, webPackage, aliases, webSrc) {
  if (pattern.startsWith('!') || STYLESHEET.test(pattern)) {
    return false
  }
  const base = pattern.slice(0, pattern.search(GLOB_CHAR) === -1 ? pattern.length : pattern.search(GLOB_CHAR))
  if (!pattern.startsWith('/') && !pattern.startsWith('.')) {
    return importsWidgetCode(base, fromFile, webPackage, aliases, webSrc)
  }
  const dir = pattern.startsWith('/') ? path.join(appDir, base) : path.resolve(path.dirname(fromFile), base)
  return isInside(dir, webSrc) || isInside(webSrc, dir)
}

// The workspace packages other than the web package, by published name.
function workspacePackages(root, webPackage) {
  const byName = new Map()
  const dir = path.join(root, 'packages')
  for (const entry of existsSync(dir) ? readdirSync(dir, {withFileTypes: true}) : []) {
    const manifest = path.join(dir, entry.name, 'package.json')
    if (entry.isDirectory() && existsSync(manifest)) {
      const {name} = JSON.parse(readFileSync(manifest, 'utf8'))
      if (name && name !== webPackage) {
        byName.set(name, path.join(dir, entry.name))
      }
    }
  }
  return byName
}

// A workspace package that re-exports or imports web widget code at runtime
// passes it to every app that imports the package. Only its src/ counts, never
// its tests or build scripts. `seen` breaks import cycles.
function packageCarriesWebCode(name, ctx, seen = new Set()) {
  if (ctx.carries.has(name)) {
    return ctx.carries.get(name)
  }
  if (seen.has(name)) {
    return false
  }
  seen.add(name)
  const src = path.join(ctx.packages.get(name), 'src')
  let carries = false
  scan: for (const file of existsSync(src) ? sourceFiles(src) : []) {
    if (/\.test\.|\.spec\./.test(file) || file.split(path.sep).includes('__tests__')) {
      continue
    }
    for (const ref of moduleRefs(file, readFileSync(file, 'utf8'))) {
      if (refHitsWebCode(ref, file, null, [], ctx, seen)) {
        carries = true
        break scan
      }
    }
  }
  ctx.carries.set(name, carries)
  return carries
}

function workspaceName(specifier, packages) {
  const parts = specifier.split('/')
  const name = specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
  return packages.has(name) ? name : null
}

function refHitsWebCode(ref, file, appDir, aliases, ctx, seen) {
  const direct = ref.kind === 'globs'
    ? appDir !== null && globsWidgetCode(ref.specifier, file, appDir, ctx.webPackage, aliases, ctx.webSrc)
    : importsWidgetCode(ref.specifier, file, ctx.webPackage, aliases, ctx.webSrc)
  if (direct) {
    return true
  }
  const name = ref.kind === 'imports' && !STYLESHEET.test(ref.specifier) ? workspaceName(ref.specifier, ctx.packages) : null
  return name !== null && packageCarriesWebCode(name, ctx, seen)
}

/**
 * Every apps/* package that renders web widget code, each with the first
 * reference that proves it. An app that imports only the web stylesheets, or
 * only types, is not listed.
 */
export function discoverWidgetApps(root) {
  const appsDir = path.join(root, 'apps')
  const webSrc = path.join(root, 'packages/web/src')
  // The published name, read where it is declared rather than restated here.
  const webPackage = JSON.parse(readFileSync(path.join(root, 'packages/web/package.json'), 'utf8')).name
  const ctx = {webSrc, webPackage, packages: workspacePackages(root, webPackage), carries: new Map()}
  const apps = []
  for (const entry of readdirSync(appsDir, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
    const appDir = path.join(appsDir, entry.name)
    if (!entry.isDirectory() || !existsSync(path.join(appDir, 'package.json'))) {
      continue
    }
    const {aliases, roots, unkeyed} = readConfigs(appDir, webSrc)
    let evidence = null
    scan: for (const {dir, name} of [{dir: appDir}, ...roots]) {
      for (const file of sourceFiles(dir, name)) {
        for (const ref of moduleRefs(file, readFileSync(file, 'utf8'))) {
          if (refHitsWebCode(ref, file, appDir, aliases, ctx, new Set())) {
            evidence = `${path.relative(root, file)}:${ref.line} ${ref.kind} '${ref.specifier}'`
            break scan
          }
        }
      }
    }
    evidence ??= unkeyed[0] ? `${path.relative(root, appDir)}/${unkeyed[0]}` : null
    if (evidence) {
      apps.push({app: path.relative(root, appDir), evidence})
    }
  }
  return apps
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

    // import.meta.glob with a leading `/`, which Vite resolves against the app root.
    write('apps/globroot/package.json', '{}')
    write('apps/globroot/src/p.astro', "---\nconst m = import.meta.glob('/../../packages/web/src/widgets/**/*.astro', {eager: true})\n---\n")
    // import.meta.glob with an array of relative patterns, resolved against the file.
    write('apps/globrel/package.json', '{}')
    write('apps/globrel/src/p.ts', "const m = import.meta.glob(['../../../packages/web/src/widgets/**/*.astro', '!**/Skip.astro'])\n")
    // A glob over web stylesheets only.
    write('apps/globcss/package.json', '{}')
    write('apps/globcss/src/p.ts', "const m = import.meta.glob('/../../packages/web/src/styles/*.css')\n")
    // Alias forms: `new URL(..., import.meta.url)`, `{find, replacement}`, tsconfig `paths` (JSONC).
    write('apps/urlalias/package.json', '{}')
    write('apps/urlalias/vite.config.ts', "export default {resolve: {alias: {'@w': fileURLToPath(new URL('../../packages/web/src', import.meta.url))}}}\n")
    write('apps/urlalias/src/p.ts', "import W from '@w/widgets/reading/Shelf.astro'\n")
    write('apps/findalias/package.json', '{}')
    write('apps/findalias/vite.config.mts',
      "export default {resolve: {alias: [{find: '@w', replacement: path.resolve(__dirname, '../../packages/web/src')}]}}\n")
    write('apps/findalias/src/p.ts', "import W from '@w/widgets/reading/Shelf.astro'\n")
    write('apps/tspaths/package.json', '{}')
    write('apps/tspaths/tsconfig.json', '{\n  // JSONC\n  "compilerOptions": {"paths": {"@w/*": ["../../packages/web/src/*"]}}\n}\n')
    write('apps/tspaths/src/p.ts', "import W from '@w/widgets/reading/Shelf.astro'\n")
    // A config string into packages/web/src with no alias key: the app is checked.
    write('apps/unkeyed/package.json', '{}')
    write('apps/unkeyed/astro.config.mjs', "export default {integrations: [widgets('../../packages/web/src/widgets')]}\n")
    // .cts with require(), a template-literal import(), a minified import.
    write('apps/cts/package.json', '{}')
    write('apps/cts/src/p.cts', "const w = require('@scope/web')\n")
    write('apps/tmpl/package.json', '{}')
    write('apps/tmpl/src/p.ts', 'const m = await import(`@scope/web/widgets/${name}`)\n')
    write('apps/minified/package.json', '{}')
    write('apps/minified/src/p.js', "import{A}from'@scope/web'\n")
    // Through another workspace package that re-exports web code at runtime.
    write('packages/shared/package.json', JSON.stringify({name: '@scope/shared'}))
    write('packages/shared/src/index.ts', "export * from '@scope/web'\n")
    write('apps/reexport/package.json', '{}')
    write('apps/reexport/src/p.ts', "import {A} from '@scope/shared'\n")
    // A workspace package that touches web code only in types and tests carries none.
    write('packages/typesonly/package.json', JSON.stringify({name: '@scope/typesonly'}))
    write('packages/typesonly/src/index.ts', "import type {A} from '@scope/web/runtime/a'\nexport const x = 1\n")
    write('packages/typesonly/src/__tests__/a.test.ts', "import {A} from '@scope/web'\n")
    write('apps/viatypes/package.json', '{}')
    write('apps/viatypes/src/p.ts', "import {x} from '@scope/typesonly'\n")
    // Not code: a fenced usage sample, prose, comments, HTML comments and type-only imports.
    write('apps/notcode/package.json', '{}')
    write('apps/notcode/src/a.mdx',
      "# Usage\n\nSee `packages/web/src/widgets/**/*.astro`.\n\n```astro\n---\nimport {Card} from '@scope/web'\n---\n```\n\n{/* import A from '@scope/web' */}\n")
    write('apps/notcode/src/b.ts', "/*\nimport A from '@scope/web'\n*/\n// import B from '@scope/web'\nconst s = 'import C from \"@scope/web\"'\n")
    write('apps/notcode/src/c.ts', "import type {P} from '@scope/web'\nimport {type Q} from '@scope/web/runtime'\nexport type {R} from '@scope/web'\n")
    write('apps/notcode/src/d.astro', "---\n---\n<!-- <script>import A from '@scope/web'</script> -->\n<p>import A from '@scope/web'</p>\n")
    // A real import after a fenced sample: the evidence names the real line.
    write('apps/mdxreal/package.json', '{}')
    write('apps/mdxreal/src/a.mdx',
      "```astro\nimport {Card} from '@scope/web'\n```\n\nimport Shelf from '@scope/web/widgets/reading/Shelf.astro'\n\n<Shelf />\n")

    const found = discoverWidgetApps(root)
    assert.deepEqual(found.map((a) => a.app), [
      'apps/alias',
      'apps/cts',
      'apps/findalias',
      'apps/globrel',
      'apps/globroot',
      'apps/mdxreal',
      'apps/minified',
      'apps/pkg',
      'apps/reexport',
      'apps/stories',
      'apps/tmpl',
      'apps/tspaths',
      'apps/unkeyed',
      'apps/urlalias'
    ])
    assert.equal(found.find((a) => a.app === 'apps/mdxreal').evidence, "apps/mdxreal/src/a.mdx:5 imports '@scope/web/widgets/reading/Shelf.astro'")
    assert.match(found.find((a) => a.app === 'apps/unkeyed').evidence, /astro\.config\.mjs:1 points/)
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
