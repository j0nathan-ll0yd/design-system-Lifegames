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

test('the runtime placeholder constant is same-origin and unchanged', () => {
  const source = readFileSync(path.join(repoRoot, 'packages/web/src/runtime/image-utils.ts'), 'utf8')
  const match = source.match(/export const PLACEHOLDER_IMAGE_SRC = '([^']+)'/)
  assert.ok(match, 'PLACEHOLDER_IMAGE_SRC not found in image-utils.ts')
  assert.equal(match[1], PLACEHOLDER_IMAGE_SRC)
  assert.ok(match[1].startsWith('/'), 'the placeholder must be a same-origin path, never an absolute URL')
})
