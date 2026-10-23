/// <reference types="vitest/config" />
import {defineConfig} from 'vitest/config'

// Node-side suite that drives Playwright directly with JavaScript DISABLED.
// vitest browser mode cannot turn page JS off, so this is not a
// *.browser.test.ts file and vitest.browser.config.ts never picks it up.
// relative-time.test.ts loads one page with JavaScript off and on, so it
// needs the same per-context switch.
export default defineConfig({
  test: {
    name: 'web-scripts-off',
    environment: 'node',
    include: ['tests/browser/scripts-off.test.ts', 'tests/browser/relative-time.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000
  }
})
