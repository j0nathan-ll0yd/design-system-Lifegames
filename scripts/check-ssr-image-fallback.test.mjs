// Every server-rendered cover that carries `data-fallback` must also ship a
// load-time init that binds a handler to it (atlas decision 0086 follow-up).
//
// The attribute alone does nothing: it is inert markup, and until 3.0.2 the only
// code that turned it into behaviour was the live-data path (updateBookshelf /
// initBookshelf / initTheatreReviews). A widget that server-renders covers and
// bundles no init therefore shows blank covers on the offline shell, on a slow
// books.json, and on any cover that 4xxs -- which is exactly what shipped.
//
// This is the cheap static half of the gate. The end-to-end proof (does the
// placeholder actually paint?) is
// packages/web/tests/browser/ssr-image-fallback.browser.test.ts.

import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readdirSync, readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const WEB_SRC = path.join(repoRoot, 'packages/web/src')

/** The exported load-time entry point. Named here so a rename breaks this gate
 *  rather than silently disarming it. */
const INIT_FN = 'initImageFallbacks'

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    if (entry.name === 'node_modules') {
      continue
    }
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...walk(full))
    } else if (entry.name.endsWith('.astro')) {
      out.push(full)
    }
  }
  return out
}

/** .astro files whose own MARKUP emits a data-fallback attribute — i.e. covers
 *  that exist in the HTML the server sends, before any script runs. */
function ssrFallbackComponents() {
  return walk(WEB_SRC).filter((file) => /data-fallback\s*=/.test(readFileSync(file, 'utf8')))
}

test('the runtime exports a load-time init for server-rendered covers', () => {
  const source = readFileSync(path.join(WEB_SRC, 'runtime/image-utils.ts'), 'utf8')
  assert.match(source, new RegExp(`export function ${INIT_FN}\\b`), `${INIT_FN} is the SSR entry point; it must stay exported`)
})

test('at least one component server-renders a data-fallback cover', () => {
  // Guards the gate itself: a filter that matches nothing would pass vacuously.
  assert.ok(ssrFallbackComponents().length > 0, 'no .astro emits data-fallback — has the attribute been renamed?')
})

test('every component that server-renders data-fallback bundles the load-time init', () => {
  for (const file of ssrFallbackComponents()) {
    const source = readFileSync(file, 'utf8')
    const rel = path.relative(repoRoot, file)
    assert.match(source, new RegExp(`<script[^>]*>[\\s\\S]*${INIT_FN}\\s*\\(`),
      `${rel} server-renders covers with data-fallback but bundles no ${INIT_FN}() call — those covers stay blank when the image fails before the live-data swap`)
    assert.ok(!/<script[^>]*\bis:inline\b/.test(source), `${rel} must bundle the init, not inline it (CSP script-src 'self')`)
  }
})
