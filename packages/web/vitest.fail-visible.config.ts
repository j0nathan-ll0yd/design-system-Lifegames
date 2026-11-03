/// <reference types="vitest/config" />
import {defineConfig} from 'vitest/config'

// Node-side suite that drives Playwright directly: each page opens in its own
// context with a set `prefers-reduced-motion`, and the suite compares a page
// with the token keyframes against one without them. vitest.browser.config.ts
// never picks it up because it is not a *.browser.test.ts file.
export default defineConfig({
  test: {name: 'web-fail-visible', environment: 'node', include: ['tests/browser/fail-visible.test.ts'], testTimeout: 30_000, hookTimeout: 60_000}
})
