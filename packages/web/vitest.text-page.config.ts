/// <reference types="vitest/config" />
import {defineConfig} from 'vitest/config'

// Node-side suite that drives Playwright directly at fixed viewports (1400x900 and
// 390x844). Whether a document scrolls is a property of the top-level page, so it
// cannot run inside vitest browser mode's iframe; vitest.browser.config.ts never
// picks it up because it is not a *.browser.test.ts file.
export default defineConfig({
  test: {name: 'web-text-page', environment: 'node', include: ['tests/browser/text-page.test.ts'], testTimeout: 30_000, hookTimeout: 60_000}
})
