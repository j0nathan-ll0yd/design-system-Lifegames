import {defineConfig} from 'astro/config'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import AstroPWA from '@vite-pwa/astro'
import sitemap from '@astrojs/sitemap'
import {CLOUDFRONT_BASE} from '@j0nathan-ll0yd/portal-contract/constants'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Derive the bare CloudFront host (no scheme) for service-worker URL patterns,
// escaped for safe interpolation into a RegExp.
const CLOUDFRONT_HOST = CLOUDFRONT_BASE.replace(/^https?:\/\//, '')
const CLOUDFRONT_HOST_RE = CLOUDFRONT_HOST.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export default defineConfig({
  site: 'https://jonathanlloyd.me',
  output: 'static',
  trailingSlash: 'never',
  build: {inlineStylesheets: 'always'},
  vite: {
    resolve: {
      alias: {
        '@manifest': path.resolve(__dirname, '../../Sources/LifegamesWidgets/Resources/widgets/widget-manifest.json'),
        '@widgets': path.resolve(__dirname, '../../packages/web/src/widgets'),
        '@fixtures': path.resolve(__dirname, '../../Sources/LifegamesWidgets/Resources/widgets'),
        '@islands': path.resolve(__dirname, '../../packages/web/src/islands'),
        '@runtime': path.resolve(__dirname, '../../packages/web/src/runtime')
      }
    }
  },
  integrations: [
    sitemap({filter: (page) => !page.includes('/showcase/'), lastmod: new Date()}),
    AstroPWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Jonathan Lloyd — Human Datastream',
        short_name: 'Human Datastream',
        description: 'Living data dashboard — tracking body and mind. Jack into his human datastream.',
        start_url: '/',
        scope: '/',
        theme_color: '#06060f',
        background_color: '#06060f',
        display: 'standalone',
        icons: [
          {src: '/assets/icon-192.png', sizes: '192x192', type: 'image/png'},
          {src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable'}
        ]
      },
      workbox: {
        globPatterns: ['**/*.{css,js,html,svg,png,ico,txt,webmanifest,woff2}'],
        globIgnores: ['images/books/**', 'images/theatre/**'],
        navigateFallbackDenylist: [/\.xml$/],
        runtimeCaching: [
          {
            urlPattern: /\/images\/(books|theatre)\//,
            handler: 'CacheFirst',
            options: {cacheName: 'local-images', expiration: {maxEntries: 200, maxAgeSeconds: 2592000}}
          },
          {
            urlPattern: new RegExp(`^https:\\/\\/${CLOUDFRONT_HOST_RE}\\/images\\/`),
            handler: 'CacheFirst',
            options: {cacheName: 'optimized-images-fallback', expiration: {maxEntries: 50, maxAgeSeconds: 604800}}
          },
          {
            urlPattern: new RegExp(`^https:\\/\\/${CLOUDFRONT_HOST_RE}\\/(?!.*[?&]_poll=).*\\.json$`),
            handler: 'NetworkFirst',
            options: {cacheName: 'live-data', networkTimeoutSeconds: 3, fetchOptions: {cache: 'no-store'}, expiration: {maxAgeSeconds: 300}}
          }
        ]
      }
    })
  ]
})
