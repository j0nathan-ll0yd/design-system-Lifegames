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

const REDUCE_QUERY = /^@media \(prefers-reduced-motion: ?reduce\)$/
const NO_PREFERENCE_QUERY = /^@media \(prefers-reduced-motion: ?no-preference\)$/

/**
 * A selector whose gate is not an `animation: none` on the same selector.
 * view-transitions.css keeps a 0.001 s run under `reduce` so `animationend` still
 * fires for runtime/view-transition.ts. The value is the wildcard selector that must
 * carry `animation-duration: ... !important` in a reduce block.
 */
const WILDCARD_GATES = new Map([
  ['::view-transition-new(live-content-swap):only-child', '::view-transition-new(*)'],
  ['::view-transition-old(live-content-swap):only-child', '::view-transition-old(*)']
])

/** Splits on top-level commas: not those inside parentheses or quotes. */
function splitTopLevel(list) {
  const parts = []
  let depth = 0
  let quote = null
  let from = 0
  for (let i = 0; i < list.length; i++) {
    const c = list[i]
    if (c === '\\') {
      i++
    } else if (quote) {
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
  if (names.length === 0 && !words.includes('none') && /\bvar\(/.test(part)) {
    throw new Error(`cannot parse the animation shorthand "${part}": a var() may hold the name`)
  }
  return names[0] ?? null
}

/**
 * Parses a stylesheet with a brace scanner. CSS has no grammar in this repo's
 * zero-dep test lane, and this needs only the rule structure.
 * Returns its imports, the keyframe names it defines, the animations it names, and
 * the gates: selectors that a block of exactly `prefers-reduced-motion: reduce` sets
 * to `animation: none` or `display: none`, each with the position of its last gate.
 * Throws on input it cannot scan to the end, because a silent stop would hide the rest.
 */
export function parseStylesheet(source) {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '))
  const sheet = {imports: [], keyframes: [], uses: [], gates: new Map(), durationGates: new Set()}
  /** Open blocks, outermost first: each one's prelude. */
  const stack = []
  let quote = null
  let from = 0
  let position = 0
  const inKeyframes = () => stack.some((prelude) => prelude.startsWith('@keyframes'))
  /** True only inside one exact reduce query, with no other condition around it. */
  const inReduceOnly = () => {
    const conditions = stack.slice(0, -1).filter((prelude) => prelude.startsWith('@') && !prelude.startsWith('@layer'))
    return conditions.length === 1 && REDUCE_QUERY.test(conditions[0])
  }

  const onStatement = (statement) => {
    const trimmed = statement.trim()
    const importMatch = trimmed.match(/^@import\s+(?:url\()?['"]([^'"]+)['"]/)
    if (importMatch) {
      sheet.imports.push(importMatch[1])
      return
    }
    const declaration = trimmed.match(/^(?:-webkit-)?(animation(?:-name|-duration)?|display)\s*:\s*([\s\S]+)$/)
    if (!declaration || inKeyframes() || stack.length === 0) {
      return
    }
    position++
    const [, property] = declaration
    const selectors = splitTopLevel(stack[stack.length - 1])
    const value = declaration[2].replace(/\s*!important\s*$/, '').trim()
    if (property === 'animation-duration') {
      if (inReduceOnly() && /!important\s*$/.test(declaration[2])) {
        selectors.forEach((one) => sheet.durationGates.add(one))
      }
      return
    }
    if (property === 'display' || value === 'none') {
      if (value === 'none' && inReduceOnly()) {
        selectors.forEach((one) => sheet.gates.set(one, position))
      }
      return
    }
    if (CSS_WIDE.has(value)) {
      return
    }
    const parts = splitTopLevel(value)
    const names = property === 'animation' ? parts.map(nameOfShorthandPart) : parts
    const openedOnlyForMotion = stack.some((prelude) => NO_PREFERENCE_QUERY.test(prelude))
    for (const name of names.filter(Boolean)) {
      sheet.uses.push({name, selectors, openedOnlyForMotion, position})
    }
  }

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '\\') {
      i++
    } else if (quote) {
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
  if (quote || stack.length > 0) {
    throw new Error(`the scan ended inside ${quote ? 'a string' : `the block "${stack[stack.length - 1]}"`}`)
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
    for (const {name, selectors, openedOnlyForMotion, position} of sheet.uses) {
      if (!keyframes.has(name)) {
        findings.push(`${root}: names animation "${name}" (${selectors.join(', ')}) with no @keyframes in its self-contained set`)
      }
      for (const selector of selectors) {
        if (openedOnlyForMotion) {
          continue
        }
        const wildcard = WILDCARD_GATES.get(selector)
        if (wildcard) {
          if (!sheet.durationGates.has(wildcard)) {
            findings.push(`${root}: animation "${name}" on "${selector}" has no reduce rule on "${wildcard}"`)
          }
        } else if (!sheet.gates.has(selector)) {
          findings.push(`${root}: animation "${name}" on "${selector}" has no prefers-reduced-motion gate`)
        } else if (sheet.gates.get(selector) < position) {
          // Same layer, same specificity: the later rule wins, so this gate does nothing.
          findings.push(`${root}: animation "${name}" on "${selector}" comes after its prefers-reduced-motion gate`)
        }
      }
    }
  }
  return findings
}

/** The animation names a TypeScript source sets inline. `.animate()` takes keyframes, not a name. */
export function runtimeAnimationNames(source) {
  const patterns = [
    /\.style\.animation(?:Name)?\s*=\s*['"`]([A-Za-z][\w-]*)/g,
    /setProperty\(\s*['"]animation(?:-name)?['"]\s*,\s*['"`]([A-Za-z][\w-]*)/g,
    /style=\\?["'][^"']*\banimation(?:-name)?:\s*([A-Za-z][\w-]*)/g
  ]
  return patterns.flatMap((pattern) => [...source.matchAll(pattern)].map((m) => m[1])).filter((name) => name !== 'none')
}

/** Files under `dir` with `extension`, at any depth. */
function filesIn(dir, extension) {
  return readdirSync(join(ROOT, dir), {recursive: true}).filter((name) => name.endsWith(extension)).map((name) => join(dir, name))
}

const WEB_SRC = 'packages/web/src'
const STYLESHEETS = filesIn(WEB_SRC, '.css')
const SCOPED_BLOCKS = filesIn(WEB_SRC, '.astro').filter((path) => /<style\b/.test(readFileSync(join(ROOT, path), 'utf8')))
const SHARED = [...STYLESHEETS, ...filesIn(join(TOKENS, 'src'), '.css'), ...SCOPED_BLOCKS]

test('discovery finds the stylesheets, so the checks below cannot pass over nothing', () => {
  for (const name of ['components.css', 'primitives.css', 'a11y.css', 'view-transitions.css', 'layout.css']) {
    assert.ok(STYLESHEETS.includes(join(STYLES, name)), `${name} is missing from the scan`)
  }
  assert.ok(STYLESHEETS.includes(join(WEB_SRC, 'widgets/identity/NotFound.css')), 'discovery reaches a stylesheet beside its widget')
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

test('no keyframe has two definitions across the web stylesheets, scoped blocks and token stylesheets', () => {
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
  const named = filesIn(WEB_SRC, '.ts').flatMap((file) => runtimeAnimationNames(readFileSync(join(ROOT, file), 'utf8')).map((name) => ({file, name})))
  assert.ok(named.some(({name}) => name === 'bookModalOut'), 'the scan finds book-modal-init.ts')
  for (const {file, name} of named) {
    assert.ok(keyframes.has(name), `${file} names animation "${name}" with no @keyframes through components.css`)
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

test('can fail: a gate before its rule reds, because the later rule wins', () => {
  const findings = motionFindings(['m.css'], () => `
    @media (prefers-reduced-motion: reduce) { .a { animation: none; } }
    .a { animation: spin 1s; }
    @keyframes spin { to { opacity: 0; } }
  `)
  assert.deepEqual(findings, ['m.css: animation "spin" on ".a" comes after its prefers-reduced-motion gate'])
})

test('can fail: a rule that only looks like a gate reds', () => {
  const lookAlikes = [
    '@media (max-width: 600px) and (prefers-reduced-motion: reduce) { .a { animation: none; } }',
    '@media not (prefers-reduced-motion: reduce) { .a { animation: none; } }',
    '@media (prefers-reduced-motion: reduce) { .a { animation-duration: 0s; } }',
    '@media (min-width: 600px) { @media (prefers-reduced-motion: reduce) { .a { animation: none; } } }'
  ]
  for (const gate of lookAlikes) {
    const css = `.a { animation: spin 1s; } @keyframes spin { to { opacity: 0; } } ${gate}`
    assert.deepEqual(motionFindings(['m.css'], () => css), ['m.css: animation "spin" on ".a" has no prefers-reduced-motion gate'], gate)
  }
})

test('can fail: a deleted wildcard gate on view transitions reds', () => {
  const sheet = join(STYLES, 'view-transitions.css')
  const read = (path) => cssOf(path).replace(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}\n/, '')
  assert.notEqual(read(sheet), cssOf(sheet), 'the mutation applies')
  assert.deepEqual(motionFindings([sheet], read), [
    `${sheet}: animation "vt-fade-in" on "::view-transition-new(live-content-swap):only-child" has no reduce rule on "::view-transition-new(*)"`,
    `${sheet}: animation "vt-fade-out" on "::view-transition-old(live-content-swap):only-child" has no reduce rule on "::view-transition-old(*)"`
  ])
})

test('can fail: a stylesheet beside its widget is in the scan', () => {
  const notFound = join(WEB_SRC, 'widgets/identity/NotFound.css')
  const read = (path) => cssOf(path).replace(/@keyframes glitch-bar \{[\s\S]*?\n\}\n/, '')
  assert.notEqual(read(notFound), cssOf(notFound), 'the mutation applies')
  assert.ok(STYLESHEETS.includes(notFound))
  assert.ok(motionFindings(STYLESHEETS, read).some((finding) => finding.includes('"glitch-bar"') && finding.includes(notFound)))
})

test('can fail: forms the scan cannot prove fail closed', () => {
  assert.throws(() => parseStylesheet('.a { animation: var(--anim) 1s; }'), /a var\(\) may hold the name/)
  assert.throws(() => parseStylesheet('.a { color: red;'), /ended inside the block/)
  assert.throws(() => parseStylesheet(`.a { content: 'open; }`), /ended inside a string/)
  assert.deepEqual(parseStylesheet('.a { -webkit-animation: spin 1s; }').uses.map((use) => use.name), ['spin'])
  // An escaped quote does not end the string, so the rule after it stays in the scan.
  assert.deepEqual(parseStylesheet(`.x { content: '\\''; } .a { animation: spin 1s; }`).uses.map((use) => use.name), ['spin'])
})

test('can fail: each inline form of a runtime animation name is seen', () => {
  assert.deepEqual(runtimeAnimationNames("el.style.animation = 'one 1s'"), ['one'])
  assert.deepEqual(runtimeAnimationNames('el.style.animation = `two ${d}s`'), ['two'])
  assert.deepEqual(runtimeAnimationNames("el.style.animationName = 'three'"), ['three'])
  assert.deepEqual(runtimeAnimationNames("el.style.setProperty('animation-name', 'four')"), ['four'])
  assert.deepEqual(runtimeAnimationNames('html = `<i style="color: red; animation: five 1s"></i>`'), ['five'])
  assert.deepEqual(runtimeAnimationNames("el.style.animation = ''"), [])
})

test('parser: the shorthand, the longhand, function values and a no-preference block', () => {
  const sheet = parseStylesheet(`
    /* animation: commented 1s; */
    .a { animation: one 0.2s cubic-bezier(0.1, 0.2, 0.3, 0.4) both, two var(--d) infinite; }
    .b, .c:is(.d, .e) { animation-name: three; }
    @media (prefers-reduced-motion: no-preference) { .f { animation: four 1s; } }
    @media (prefers-reduced-motion: reduce) { .a, .b { animation: none; } .g { display: none; } }
    @keyframes five { from { animation-timing-function: linear; } }
  `)
  assert.deepEqual(sheet.uses.map((use) => use.name), ['one', 'two', 'three', 'four'])
  assert.deepEqual(sheet.uses[2].selectors, ['.b', '.c:is(.d, .e)'])
  assert.equal(sheet.uses[3].openedOnlyForMotion, true)
  assert.deepEqual([...sheet.gates.keys()], ['.a', '.b', '.g'])
  assert.deepEqual(sheet.keyframes, ['five'])
})
