/// <reference types="vitest/config" />
import {getViteConfig} from 'astro/config'

// Server-render suite (atlas decision 0160, W4). It renders the production
// `.astro` widgets through the Astro Container API, so it needs Astro's Vite
// plugins to compile `.astro` files. A separate config keeps the jsdom unit
// suite (vitest.config.ts) free of them; `pnpm test` runs both.
export default getViteConfig({test: {name: 'web-server-render', environment: 'node', include: ['tests/server-render/**/*.test.ts']}})
