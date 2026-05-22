import { defineConfig } from 'astro/config';
import { readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AstroPWA from '@vite-pwa/astro';
import sitemap from '@astrojs/sitemap';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  site: 'https://jonathanlloyd.me',
  output: 'static',
  trailingSlash: 'never',
  build: { inlineStylesheets: 'always' },
  vite: {
    resolve: {
      alias: {
        '@manifest': path.resolve(__dirname, '../../Sources/LifegamesWidgets/Resources/widgets/widget-manifest.json'),
        '@widgets': path.resolve(__dirname, '../../packages/web/src/widgets'),
        '@fixtures': path.resolve(__dirname, '../../Sources/LifegamesWidgets/Resources/widgets'),
        '@islands': path.resolve(__dirname, '../../packages/web/src/islands'),
        '@runtime': path.resolve(__dirname, '../../packages/web/src/runtime'),
      },
    },
    server: {
      proxy: {
        '/api/live': {
          target: 'https://d1pfm520aduift.cloudfront.net',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/live/, ''),
        }
      }
    }
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/showcase/'),
      lastmod: new Date()
    }),
  ]
});
