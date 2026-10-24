/// <reference types="vitest/config" />
import {defineConfig} from 'vitest/config'

// Node-side suite that drives Playwright directly at fixed viewports, like
// vitest.text-page.config.ts: where the homepage footer lands depends on the top-level
// page's scroll lock, so it cannot run inside vitest browser mode's iframe.
export default defineConfig({
  test: {name: 'web-home-footer', environment: 'node', include: ['tests/browser/home-footer.test.ts'], testTimeout: 30_000, hookTimeout: 60_000}
})
