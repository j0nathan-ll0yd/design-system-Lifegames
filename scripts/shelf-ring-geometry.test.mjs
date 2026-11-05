// Holds every copy of the Bookshelf tile focus ring to one geometry.
//
// Three stylesheets draw the ring on `.shelf-book-link:focus-visible::after`:
// the web package's a11y.css (the website), tokens/base.css (the docs
// showcase) and the portfolio Dashboard. The shelf row clips anything past a
// tile, so the ring's outer edge must be the tile's border edge in each copy.
// The browser suite (packages/web/tests/browser/fail-visible.test.ts) proves
// the clip on the stacks it renders; it cannot see a copy that no fixture page
// loads, so a drifted copy passed it. This test reads the copies themselves.
//
// Every rule whose selector ends in that ring selector counts, so a
// contextual override (`.shelf-book-active .shelf-book-link...`) cannot move
// one copy's ring unseen. The colour stays out of the comparison: each copy
// names its own token alias.

import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SELECTOR = '.shelf-book-link:focus-visible::after'

const RING_COPIES = [
  'packages/web/src/styles/a11y.css',
  'packages/tokens/src/base.css',
  'apps/portfolio/src/layouts/Dashboard.astro'
]

/** The CSS of a stylesheet, or of every `<style>` block in an .astro file. */
function cssOf(path, source) {
  if (!path.endsWith('.astro')) {
    return source
  }
  return [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')
}

/** Splits a selector list on its top-level commas, not those inside `:is()`. */
function selectorsOf(list) {
  const parts = []
  let depth = 0
  let from = 0
  for (let i = 0; i < list.length; i++) {
    if (list[i] === '(') {
      depth++
    } else if (list[i] === ')') {
      depth--
    } else if (list[i] === ',' && depth === 0) {
      parts.push(list.slice(from, i))
      from = i + 1
    }
  }
  parts.push(list.slice(from))
  return parts.map((part) => part.trim().replace(/\s+/g, ' '))
}

/**
 * Every rule with a selector that ENDS in SELECTOR and sets an outline width,
 * style or offset. `exact` marks the base rule, whose whole selector is
 * SELECTOR; a contextual rule (`.shelf-book-active .shelf-book-link...`)
 * reaches the same ring. A rule that sets the outline to `none` hides the
 * ring (a11y.css's pointer suppression) and draws no geometry, so it is left
 * out.
 */
function ringRules(path, source) {
  const css = cssOf(path, source).replace(/\/\*[\s\S]*?\*\//g, '')
  const rules = []
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = selectorsOf(selector)
    if (!selectors.some((s) => s.endsWith(SELECTOR))) {
      continue
    }
    const decl = {}
    for (const part of body.split(';')) {
      const i = part.indexOf(':')
      if (i > 0) {
        decl[part.slice(0, i).trim()] = part.slice(i + 1).trim()
      }
    }
    const ring = {width: decl['outline-width'], style: decl['outline-style'], offset: decl['outline-offset']}
    for (const token of (decl.outline ?? '').split(/\s+/).filter(Boolean)) {
      if (/^-?[\d.]+(px|rem|em)?$/.test(token)) {
        ring.width ??= token
      } else if (/^(none|solid|dashed|dotted|double|groove|ridge|inset|outset|auto)$/.test(token)) {
        ring.style ??= token
      }
    }
    for (const key of Object.keys(ring)) {
      if (ring[key] === undefined) {
        delete ring[key]
      }
    }
    if (Object.keys(ring).length === 0 || ring.style === 'none') {
      continue
    }
    rules.push({exact: selectors.length === 1 && selectors[0] === SELECTOR, ring})
  }
  return rules
}

/** A copy's base ring, after asserting every ring rule in it agrees with it. */
function ringOf(path, source) {
  const rules = ringRules(path, source)
  const base = rules.filter((r) => r.exact)
  assert.equal(base.length, 1, `${path}: one ${SELECTOR} rule`)
  const [{ring}] = base
  for (const key of ['width', 'style', 'offset']) {
    assert.ok(ring[key], `${path}: outline ${key} is declared`)
  }
  for (const {ring: other} of rules) {
    for (const [key, value] of Object.entries(other)) {
      assert.equal(value, ring[key], `${path}: every ring rule draws outline ${key} ${ring[key]}`)
    }
  }
  return ring
}

test('each copy declares one base ring rule, and every ring rule in it agrees', () => {
  for (const path of RING_COPIES) {
    ringOf(path, readFileSync(`${ROOT}${path}`, 'utf8'))
  }
})

test('every copy draws the ring with the same width, style and offset', () => {
  const [first, ...rest] = RING_COPIES.map((path) => ({path, ring: ringOf(path, readFileSync(`${ROOT}${path}`, 'utf8'))}))
  for (const {path, ring} of rest) {
    assert.deepEqual(ring, first.ring, `${path} matches ${first.path}`)
  }
})

test('the parser reads the shorthand, the longhands, contextual rules and a drifted copy', () => {
  const base = `${SELECTOR} { outline: 2px solid; outline-color: red; outline-offset: -1px; }`
  assert.deepEqual(ringOf('a.css', base), {width: '2px', style: 'solid', offset: '-1px'})
  const longhands = ringOf('b.css', `${SELECTOR} { outline-width: 2px; outline-style: solid; outline-offset: -3px; }`)
  assert.notDeepEqual(longhands, ringOf('a.css', base), 'a different offset is a different geometry')
  const astro = `---\nconst x = {a: 1}\n---\n<style is:global>\n  ${SELECTOR} {\n    outline: 2px solid;\n    outline-offset: -1px;\n  }\n</style>`
  assert.deepEqual(ringOf('c.astro', astro), {width: '2px', style: 'solid', offset: '-1px'})
  // A contextual rule that moves the ring is a drift (the reviewer's mutant D).
  assert.throws(() => ringOf('d.css', `${base}\n.shelf-book-active ${SELECTOR} { outline-offset: 3px; }`), /outline offset/)
  // ...also inside a selector list.
  assert.throws(() => ringOf('e.css', `${base}\n.x, .y\n  ${SELECTOR} { outline-width: 3px; }`), /outline width/)
  // A contextual rule that agrees, or one that sets only the colour, passes.
  ringOf('f.css', `${base}\n.shelf-book-active ${SELECTOR} { outline-offset: -1px; outline-color: blue; }`)
  // A rule that hides the ring (pointer suppression) draws no geometry.
  assert.deepEqual(ringRules('g.css', `:root[x] :focus-visible,\n:root[x] ${SELECTOR} { outline: none; }`), [])
  // A selector that only contains SELECTOR mid-way is another element.
  assert.deepEqual(ringRules('h.css', `${SELECTOR} + .x { outline-offset: 9px; }`), [])
})
