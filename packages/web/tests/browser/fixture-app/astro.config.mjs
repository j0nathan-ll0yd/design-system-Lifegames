import {defineConfig} from 'astro/config'

// Matches the apps. astro 7 defaults to compressHTML 'jsx', which drops whitespace between multi-line
// elements, and Vite 8 defaults to the Lightning CSS minifier, which drops the 100vh fallback that
// tests/browser/text-page.test.ts proves. These fixtures must render what the apps render.
export default defineConfig({output: 'static', compressHTML: true, vite: {build: {cssMinify: 'esbuild'}}})
