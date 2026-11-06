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

const REDUCE_QUERY = /^@media \(prefers-reduced-motion: ?reduce\)$/i
const NO_PREFERENCE_QUERY = /^@media \(prefers-reduced-motion: ?no-preference\)$/i
const KEYFRAMES_PRELUDE = /^@(?:-[a-z]+-)?keyframes\s+(\S+)/i
const VENDOR = '(?:-(?:webkit|moz|o|ms)-)?'
const DECLARATION = new RegExp(`^${VENDOR}(animation(?:-[a-z-]+)?|display)\\s*:\\s*([\\s\\S]+)$`, 'i')
const IMPORTANT = /\s*!\s*important\s*$/i
const TIME_OR_NUMBER = /^[-+]?(?:\d*\.)?\d+(?:m?s)?$/i
const TIMING_FUNCTION = /^(?:cubic-bezier|steps|linear)\(/i
/** A timing token. It holds a duration or an easing, so it cannot add an animation name. */
const MOTION_TOKEN_VAR = /^var\(--lg-motion-(?:duration|easing)-[\w-]+\)$/

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

/** Splits on top-level whitespace, so a function and its arguments stay one word. */
function topLevelWords(part) {
  const words = []
  let depth = 0
  let word = ''
  for (const c of part) {
    if (/\s/.test(c) && depth === 0) {
      words.push(word)
      word = ''
    } else {
      depth += c === '(' ? 1 : c === ')' ? -1 : 0
      word += c
    }
  }
  words.push(word)
  return words.filter(Boolean)
}

/**
 * The animation name of one comma part of an `animation` value, or null for `none`.
 * A value the scan cannot prove comes back as `problem`, because a var() can
 * substitute a name, and even a comma and a second animation.
 */
function parseShorthandPart(part) {
  const words = topLevelWords(part)
  const unknownFunctions = words.filter((word) => word.includes('(') && !TIMING_FUNCTION.test(word) && !MOTION_TOKEN_VAR.test(word))
  const names = words.filter((word) => !word.includes('(') && !TIME_OR_NUMBER.test(word) && !SHORTHAND_KEYWORDS.has(word.toLowerCase()))
  if (unknownFunctions.length > 0) {
    return {name: names[0] ?? null, problem: `animation value "${part}" holds ${unknownFunctions.join(', ')}, which may add an animation name`}
  }
  if (names.length > 1) {
    return {name: names[0], problem: `animation value "${part}" has more than one candidate name (${names.join(', ')})`}
  }
  return {name: names[0] ?? null, problem: null}
}

/**
 * Parses a stylesheet with a brace scanner. CSS has no grammar in this repo's
 * zero-dep test lane, and this needs only the rule structure.
 * Returns its imports, the keyframe names it defines, the animations it names, every
 * selector, the gates (selectors that a block of exactly `prefers-reduced-motion:
 * reduce` sets to `animation: none` or `display: none`, each with its position and
 * layer) and `unresolved`: declarations the scan cannot prove safe.
 * Throws on input it cannot scan to the end, because a silent stop would hide the rest.
 */
export function parseStylesheet(source) {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '))
  const sheet = {imports: [], keyframes: [], uses: [], selectors: [], gates: new Map(), durationGates: new Set(), unresolved: []}
  /** Open blocks, outermost first: each one's prelude. */
  const stack = []
  let quote = null
  let from = 0
  let position = 0
  const inKeyframes = () => stack.some((prelude) => KEYFRAMES_PRELUDE.test(prelude))
  const isLayer = (prelude) => /^@layer\b/i.test(prelude)
  /** True only inside one exact reduce query, with no other condition around it. */
  const inReduceOnly = () => {
    const conditions = stack.slice(0, -1).filter((prelude) => prelude.startsWith('@') && !isLayer(prelude))
    return conditions.length === 1 && REDUCE_QUERY.test(conditions[0])
  }
  const layer = () => stack.filter(isLayer).join(' > ')

  const onStatement = (statement) => {
    const trimmed = statement.trim()
    const importMatch = trimmed.match(/^@import\s+(?:url\()?['"]([^'"]+)['"]/i)
    if (importMatch) {
      sheet.imports.push(importMatch[1])
      return
    }
    const declaration = trimmed.match(DECLARATION)
    if (!declaration || inKeyframes() || stack.length === 0) {
      return
    }
    position++
    const property = declaration[1].toLowerCase()
    const raw = declaration[2]
    const important = IMPORTANT.test(raw)
    const value = raw.replace(IMPORTANT, '').trim()
    const lower = value.toLowerCase()
    const selectors = splitTopLevel(stack[stack.length - 1])
    const addGate = () => {
      for (const one of selectors) {
        sheet.gates.set(one, [...(sheet.gates.get(one) ?? []), {position, layer: layer()}])
      }
    }
    if (property === 'display') {
      if (lower === 'none' && inReduceOnly()) {
        addGate()
      }
      return
    }
    // An important declaration beats a normal gate in any layer, and an important one
    // in an earlier layer beats the global rule too. Inside a reduce block it only stops motion.
    if (important && !(inReduceOnly() && (property === 'animation-duration' || lower === 'none'))) {
      sheet.unresolved.push(`"${property}: ${value} !important" on "${selectors.join(', ')}" beats a prefers-reduced-motion gate`)
    }
    if (property === 'animation-duration') {
      if (inReduceOnly() && important) {
        selectors.forEach((one) => sheet.durationGates.add(one))
      }
      return
    }
    if (property !== 'animation' && property !== 'animation-name') {
      return
    }
    if (lower === 'none') {
      if (inReduceOnly()) {
        addGate()
      }
      return
    }
    if (CSS_WIDE.has(lower)) {
      return
    }
    const parsed = splitTopLevel(value).map((part) =>
      property === 'animation'
        ? parseShorthandPart(part)
        : part.includes('(')
        ? {name: null, problem: `animation-name "${part}" cannot be resolved statically`}
        : {name: part.toLowerCase() === 'none' ? null : part, problem: null}
    )
    parsed.filter(({problem}) => problem).forEach(({problem}) => sheet.unresolved.push(`${problem} on "${selectors.join(', ')}"`))
    const openedOnlyForMotion = stack.some((prelude) => NO_PREFERENCE_QUERY.test(prelude))
    for (const {name} of parsed.filter(({name}) => name)) {
      sheet.uses.push({name, selectors, openedOnlyForMotion, position, layer: layer()})
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
      const keyframes = prelude.match(KEYFRAMES_PRELUDE)
      if (keyframes) {
        sheet.keyframes.push(keyframes[1])
      } else if (!prelude.startsWith('@') && !inKeyframes()) {
        sheet.selectors.push(...splitTopLevel(prelude))
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
  const parse = (path) => {
    try {
      return parseStylesheet(read(path))
    } catch (error) {
      findings.push(`${path}: ${error.message}`)
      return parseStylesheet('')
    }
  }
  for (const root of roots) {
    const keyframes = selfContainedKeyframes(root, parse)
    const sheet = parse(root)
    sheet.unresolved.forEach((problem) => findings.push(`${root}: ${problem}`))
    for (const {name, selectors, openedOnlyForMotion, position, layer} of sheet.uses) {
      if (!keyframes.has(name)) {
        findings.push(`${root}: names animation "${name}" (${selectors.join(', ')}) with no @keyframes in its self-contained set`)
      }
      for (const selector of selectors) {
        if (openedOnlyForMotion) {
          continue
        }
        const wildcard = WILDCARD_GATES.get(selector)
        const gates = sheet.gates.get(selector) ?? []
        if (wildcard) {
          if (!sheet.durationGates.has(wildcard)) {
            findings.push(`${root}: animation "${name}" on "${selector}" has no reduce rule on "${wildcard}"`)
          }
        } else if (gates.length === 0) {
          findings.push(`${root}: animation "${name}" on "${selector}" has no prefers-reduced-motion gate`)
        } else if (!gates.some((gate) => (gate.layer === layer ? gate.position > position : gate.layer === ''))) {
          // The later rule wins inside one layer. Across layers, only an unlayered gate
          // beats the rule for certain.
          const sameLayer = gates.some((gate) => gate.layer === layer)
          findings.push(
            `${root}: animation "${name}" on "${selector}" ${sameLayer ? 'comes after' : 'is in another layer from'} its prefers-reduced-motion gate`
          )
        }
      }
    }
  }
  return findings
}

/** Every keyframe a stylesheet reaches: its own and those of its @import chain. */
function selfContainedKeyframes(root, parse) {
  const keyframes = new Set()
  const visit = (path, chain) => {
    if (chain.includes(path)) {
      return
    }
    const sheet = parse(path)
    sheet.keyframes.forEach((name) => keyframes.add(name))
    sheet.imports.forEach((specifier) => visit(resolveImport(path, specifier), [...chain, path]))
  }
  visit(root, [])
  return keyframes
}

/** Code without its comments, so prose that mentions an animation is not a finding. */
function withoutComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
}

/** The part of an .astro file outside its `<style>` blocks: frontmatter, scripts and markup. */
function outsideStyleBlocks(source) {
  return source.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '')
}

/**
 * The animation names a source file sets inline, in code or markup. `.animate()` takes
 * keyframes, not a name. A form that cannot be resolved statically comes back in
 * `unresolved`, by name: it fails closed and is never skipped.
 */
export function inlineAnimations(source) {
  const code = withoutComments(source)
  const names = new Set()
  const unresolved = new Set()
  const fromCss = (value, form) => {
    const css = value.trim()
    if (css === '') {
      return
    }
    if (IMPORTANT.test(css)) {
      unresolved.add(`${form} "${css}" uses !important, which beats a prefers-reduced-motion gate`)
    }
    for (const part of splitTopLevel(css.replace(IMPORTANT, ''))) {
      const {name, problem} = parseShorthandPart(part)
      if (problem) {
        unresolved.add(`${form}: ${problem}`)
      }
      if (name) {
        names.add(name)
      }
    }
  }
  /** The rest of a line must open with one whole string literal, or it fails closed. */
  const fromExpression = (rest, form) => {
    const literal = rest.match(/^\s*(['"`])((?:\\.|(?!\1)[^\\\n])*)\1\s*(?:[;),]|$)/)
    if (!literal || literal[2].includes('${')) {
      unresolved.add(`${form} "${rest.trim()}" cannot be resolved statically`)
      return null
    }
    return literal[2]
  }
  const animationProperty = new RegExp(
    `\\.style\\s*(?:\\.\\s*${VENDOR}animation(?:Name)?\\b|\\[\\s*['"\`]${VENDOR}animation(?:Name|-name)?['"\`]\\s*\\])\\s*\\+?=(?!=)([^\\n]*)`,
    'gi'
  )
  for (const [, expression] of code.matchAll(animationProperty)) {
    const value = fromExpression(expression, 'style.animation')
    if (value !== null) {
      fromCss(value, 'style.animation')
    }
  }
  for (const [form] of code.matchAll(/\.style\s*\[(?!\s*['"`])[^\]]+\]\s*=(?!=)/g)) {
    unresolved.add(`"${form}" sets a computed style property, which may be an animation`)
  }
  const setProperty = new RegExp(`setProperty\\(\\s*(['"\`])${VENDOR}animation(?:-name)?\\1\\s*,([^\\n]*)`, 'gi')
  for (const [, , expression] of code.matchAll(setProperty)) {
    const value = fromExpression(expression, 'setProperty(animation)')
    if (value !== null) {
      fromCss(value, 'setProperty(animation)')
    }
  }
  for (const [form] of code.matchAll(/setProperty\((?!\s*['"`])[^,)]*/g)) {
    unresolved.add(`"${form}" sets a computed property, which may be an animation`)
  }
  for (const [form] of code.matchAll(/Object\.assign\(\s*[^,)]*style\s*,(?!\s*\{)[^)]*/gi)) {
    unresolved.add(`"${form}" may set an animation, and cannot be resolved statically`)
  }
  // Whole CSS text: its animation text is read below, so a literal needs no finding here.
  for (const [, form, rest] of code.matchAll(/(\.cssText\s*\+?=|setAttribute\(\s*['"]style['"]\s*,)([^\n]*)/g)) {
    fromExpression(rest, form.trim())
  }
  // Any animation declaration in a string, in markup or as an object key.
  const declaration = new RegExp(`(?<![\\w-])${VENDOR}animation(?:-name|Name)?\\s*:\\s*(['"\`]?)([^;'"\`}\\n]*)`, 'gi')
  for (const match of code.matchAll(declaration)) {
    const value = match[2]
    const rest = code.slice(match.index + match[0].length)
    if (value.includes('${') || /^['"`]?\s*\+/.test(rest)) {
      unresolved.add(`"${match[0].trim()}" is built at runtime and cannot be resolved statically`)
    } else {
      fromCss(value, 'inline animation')
    }
  }
  return {names: [...names], unresolved: [...unresolved]}
}

/** Files under `dir` with `extension`, at any depth. */
function filesIn(dir, extension) {
  return readdirSync(join(ROOT, dir), {recursive: true}).filter((name) => name.endsWith(extension)).map((name) => join(dir, name))
}

const WEB_SRC = 'packages/web/src'
const STYLESHEETS = filesIn(WEB_SRC, '.css')
const SCOPED_BLOCKS = filesIn(WEB_SRC, '.astro').filter((path) => /<style\b/.test(readFileSync(join(ROOT, path), 'utf8')))
const SHARED = [...STYLESHEETS, ...filesIn(join(TOKENS, 'src'), '.css'), ...SCOPED_BLOCKS]
const CODE_FILES = ['.ts', '.tsx', '.js', '.mjs', '.astro'].flatMap((extension) => filesIn(WEB_SRC, extension))

/** A selector that reaches every element, or the document as a whole. */
export function globalSelectors(sheet) {
  return sheet.selectors.filter((selector) => /(?:^|[\s>+~(,])(?:\*|html\b|body\b|:root\b)/i.test(selector))
}

/** Every inline finding of `files`. A .astro file may also name a keyframe of its own style block. */
function inlineFindings(files, read = (path) => readFileSync(join(ROOT, path), 'utf8')) {
  const reachable = selfContainedKeyframes(join(STYLES, 'components.css'), (path) => parseStylesheet(cssOf(path)))
  const findings = []
  for (const file of files) {
    const source = read(file)
    const own = file.endsWith('.astro')
      ? parseStylesheet([...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')).keyframes
      : []
    const {names, unresolved} = inlineAnimations(file.endsWith('.astro') ? outsideStyleBlocks(source) : source)
    unresolved.forEach((problem) => findings.push(`${file}: ${problem}`))
    for (const name of names.filter((one) => !reachable.has(one) && !own.includes(one))) {
      findings.push(`${file}: names animation "${name}" inline with no @keyframes through components.css`)
    }
  }
  return findings
}

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

test('tokens/motion carries no selector that reaches every element or the document', () => {
  // The reason the web stylesheets import this file rather than tokens/animations or
  // tokens/effects: those files shorten every animation and transition on the page.
  assert.deepEqual(globalSelectors(parseStylesheet(cssOf(join(TOKENS, 'src/motion.css')))), [])
})

test('every animation named in code or markup under packages/web/src resolves', () => {
  assert.ok(CODE_FILES.some((file) => file.endsWith('book-modal-init.ts')), 'discovery reaches the runtime modules')
  assert.ok(CODE_FILES.some((file) => file.endsWith('IdentityCard.astro')), 'discovery reaches the components')
  assert.ok(inlineAnimations(readFileSync(join(ROOT, WEB_SRC, 'runtime/book-modal-init.ts'), 'utf8')).names.includes('bookModalOut'),
    'the scan finds book-modal-init.ts')
  assert.deepEqual(inlineFindings(CODE_FILES), [])
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

test('can fail: forms the scan cannot prove fail closed, by name', () => {
  const unresolved = (css) => parseStylesheet(css).unresolved
  assert.match(unresolved('.a { animation: var(--anim) 1s; }')[0], /var\(--anim\), which may add an animation name on "\.a"/)
  assert.match(unresolved('.a { animation: spin 1s var(--more); }')[0], /var\(--more\), which may add an animation name/)
  assert.match(unresolved('.a { animation: spin 1s, var(--more); }')[0], /var\(--more\), which may add an animation name/)
  assert.match(unresolved('.a { animation-name: var(--anim); }')[0], /cannot be resolved statically/)
  assert.match(unresolved('.a { animation: one two 1s; }')[0], /more than one candidate name \(one, two\)/)
  assert.throws(() => parseStylesheet('.a { color: red;'), /ended inside the block/)
  assert.throws(() => parseStylesheet(`.a { content: 'open; }`), /ended inside a string/)
  const unreadable = motionFindings(['m.css'], () => '.a { color: red;')
  assert.ok(unreadable.some((finding) => finding.startsWith('m.css: the scan ended inside')), 'the finding names the file')
  // An escaped quote does not end the string, so the rule after it stays in the scan.
  assert.deepEqual(parseStylesheet(`.x { content: '\\''; } .a { animation: spin 1s; }`).uses.map((use) => use.name), ['spin'])
})

test('can fail: vendor prefixes and uppercase are animations too', () => {
  for (
    const css of [
      '.a { -webkit-animation: spin 1s; }',
      '.a { -moz-animation: spin 1s; }',
      '.a { -o-animation: spin 1s; }',
      '.a { -ms-animation: spin 1s; }',
      '.a { ANIMATION: spin 1s; }',
      '.a { Animation-Name: spin; }'
    ]
  ) {
    assert.deepEqual(parseStylesheet(css).uses.map((use) => use.name), ['spin'], css)
  }
  assert.deepEqual(parseStylesheet('@-webkit-keyframes one { to { top: 0; } } @KEYFRAMES two { to { top: 0; } }').keyframes, ['one', 'two'])
  assert.equal(parseStylesheet('@MEDIA (PREFERS-REDUCED-MOTION: REDUCE) { .a { ANIMATION: NONE; } }').gates.has('.a'), true)
})

test('can fail: !important on an animation declaration reds', () => {
  const gated = (rule) => `${rule} @keyframes spin { to { top: 0; } } @media (prefers-reduced-motion: reduce) { .a { animation: none; } }`
  assert.deepEqual(motionFindings(['m.css'], () => gated('.a { animation: spin 1s !important; }')), [
    'm.css: "animation: spin 1s !important" on ".a" beats a prefers-reduced-motion gate'
  ])
  assert.deepEqual(motionFindings(['m.css'], () => gated('.a { animation: spin 1s; } .b { animation-name: none ! important; }')), [
    'm.css: "animation-name: none !important" on ".b" beats a prefers-reduced-motion gate'
  ])
  assert.deepEqual(motionFindings(['m.css'], () => gated('.a { animation: spin 1s; animation-duration: 2s !important; }')), [
    'm.css: "animation-duration: 2s !important" on ".a" beats a prefers-reduced-motion gate'
  ])
  // Inside a reduce block it only stops motion, so it stays legal there.
  assert.deepEqual(
    parseStylesheet('@media (prefers-reduced-motion: reduce) { .a { animation: none !important; } .b { animation-duration: 0.001s !important; } }')
      .unresolved,
    []
  )
  assert.match(parseStylesheet('@media (prefers-reduced-motion: reduce) { .a { animation: spin 1s !important; } }').unresolved[0],
    /beats a prefers-reduced-motion gate/)
})

test('can fail: a gate in another layer reds, and an unlayered gate passes', () => {
  const keyframes = '@keyframes spin { to { top: 0; } }'
  const inLayer = (layer, block) => `@layer ${layer} { ${block} }`
  const rule = '.a { animation: spin 1s; }'
  const gate = '@media (prefers-reduced-motion: reduce) { .a { animation: none; } }'
  assert.deepEqual(motionFindings(['m.css'], () => `${keyframes} ${inLayer('low', gate)} ${inLayer('high', rule)}`), [
    'm.css: animation "spin" on ".a" is in another layer from its prefers-reduced-motion gate'
  ])
  assert.deepEqual(motionFindings(['m.css'], () => `${keyframes} ${inLayer('a', rule)} ${gate}`), [])
  assert.deepEqual(motionFindings(['m.css'], () => `${keyframes} ${inLayer('a', `${rule} ${gate}`)}`), [])
})

test('parser: a negative delay and nested functions are not names', () => {
  const name = (value) => parseStylesheet(`.a { animation: ${value}; }`)
  for (
    const value of [
      'spin 1s -0.5s',
      'spin 1s -.5s linear',
      'spin 1s cubic-bezier(0.1, var(--x), 0.3, 0.4)',
      'spin steps(calc(2 + 1), end) 1s',
      'spin var(--lg-motion-duration-normal) var(--lg-motion-easing-decelerate)'
    ]
  ) {
    assert.deepEqual(name(value).uses.map((use) => use.name), ['spin'], value)
    assert.deepEqual(name(value).unresolved, [], value)
  }
})

test('can fail: a global selector in tokens/motion reds', () => {
  for (
    const css of [
      '* { top: 0; }',
      '*, *::before { top: 0; }',
      '.a * { top: 0; }',
      'html { top: 0; }',
      'body { top: 0; }',
      ':root { --a: 0; }',
      ':where(:root) { --a: 0; }',
      'html body { top: 0; }'
    ]
  ) {
    assert.notDeepEqual(globalSelectors(parseStylesheet(css)), [], css)
  }
  for (const css of ['.body { top: 0; }', '.skeleton-bar::after { top: 0; }', '@keyframes a { from { top: 0; } }', '.a:not(.html) { top: 0; }']) {
    assert.deepEqual(globalSelectors(parseStylesheet(css)), [], css)
  }
})

test('can fail: each inline form of an animation name is seen', () => {
  const named = {
    "el.style.animation = 'one 1s'": 'one',
    'el.style.animation = "one 1s"': 'one',
    'el.style.animation = `one 1s`': 'one',
    "el.style.animationName = 'one'": 'one',
    "el.style.webkitAnimation = 'one'": null,
    "el.style['animation'] = 'one 1s'": 'one',
    "el.style['animation-name'] = 'one'": 'one',
    'el.style["animationName"] = "one"': 'one',
    "el.style.setProperty('animation', 'one 1s')": 'one',
    "el.style.setProperty('animation-name', 'one')": 'one',
    'el.style.cssText = "color: red; animation: one 1s"': 'one',
    "el.setAttribute('style', 'animation: one 1s')": 'one',
    "Object.assign(el.style, {animation: 'one 1s'})": 'one',
    "Object.assign(el.style, {animationName: 'one'})": 'one',
    'html = `<i style="color: red; animation: one 1s"></i>`': 'one',
    '<span style="animation: one 1s infinite"></span>': 'one',
    "<span style='-moz-animation: one 1s'></span>": 'one',
    "<span style={{animation: 'one 1s'}} />": 'one'
  }
  for (const [source, name] of Object.entries(named).filter(([, name]) => name)) {
    assert.deepEqual(inlineAnimations(source), {names: [name], unresolved: []}, source)
  }
  assert.deepEqual(inlineAnimations("el.style.animation = ''"), {names: [], unresolved: []})
  assert.deepEqual(inlineAnimations("el.style.animation = 'none'"), {names: [], unresolved: []})
  assert.deepEqual(inlineAnimations('el.style.animationDelay = "1s"; const css = `animation-delay: ${x}s`'), {names: [], unresolved: []})
  assert.deepEqual(inlineAnimations('// el.style.animation = "one 1s"\n/* animation: two 1s */\n<!-- animation: three 1s -->'), {names: [], unresolved: []})
})

test('can fail: a dynamic inline form fails closed, by name', () => {
  const dynamic = [
    "el.style.animation = name + ' 1s'",
    'el.style.animation = `${name} 1s`',
    'el.style.animation = name',
    "el.style.animation = open ? 'one' : 'two'",
    "el.style['animation'] = name",
    'el.style[property] = value',
    "el.style.setProperty('animation', name)",
    'el.style.setProperty(property, value)',
    'Object.assign(el.style, styles)',
    'el.style.cssText = css',
    'el.style.cssText = `color: ${c}`',
    "el.setAttribute('style', css)",
    "html = '<i style=\"animation: ' + name + ' 1s\"></i>'",
    'html = `<i style="animation: ${name} 1s"></i>`',
    '<span style={`animation: ${name} 1s`} />',
    "<span style={{animation: 'one 1s !important'}} />"
  ]
  for (const source of dynamic) {
    assert.ok(inlineAnimations(source).unresolved.length > 0, source)
  }
})

test('can fail: an inline name with no keyframes reds, naming the file', () => {
  const files = {
    'a.ts': "el.style.animation = 'ghost 1s'",
    'b.astro': '<span style="animation: ghostMarkup 1s infinite"></span>',
    'c.astro': "---\n---\n<script>el.style.setProperty('animation', 'ghostScript 1s')</script>",
    'd.astro': '<i style="animation: own 1s"></i><style>@keyframes own { to { top: 0; } }</style>',
    'e.ts': "el.style.animation = 'bookModalOut 1s'"
  }
  assert.deepEqual(inlineFindings(Object.keys(files), (file) => files[file]), [
    'a.ts: names animation "ghost" inline with no @keyframes through components.css',
    'b.astro: names animation "ghostMarkup" inline with no @keyframes through components.css',
    'c.astro: names animation "ghostScript" inline with no @keyframes through components.css'
  ])
})

test('parser: the shorthand, the longhand, function values and a no-preference block', () => {
  const sheet = parseStylesheet(`
    /* animation: commented 1s; */
    .a { animation: one 0.2s cubic-bezier(0.1, 0.2, 0.3, 0.4) both, two var(--lg-motion-duration-normal) infinite; }
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
