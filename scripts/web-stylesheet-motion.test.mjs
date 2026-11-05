// Every web stylesheet is self-contained for motion. A consumer that loads one gets
// every keyframe it names, through the file itself or its @import chain, and every
// animation it names has a prefers-reduced-motion gate. No keyframe has two definitions.
//
// The class under guard: components.css named keyframes that lived only in
// tokens/animations, which the website never loaded. Its LIVE dot, system dot, avatar
// glow, name glow and Reading Feed entry never moved in production, and no gate saw it.
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readdirSync, readFileSync} from 'node:fs'
import {dirname, join, relative, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const STYLES = 'packages/web/src/styles'
const TOKENS = 'packages/tokens'
const TOKENS_PACKAGE = '@j0nathan-ll0yd/tokens/'

/** Keywords of the `animation` shorthand that are not an animation name. */
const SHORTHAND_KEYWORDS = new Set([
  'none',
  'infinite',
  'normal',
  'reverse',
  'alternate',
  'alternate-reverse',
  'forwards',
  'backwards',
  'both',
  'running',
  'paused',
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'linear',
  'step-start',
  'step-end'
])
const CSS_WIDE = new Set(['initial', 'inherit', 'unset', 'revert', 'revert-layer'])

/**
 * A selector whose gate is not an `animation: none` on the same selector.
 * view-transitions.css keeps a 0.001 s run under `reduce` so `animationend` still
 * fires for runtime/view-transition.ts, through `::view-transition-*(*)`.
 */
const GATE_EXEMPT = new Set(['::view-transition-new(live-content-swap):only-child', '::view-transition-old(live-content-swap):only-child'])

/** Splits on top-level commas: not those inside parentheses or quotes. */
function splitTopLevel(list) {
  const parts = []
  let depth = 0
  let quote = null
  let from = 0
  for (let i = 0; i < list.length; i++) {
    const c = list[i]
    if (quote) {
      quote = c === quote ? null : quote
    } else if (c === '"' || c === "'") {
      quote = c
    } else if (c === '(') {
      depth++
    } else if (c === ')') {
      depth--
    } else if (c === ',' && depth === 0) {
      parts.push(list.slice(from, i))
      from = i + 1
    }
  }
  parts.push(list.slice(from))
  return parts.map((part) => part.trim().replace(/\s+/g, ' ')).filter(Boolean)
}

/** The animation name of one comma part of an `animation` value, or null for `none`. */
function nameOfShorthandPart(part) {
  const words = part.replace(/[\w-]+\([^)]*\)/g, ' ').trim().split(/\s+/).filter((word) => word && !/^[\d.]+m?s?$/.test(word))
  const names = words.filter((word) => !SHORTHAND_KEYWORDS.has(word))
  if (names.length > 1) {
    throw new Error(`cannot parse the animation shorthand "${part}": more than one candidate name (${names.join(', ')})`)
  }
  return names[0] ?? null
}

/**
 * Parses a stylesheet with a brace scanner. CSS has no grammar in this repo's
 * zero-dep test lane, and this needs only the rule structure.
 * Returns its imports, the keyframe names it defines, the animations it names and
 * the selectors a `prefers-reduced-motion: reduce` block sets to `animation: none`.
 */
export function parseStylesheet(source) {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '))
  const sheet = {imports: [], keyframes: [], uses: [], gated: new Set()}
  /** Open blocks, outermost first: each one's prelude. */
  const stack = []
  let quote = null
  let from = 0
  const inKeyframes = () => stack.some((prelude) => prelude.startsWith('@keyframes'))

  const onStatement = (statement) => {
    const trimmed = statement.trim()
    const importMatch = trimmed.match(/^@import\s+(?:url\()?['"]([^'"]+)['"]/)
    if (importMatch) {
      sheet.imports.push(importMatch[1])
      return
    }
    const declaration = trimmed.match(/^(animation(?:-name)?)\s*:\s*([\s\S]+)$/)
    if (!declaration || inKeyframes() || stack.length === 0) {
      return
    }
    const selector = stack[stack.length - 1]
    const media = stack.filter((prelude) => prelude.startsWith('@media'))
    const value = declaration[2].replace(/\s*!important\s*$/, '').trim()
    const parts = splitTopLevel(value)
    const names = declaration[1] === 'animation' ? parts.map(nameOfShorthandPart) : parts.map((part) => (part === 'none' ? null : part))
    if (CSS_WIDE.has(value)) {
      return
    }
    const live = names.filter(Boolean)
    if (live.length === 0) {
      if (media.some((query) => /prefers-reduced-motion:\s*reduce/.test(query))) {
        splitTopLevel(selector).forEach((one) => sheet.gated.add(one))
      }
      return
    }
    const openedOnlyForMotion = media.some((query) => /prefers-reduced-motion:\s*no-preference/.test(query))
    for (const name of live) {
      sheet.uses.push({name, selectors: splitTopLevel(selector), openedOnlyForMotion})
    }
  }

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quote) {
      quote = c === quote ? null : quote
    } else if (c === '"' || c === "'") {
      quote = c
    } else if (c === '{') {
      const prelude = text.slice(from, i).trim().replace(/\s+/g, ' ')
      const keyframes = prelude.match(/^@keyframes\s+(\S+)/)
      if (keyframes) {
        sheet.keyframes.push(keyframes[1])
      }
      stack.push(prelude)
      from = i + 1
    } else if (c === ';') {
      onStatement(text.slice(from, i))
      from = i + 1
    } else if (c === '}') {
      onStatement(text.slice(from, i))
      stack.pop()
      from = i + 1
    }
  }
  return sheet
}

/** The CSS of a stylesheet, or of every `<style>` block in an .astro file. */
function cssOf(path) {
  const source = readFileSync(join(ROOT, path), 'utf8')
  return path.endsWith('.astro') ? [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n') : source
}

/** The repo-relative file an @import in `importer` resolves to. */
function resolveImport(importer, specifier) {
  if (specifier.startsWith(TOKENS_PACKAGE)) {
    const {exports} = JSON.parse(readFileSync(join(ROOT, TOKENS, 'package.json'), 'utf8'))
    const target = exports[`./${specifier.slice(TOKENS_PACKAGE.length)}`]
    assert.ok(typeof target === 'string', `${importer}: ${specifier} is not an exported tokens entrypoint`)
    return join(TOKENS, target)
  }
  assert.ok(specifier.startsWith('.'), `${importer}: cannot resolve @import "${specifier}"`)
  return relative(ROOT, resolve(ROOT, dirname(importer), specifier))
}

/**
 * Every finding in the set of `roots`. `read` lets a test mutate a file in memory.
 * A finding names the animation and the file that names it.
 */
export function motionFindings(roots, read = cssOf) {
  const findings = []
  for (const root of roots) {
    const keyframes = new Set()
    const visit = (path, chain) => {
      if (chain.includes(path)) {
        return
      }
      const sheet = parseStylesheet(read(path))
      sheet.keyframes.forEach((name) => keyframes.add(name))
      sheet.imports.forEach((specifier) => visit(resolveImport(path, specifier), [...chain, path]))
    }
    visit(root, [])
    const sheet = parseStylesheet(read(root))
    for (const {name, selectors, openedOnlyForMotion} of sheet.uses) {
      if (!keyframes.has(name)) {
        findings.push(`${root}: names animation "${name}" (${selectors.join(', ')}) with no @keyframes in its self-contained set`)
      }
      for (const selector of selectors) {
        if (!openedOnlyForMotion && !sheet.gated.has(selector) && !GATE_EXEMPT.has(selector)) {
          findings.push(`${root}: animation "${name}" on "${selector}" has no prefers-reduced-motion gate`)
        }
      }
    }
  }
  return findings
}

function cssFilesIn(dir) {
  return readdirSync(join(ROOT, dir)).filter((name) => name.endsWith('.css')).map((name) => join(dir, name))
}

function astroFilesIn(dir) {
  return readdirSync(join(ROOT, dir), {recursive: true}).filter((name) => name.endsWith('.astro')).map((name) => join(dir, name))
}

const STYLESHEETS = cssFilesIn(STYLES)
const SCOPED_BLOCKS = astroFilesIn('packages/web/src').filter((path) => /<style\b/.test(readFileSync(join(ROOT, path), 'utf8')))
const SHARED = [...STYLESHEETS, ...cssFilesIn(join(TOKENS, 'src'))]

test('discovery finds the stylesheets, so the checks below cannot pass over nothing', () => {
  for (const name of ['components.css', 'primitives.css', 'a11y.css', 'view-transitions.css', 'layout.css']) {
    assert.ok(STYLESHEETS.includes(join(STYLES, name)), `${name} is missing from the scan`)
  }
  assert.ok(SCOPED_BLOCKS.length > 0)
  assert.ok(parseStylesheet(cssOf(join(STYLES, 'components.css'))).uses.length >= 18, 'the parser sees the components.css animations')
})

test('every web stylesheet defines or imports each keyframe it names, and gates each animation', () => {
  assert.deepEqual(motionFindings(STYLESHEETS), [])
})

test('every scoped style block of a web component does too', () => {
  assert.deepEqual(motionFindings(SCOPED_BLOCKS), [])
})

test('tokens/motion holds to the same rule, because web stylesheets import it', () => {
  assert.deepEqual(motionFindings([join(TOKENS, 'src/motion.css')]), [])
})

test('no keyframe has two definitions across the web and token stylesheets', () => {
  const owners = new Map()
  for (const path of SHARED) {
    for (const name of parseStylesheet(cssOf(path)).keyframes) {
      owners.set(name, [...(owners.get(name) ?? []), path])
    }
  }
  const duplicates = [...owners].filter(([, paths]) => paths.length > 1).map(([name, paths]) => `${name}: ${paths.join(', ')}`)
  assert.deepEqual(duplicates, [])
})

test('tokens/motion carries no selector that reaches every element', () => {
  // The reason the web stylesheets import this file rather than tokens/animations or
  // tokens/effects: those files shorten every animation and transition on the page.
  const source = cssOf(join(TOKENS, 'src/motion.css'))
  assert.equal(/(^|[\s,}])\*[\s,{:]/.test(source.replace(/\/\*[\s\S]*?\*\//g, '')), false)
})

test('the keyframe a runtime module names inline resolves through components.css', () => {
  const keyframes = new Set()
  const visit = (path) => {
    const sheet = parseStylesheet(cssOf(path))
    sheet.keyframes.forEach((name) => keyframes.add(name))
    sheet.imports.forEach((specifier) => visit(resolveImport(path, specifier)))
  }
  visit(join(STYLES, 'components.css'))
  const runtime = 'packages/web/src/runtime'
  const named = readdirSync(join(ROOT, runtime)).flatMap((file) =>
    [...readFileSync(join(ROOT, runtime, file), 'utf8').matchAll(/\.style\.animation\s*=\s*'([\w-]+) /g)].map((m) => ({file, name: m[1]}))
  )
  assert.ok(named.length > 0, 'the scan finds book-modal-init.ts')
  for (const {file, name} of named) {
    assert.ok(keyframes.has(name), `${runtime}/${file} names animation "${name}" with no @keyframes through components.css`)
  }
})

test('can fail: deleting a keyframe reds, naming the animation and the file', () => {
  // The live mutant: the real files, with one keyframe cut out in memory.
  const motion = join(TOKENS, 'src/motion.css')
  const read = (path) => (path === motion ? cssOf(path).replace(/@keyframes dotPulse \{[\s\S]*?\n {4}\}\n/, '') : cssOf(path))
  assert.notEqual(read(motion), cssOf(motion), 'the mutation applies')
  const findings = motionFindings([join(STYLES, 'components.css')], read)
  assert.deepEqual(findings, [
    `${STYLES}/components.css: names animation "dotPulse" (.live-dot) with no @keyframes in its self-contained set`,
    `${STYLES}/components.css: names animation "dotPulse" (.sys-dot) with no @keyframes in its self-contained set`
  ])
})

test('can fail: dropping the @import reds on every imported name', () => {
  const components = join(STYLES, 'components.css')
  const read = (path) => (path === components ? cssOf(path).replace(/@import [^;]+;/, '') : cssOf(path))
  const findings = motionFindings([components], read)
  assert.ok(findings.some((finding) => finding.includes('"fadeSlideRight"') && finding.includes(components)), findings.join('\n'))
})

test('can fail: a removed gate reds, naming the animation and the selector', () => {
  const components = join(STYLES, 'components.css')
  const read = (path) => (path === components ? cssOf(path).replace(/^\s*\.live-dot,\n(?=\s*\.id-avatar::after,)/m, '') : cssOf(path))
  assert.notEqual(read(components), cssOf(components), 'the mutation applies')
  assert.deepEqual(motionFindings([components], read), [`${components}: animation "dotPulse" on ".live-dot" has no prefers-reduced-motion gate`])
})

test('parser: the shorthand, the longhand, function values and a no-preference block', () => {
  const sheet = parseStylesheet(`
    /* animation: commented 1s; */
    .a { animation: one 0.2s cubic-bezier(0.1, 0.2, 0.3, 0.4) both, two var(--d) infinite; }
    .b, .c:is(.d, .e) { animation-name: three; }
    @media (prefers-reduced-motion: no-preference) { .f { animation: four 1s; } }
    @media (prefers-reduced-motion: reduce) { .a, .b { animation: none; } }
    @keyframes five { from { animation-timing-function: linear; } }
  `)
  assert.deepEqual(sheet.uses.map((use) => use.name), ['one', 'two', 'three', 'four'])
  assert.deepEqual(sheet.uses[2].selectors, ['.b', '.c:is(.d, .e)'])
  assert.equal(sheet.uses[3].openedOnlyForMotion, true)
  assert.deepEqual([...sheet.gated], ['.a', '.b'])
  assert.deepEqual(sheet.keyframes, ['five'])
})
