// Guards the first-party image placeholder (atlas decision 0086).
//
// The canonical asset ships inside the published package at
// packages/web/src/assets/no-cover.svg. The in-repo consumer serves its own
// copy from apps/portfolio/public/images/no-cover.svg, because a package's
// src/ is not on any static route. Two copies means they can drift, so the
// identity is asserted here rather than left to a comment.

import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CANONICAL = path.join(repoRoot, 'packages/web/src/assets/no-cover.svg')
const SERVED = path.join(repoRoot, 'apps/portfolio/public/images/no-cover.svg')

// Must match PLACEHOLDER_IMAGE_SRC in packages/web/src/runtime/image-utils.ts.
const PLACEHOLDER_IMAGE_SRC = '/images/no-cover.svg'

test('the served placeholder is byte-identical to the canonical asset', () => {
  assert.deepEqual(readFileSync(SERVED), readFileSync(CANONICAL),
    'apps/portfolio/public/images/no-cover.svg drifted from packages/web/src/assets/no-cover.svg')
})

test('the served placeholder sits at the path the runtime points at', () => {
  const servedRoot = path.join(repoRoot, 'apps/portfolio/public')
  assert.equal('/' + path.relative(servedRoot, SERVED), PLACEHOLDER_IMAGE_SRC)
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
