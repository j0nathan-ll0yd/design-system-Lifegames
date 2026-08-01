/// <reference types="vite/client" />

// @j0nathan-ll0yd/web is a source-distributed library, not an Astro app, so it has no
// Astro dependency of its own to provide the `*.astro` module declaration (Astro
// apps get this from `astro/client`). The barrels in src/ re-export `.astro`
// components, so a minimal ambient declaration is required for `tsc --noEmit`.
// tsc never parses the `.astro` files themselves; this only types the imports.
declare module '*.astro' {
  const Component: (props: Record<string, unknown>) => unknown
  export default Component
}
