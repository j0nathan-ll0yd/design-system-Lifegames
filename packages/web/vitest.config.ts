/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/runtime/**/*.ts'],
      exclude: ['src/runtime/constants.ts', 'src/runtime/poll-types.ts', 'src/runtime/*-init.ts'],
    },
  },
});
