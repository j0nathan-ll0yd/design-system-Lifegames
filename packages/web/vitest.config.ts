/// <reference types="vitest/config" />
import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    // tests/browser/** needs a real engine and runs from vitest.browser.config.ts.
    // Under jsdom those specs fail outright: there is no <picture> source
    // selection and no image decoding, which is precisely why they exist.
    exclude: ['tests/browser/**'],
    clearMocks: true,
    coverage: {provider: 'v8', include: ['src/runtime/**/*.ts'], exclude: ['src/runtime/constants.ts', 'src/runtime/*-init.ts']}
  }
})
