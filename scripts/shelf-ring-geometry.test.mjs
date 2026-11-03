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
// The colour stays out of the comparison: each copy names its own token alias.

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

/**
 * The outline width, style and offset of each rule whose whole selector is
 * SELECTOR. A selector list that merely contains it (a11y.css's pointer
 * suppression) is not the ring rule.
 */
function ringRules(path, source) {
  const css = cssOf(path, source).replace(/\/\*[\s\S]*?\*\//g, '')
  const rules = []
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (selector.trim() !== SELECTOR) {
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
    rules.push(ring)
  }
  return rules
}

test('each copy declares exactly one ring rule with width, style and offset', () => {
  for (const path of RING_COPIES) {
    const rules = ringRules(path, readFileSync(`${ROOT}${path}`, 'utf8'))
    assert.equal(rules.length, 1, `${path}: one ${SELECTOR} rule`)
    const [ring] = rules
    for (const key of ['width', 'style', 'offset']) {
      assert.ok(ring[key], `${path}: outline ${key} is declared`)
    }
  }
})

test('every copy draws the ring with the same width, style and offset', () => {
  const [first, ...rest] = RING_COPIES.map((path) => ({path, ring: ringRules(path, readFileSync(`${ROOT}${path}`, 'utf8'))[0]}))
  for (const {path, ring} of rest) {
    assert.deepEqual(ring, first.ring, `${path} matches ${first.path}`)
  }
})

test('the parser reads the shorthand, the longhands and a drifted copy', () => {
  const a = ringRules('a.css', `${SELECTOR} { outline: 2px solid; outline-color: red; outline-offset: -1px; }`)
  assert.deepEqual(a, [{width: '2px', style: 'solid', offset: '-1px'}])
  const b = ringRules('b.css', `${SELECTOR} { outline-width: 2px; outline-style: solid; outline-offset: -3px; }`)
  assert.notDeepEqual(b[0], a[0], 'a different offset is a different geometry')
  const astro = ringRules('c.astro',
    `---\nconst x = {a: 1}\n---\n<style is:global>\n  ${SELECTOR} {\n    outline: 2px solid;\n    outline-offset: -1px;\n  }\n</style>`)
  assert.deepEqual(astro, a)
  // A selector list that contains the ring selector is not the ring rule.
  assert.deepEqual(ringRules('d.css', `:root[x] :focus-visible,\n${SELECTOR} { outline: none; }`), [])
})
