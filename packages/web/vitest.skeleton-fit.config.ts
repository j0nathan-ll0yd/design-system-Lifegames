/// <reference types="vitest/config" />
import {defineConfig} from 'vitest/config'

// Node-side suite that drives Playwright directly at the website's viewports, with
// JavaScript on and off: the top-level page width decides each card's loading height,
// so it cannot run inside vitest browser mode's iframe.
export default defineConfig({
  test: {name: 'web-skeleton-fit', environment: 'node', include: ['tests/browser/skeleton-fit.test.ts'], testTimeout: 30_000, hookTimeout: 60_000}
})
