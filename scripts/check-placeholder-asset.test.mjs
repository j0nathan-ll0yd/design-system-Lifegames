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
import {existsSync, globSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs'
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
// File types an app may hold that cannot carry web widget code. Any other type the
// check cannot read fails the scan, so a new component format (.svelte, .vue)
// cannot hide an import.
const INERT_EXTENSIONS = new Set([
  '',
  '.avif',
  '.css',
  '.entitlements',
  '.gif',
  '.ico',
  '.jpeg',
  '.jpg',
  '.json',
  '.less',
  '.lock',
  '.log',
  '.map',
  '.otf',
  '.pbxproj',
  '.plist',
  '.png',
  '.sass',
  '.scss',
  '.sh',
  '.strings',
  '.svg',
  '.swift',
  '.toml',
  '.ttf',
  '.txt',
  '.webmanifest',
  '.webp',
  '.woff',
  '.woff2',
  '.xcconfig',
  '.xcscheme',
  '.xcworkspacedata',
  '.xml',
  '.yaml',
  '.yml'
])

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

// ts.createSourceFile never throws: it recovers and records parseDiagnostics.
// A file it cannot read cleanly would silently drop its imports, so it fails here.
function parse(file, code, kind = scriptKind(file)) {
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, kind)
  const [first] = source.parseDiagnostics
  if (first) {
    const {line} = source.getLineAndCharacterOfPosition(first.start)
    throw new Error(
      `${file}:${line + 1} does not parse: ${ts.flattenDiagnosticMessageText(first.messageText, ' ')} ` +
        `(${source.parseDiagnostics.length} diagnostics), so the check cannot read its imports`
    )
  }
  return source
}

function parsesClean(code) {
  return ts.createSourceFile('block.tsx', code, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX).parseDiagnostics.length === 0
}

const JS_SCRIPT_TYPES = new Set(['', 'module', 'text/javascript', 'application/javascript', 'text/ecmascript', 'application/ecmascript'])

// Astro bundles a <script> unless it is `is:inline`, loads `src`, or carries a
// non-JavaScript `type` such as application/ld+json. Only a bundled script can
// import a module.
function bundledScript(attrs) {
  if (/(?:^|\s)is:inline\b/.test(attrs) || /(?:^|\s)src\s*=/.test(attrs)) {
    return false
  }
  const type = attrs.match(/(?:^|\s)type\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/)
  return !type || JS_SCRIPT_TYPES.has((type[1] ?? type[2] ?? type[3]).trim().toLowerCase())
}

// The bodies of the bundled <script> elements in Astro markup. The tag scan
// honors quotes and `{...}` expressions, so `>` inside an attribute does not end
// the tag, and a self-closing `<script ... />` has no body.
function astroScriptBodies(html, from) {
  const lower = html.toLowerCase()
  const bodies = []
  let at = lower.indexOf('<script', from)
  while (at !== -1) {
    if (!/[\s/>]/.test(html[at + 7] ?? '')) {
      at = lower.indexOf('<script', at + 7)
      continue
    }
    let end = at + 7
    let depth = 0
    let quote = null
    for (; end < html.length; end++) {
      const c = html[end]
      if (quote) {
        quote = c === quote ? null : quote
      } else if (c === '"' || c === "'" || c === '`') {
        quote = c
      } else if (c === '{') {
        depth++
      } else if (c === '}') {
        depth--
      } else if (c === '>' && depth === 0) {
        break
      }
    }
    const attrs = html.slice(at + 7, end)
    if (/\/\s*$/.test(attrs)) {
      at = lower.indexOf('<script', end + 1)
      continue
    }
    const close = lower.indexOf('</script', end + 1)
    const bodyEnd = close === -1 ? html.length : close
    if (bundledScript(attrs)) {
      bodies.push([end + 1, bodyEnd])
    }
    at = lower.indexOf('<script', bodyEnd)
  }
  return bodies
}

// The ESM blocks of an .md or .mdx file, outside fenced code. As in MDX, a block
// starts at a line-leading `import` or `export` and ends at a blank line once it
// parses; an unfinished statement runs on past the blank line.
function mdxEsmBlocks(text) {
  const lines = text.split('\n')
  const offsets = []
  let offset = 0
  for (const line of lines) {
    offsets.push(offset)
    offset += line.length + 1
  }
  const ranges = []
  let fence = null
  let block = null
  const close = (last) => {
    ranges.push([offsets[block], offsets[last] + lines[last].length])
    block = null
  }
  lines.forEach((line, i) => {
    const marker = line.match(/^\s*(`{3,}|~{3,})/)
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) {
        fence = null
      }
    } else if (marker) {
      if (block !== null) {
        close(i - 1)
      }
      fence = marker[1]
    } else if (block === null) {
      if (/^(import|export)\b/.test(line)) {
        block = i
      }
    } else if (line.trim() === '' && parsesClean(lines.slice(block, i).join('\n'))) {
      close(i - 1)
    }
  })
  if (block !== null) {
    close(lines.length - 1)
  }
  return ranges
}

// The module code of a file. An .astro file contributes its frontmatter and its
// bundled <script> bodies; its markup and HTML comments are not code. An .md or
// .mdx file contributes its ESM blocks only, so a fenced usage sample, prose and
// an MDX comment never count as an import.
function moduleCode(file, text) {
  const ext = path.extname(file)
  if (ext === '.astro') {
    const html = text.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ' '))
    const keep = []
    const front = html.match(/^(\s*---\r?\n)([\s\S]*?)\r?\n---/)
    if (front) {
      keep.push([front[1].length, front[1].length + front[2].length])
    }
    keep.push(...astroScriptBodies(html, front ? front[0].length : 0))
    return mask(html, keep)
  }
  if (ext === '.md' || ext === '.mdx') {
    return mask(text, mdxEsmBlocks(text))
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
  const source = parse(file, moduleCode(file, text))
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
    const source = parse(file, readFileSync(file, 'utf8'))
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

// Every file under `dir` whose name matches, outside build output and dependencies.
function* walk(dir, name = /./) {
  for (const entry of readdirSync(dir, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isSymbolicLink()) {
      continue
    }
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) {
        yield* walk(full, name)
      }
    } else if (name.test(entry.name)) {
      yield full
    }
  }
}

function* sourceFiles(dir, name) {
  for (const file of walk(dir, name)) {
    if (SOURCE_EXTENSIONS.has(path.extname(file))) {
      yield file
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

const MODULE_SUFFIXES = ['', '.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.astro']

// A module path as Node or a bundler resolves it: as written, with an extension,
// as a directory index, or a `.js` specifier that names a `.ts` source.
function resolveModuleFile(target) {
  const candidates = [
    ...MODULE_SUFFIXES.map((suffix) => target + suffix),
    ...MODULE_SUFFIXES.slice(1).map((suffix) => path.join(target, 'index' + suffix)),
    target.replace(/\.(m|c)?js$/, '.$1ts')
  ]
  return candidates.find((file) => existsSync(file) && statSync(file).isFile()) ?? null
}

const isTestFile = (file) => /\.(test|spec)\./.test(file) || file.split(path.sep).includes('__tests__')

// The runtime files a workspace package exposes: every `exports`, `main` and
// `module` target, then every relative import those files reach. When a target
// does not exist in the tree (unbuilt output) or the manifest declares none, the
// package's non-test src/ files count too.
function packageFiles(pkgDir) {
  const manifest = JSON.parse(readFileSync(path.join(pkgDir, 'package.json'), 'utf8'))
  const targets = []
  const collect = (value) => {
    if (typeof value === 'string') {
      targets.push(value)
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(collect)
    }
  }
  collect(manifest.exports)
  collect(manifest.main)
  collect(manifest.module)
  const queue = []
  let fallback = targets.length === 0
  for (const target of targets) {
    if (GLOB_CHAR.test(target)) {
      const matches = globSync(target.replace(/^\.\//, ''), {cwd: pkgDir})
      fallback ||= matches.length === 0
      queue.push(...matches.map((match) => path.join(pkgDir, match)))
    } else {
      const file = resolveModuleFile(path.resolve(pkgDir, target))
      fallback ||= file === null
      if (file) {
        queue.push(file)
      }
    }
  }
  const src = path.join(pkgDir, 'src')
  if (fallback && existsSync(src)) {
    queue.push(...[...sourceFiles(src)].filter((file) => !isTestFile(file)))
  }
  const files = new Set()
  while (queue.length > 0) {
    const file = queue.shift()
    if (files.has(file) || !SOURCE_EXTENSIONS.has(path.extname(file))) {
      continue
    }
    files.add(file)
    for (const ref of moduleRefs(file, readFileSync(file, 'utf8'))) {
      const next = ref.kind === 'imports' && ref.specifier.startsWith('.') ? resolveModuleFile(path.resolve(path.dirname(file), ref.specifier)) : null
      if (next && isInside(next, pkgDir)) {
        queue.push(next)
      }
    }
  }
  return [...files]
}

// A workspace package that re-exports or imports web widget code at runtime
// passes it to every app that imports the package. `seen` breaks import cycles.
function packageCarriesWebCode(name, ctx, seen = new Set()) {
  if (ctx.carries.has(name)) {
    return ctx.carries.get(name)
  }
  if (seen.has(name)) {
    return false
  }
  seen.add(name)
  let carries = false
  for (const file of packageFiles(ctx.packages.get(name))) {
    ctx.read.add(file)
    for (const ref of moduleRefs(file, readFileSync(file, 'utf8'))) {
      carries ||= refHitsWebCode(ref, file, null, [], ctx, seen)
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
 * reference that proves it, and every file read to decide it. An app that
 * imports only the web stylesheets, or only types, is not listed. Every file is
 * read, not only up to the first hit, so each one must parse clean; a file the
 * check cannot parse, or a file type it cannot read, fails the scan.
 */
export function scanTree(root) {
  const appsDir = path.join(root, 'apps')
  const webSrc = path.join(root, 'packages/web/src')
  // The published name, read where it is declared rather than restated here.
  const webPackage = JSON.parse(readFileSync(path.join(root, 'packages/web/package.json'), 'utf8')).name
  const ctx = {webSrc, webPackage, packages: workspacePackages(root, webPackage), carries: new Map(), read: new Set()}
  const apps = []
  const unreadable = []
  for (const entry of readdirSync(appsDir, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
    const appDir = path.join(appsDir, entry.name)
    if (!entry.isDirectory() || !existsSync(path.join(appDir, 'package.json'))) {
      continue
    }
    const {aliases, roots, unkeyed} = readConfigs(appDir, webSrc)
    configFiles(appDir).forEach((file) => ctx.read.add(file))
    let evidence = null
    for (const {dir, name} of [{dir: appDir}, ...roots]) {
      for (const file of walk(dir, name)) {
        const ext = path.extname(file)
        if (!SOURCE_EXTENSIONS.has(ext)) {
          if (!INERT_EXTENSIONS.has(ext)) {
            unreadable.push(path.relative(root, file))
          }
          continue
        }
        ctx.read.add(file)
        for (const ref of moduleRefs(file, readFileSync(file, 'utf8'))) {
          if (refHitsWebCode(ref, file, appDir, aliases, ctx, new Set())) {
            evidence ??= `${path.relative(root, file)}:${ref.line} ${ref.kind} '${ref.specifier}'`
          }
        }
      }
    }
    evidence ??= unkeyed[0] ? `${path.relative(root, appDir)}/${unkeyed[0]}` : null
    if (evidence) {
      apps.push({app: path.relative(root, appDir), evidence})
    }
  }
  if (unreadable.length > 0) {
    throw new Error(`the check cannot read these app files, so it cannot tell whether they import web widget code: ${unreadable.join(', ')}`)
  }
  return {apps, read: [...ctx.read].map((file) => path.relative(root, file)).sort()}
}

export function discoverWidgetApps(root) {
  return scanTree(root).apps
}

let scan = {apps: [], read: []}
let scanError = null
try {
  scan = scanTree(repoRoot)
} catch (error) {
  scanError = error
}
const widgetApps = scan.apps

test(`every file the check reads parses clean (${scan.read.length} files)`, () => {
  assert.ifError(scanError)
  assert.ok(scan.read.length > 0, 'the scan read no files')
})

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

    // An MDX import that spans a blank line.
    write('apps/mdxblank/package.json', '{}')
    write('apps/mdxblank/src/a.mdx', "import {\n\n  A\n} from '@scope/web'\n\n<A />\n")
    // A self-closing JSON-LD script, then markup with a backtick and a `/*`, then a bundled script.
    write('apps/selfclosing/package.json', '{}')
    write('apps/selfclosing/src/p.astro',
      "---\n---\n<script type=\"application/ld+json\" set:html={JSON.stringify({a: 1})} />\n<p>use `x and /* here, it's</p>\n<script>\nimport A from '@scope/web'\n</script>\n")
    // `>` inside a script attribute expression does not end the tag.
    write('apps/attrgt/package.json', '{}')
    write('apps/attrgt/src/p.astro', "---\n---\n<script define:vars={{ok: 2 > 1}}>\nimport A from '@scope/web'\n</script>\n")
    // Scripts Astro does not bundle cannot import: is:inline, src, a non-JavaScript type.
    write('apps/unbundled/package.json', '{}')
    write('apps/unbundled/src/p.astro',
      '---\n---\n<script is:inline>import A from \'@scope/web\'</script>\n<script src="/x.js"></script>\n<script type="application/ld+json">{"import": "@scope/web"}</script>\n<script type="importmap">{"imports": {}}</script>\n')
    // A workspace package whose `exports` entry sits outside src/.
    write('packages/rootentry/package.json', JSON.stringify({name: '@scope/rootentry', exports: {'.': './index.ts'}}))
    write('packages/rootentry/index.ts', "export * from './lib/inner'\n")
    write('packages/rootentry/lib/inner.ts', "export * from '@scope/web'\n")
    write('apps/exportsroot/package.json', '{}')
    write('apps/exportsroot/src/p.ts', "import {A} from '@scope/rootentry'\n")
    // A package whose entry does not reach the file that imports web code.
    write('packages/unexported/package.json', JSON.stringify({name: '@scope/unexported', main: './index.js'}))
    write('packages/unexported/index.js', 'export const x = 1\n')
    write('packages/unexported/src/unused.ts', "export * from '@scope/web'\n")
    write('apps/viaunexported/package.json', '{}')
    write('apps/viaunexported/src/p.ts', "import {x} from '@scope/unexported'\n")
    // Inert files only besides the code.
    write('apps/inert/package.json', '{}')
    write('apps/inert/src/a.json', '{}')
    write('apps/inert/Sources/App.swift', 'import SwiftUI\n')

    const found = discoverWidgetApps(root)
    assert.deepEqual(found.map((a) => a.app), [
      'apps/alias',
      'apps/attrgt',
      'apps/cts',
      'apps/exportsroot',
      'apps/findalias',
      'apps/globrel',
      'apps/globroot',
      'apps/mdxblank',
      'apps/mdxreal',
      'apps/minified',
      'apps/pkg',
      'apps/reexport',
      'apps/selfclosing',
      'apps/stories',
      'apps/tmpl',
      'apps/tspaths',
      'apps/unkeyed',
      'apps/urlalias'
    ])
    assert.equal(found.find((a) => a.app === 'apps/selfclosing').evidence, "apps/selfclosing/src/p.astro:6 imports '@scope/web'")
    assert.equal(found.find((a) => a.app === 'apps/mdxreal').evidence, "apps/mdxreal/src/a.mdx:5 imports '@scope/web/widgets/reading/Shelf.astro'")
    assert.match(found.find((a) => a.app === 'apps/unkeyed').evidence, /astro\.config\.mjs:1 points/)
  } finally {
    rmSync(root, {recursive: true, force: true})
  }
})

// Fail-closed known answers. A file the check cannot parse would drop its imports,
// and a file type it cannot read would hide them; both must stop the scan.
function scanFails(files, pattern) {
  const root = mkdtempSync(path.join(tmpdir(), 'placeholder-fail-'))
  try {
    for (const [rel, text] of Object.entries({'packages/web/package.json': JSON.stringify({name: '@scope/web'}), 'apps/x/package.json': '{}', ...files})) {
      mkdirSync(path.dirname(path.join(root, rel)), {recursive: true})
      writeFileSync(path.join(root, rel), text)
    }
    assert.throws(() => scanTree(root), pattern)
  } finally {
    rmSync(root, {recursive: true, force: true})
  }
}

test('a source file that does not parse fails the scan, named by file and line', () => {
  scanFails({'apps/x/src/p.ts': "const s = `oops\nimport A from '@scope/web'\n"}, /apps\/x\/src\/p\.ts:3 does not parse: Unterminated template literal/)
  scanFails({'apps/x/src/p.astro': "---\nconst s = 'oops\nimport A from '@scope/web'\n---\n"}, /p\.astro:2 does not parse/)
  scanFails({'apps/x/src/a.mdx': "import A from '@scope/web'\nprose that is not code\n"}, /a\.mdx:2 does not parse/)
  // After the app's first hit: every file is read, not only up to the evidence.
  scanFails({'apps/x/src/a.ts': "import A from '@scope/web'\n", 'apps/x/src/b.ts': 'const = 1\n'}, /b\.ts:1 does not parse/)
})

test('a config file that does not parse fails the scan', () => {
  scanFails({
    'apps/x/astro.config.mjs': "/* oops\nexport default {alias: {'@w': path.resolve(__dirname, '../../packages/web/src')}}\n",
    'apps/x/src/p.ts': "import W from '@w/widgets/A.astro'\n"
  }, /astro\.config\.mjs:3 does not parse: '\*\/' expected/)
})

test('a workspace package file that does not parse fails the scan', () => {
  scanFails({
    'packages/shared/package.json': JSON.stringify({name: '@scope/shared'}),
    'packages/shared/src/index.ts': 'export const = 1\n',
    'apps/x/src/p.ts': "import {A} from '@scope/shared'\n"
  }, /shared\/src\/index\.ts:1 does not parse/)
})

test('an app file type the check cannot read fails the scan', () => {
  scanFails({'apps/x/src/a.svelte': "<script>\nimport A from '@scope/web'\n</script>\n"}, /cannot read these app files.*apps\/x\/src\/a\.svelte/)
  scanFails({'apps/x/src/b.vue': '<template></template>\n'}, /apps\/x\/src\/b\.vue/)
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
