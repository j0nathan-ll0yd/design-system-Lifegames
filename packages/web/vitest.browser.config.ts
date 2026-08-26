/// <reference types="vitest/config" />
import {defineConfig} from 'vitest/config'
import {playwright} from '@vitest/browser-playwright'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

// Real-browser suite, deliberately SEPARATE from vitest.config.ts.
//
// The jsdom suite cannot decide the question this one exists to answer. jsdom
// implements no <picture> source selection at all, so a dead <source> and a
// live one look identical to it -- which is exactly how 3.0.0 shipped an image
// fallback that never painted. Only a real engine resolves the candidate list.
//
// It is a separate config, and a separate CI job on the playwright-labelled
// runner, because `pnpm -F @j0nathan-ll0yd/web test` runs on a node-labelled
// self-hosted runner with no browser binaries.
const PLACEHOLDER_PATH = '/images/no-cover.svg'
const placeholderFile = fileURLToPath(new URL('./src/assets/no-cover.svg', import.meta.url))

// The fallback target is a bare same-origin path that a consumer serves from
// its static root. Serving the real asset here is what makes "did it actually
// paint?" a meaningful assertion rather than a 404 either way.
function servePlaceholder() {
  return {
    name: 'serve-no-cover-placeholder',
    configureServer(server: {middlewares: {use(fn: (req: {url?: string}, res: any, next: () => void) => void): void}}) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || new URL(req.url, 'http://localhost').pathname !== PLACEHOLDER_PATH) {
          return next()
        }
        res.setHeader('Content-Type', 'image/svg+xml')
        res.end(readFileSync(placeholderFile))
      })
    }
  }
}

export default defineConfig({
  plugins: [servePlaceholder()],
  test: {
    name: 'web-browser',
    include: ['tests/browser/**/*.browser.test.ts'],
    browser: {enabled: true, headless: true, provider: playwright(), instances: [{browser: 'chromium'}]}
  }
})
