/// <reference types="vitest/config" />
import {defineConfig} from 'vitest/config'

// Node-side suite that drives Playwright directly with JavaScript DISABLED.
// vitest browser mode cannot turn page JS off, so this is not a
// *.browser.test.ts file and vitest.browser.config.ts never picks it up.
export default defineConfig({
  test: {name: 'web-scripts-off', environment: 'node', include: ['tests/browser/scripts-off.test.ts'], testTimeout: 30_000, hookTimeout: 60_000}
})
