---
'@j0nathan-ll0yd/web': patch
---

Make the web widget-purity lint blocking, and scan the two extensions it claimed but never received.

`lint` now runs `eslint "src/**/*.{ts,tsx,js,jsx,astro,css}" --max-warnings 0`. Previously it was
`{ts,tsx,js,jsx,astro}` with no `--max-warnings`, and both `no-app-module-imports` (P3) and
`widget-props-extends-schema` (W16) were configured `warn` — so a widget importing `axios` beside a
`.types.ts` with no schema import printed `2 problems (0 errors, 2 warnings)` and exited 0.

Three scope gaps closed alongside the severity raise, because raising one without the others would
have gated only part of the tree:

- `no-app-module-imports` now matches `.astro`. A module-scope `fetch` and a data-layer import in an
  `.astro` widget's frontmatter previously produced no diagnostic at all.
- `no-raw-hex-in-widgets` now actually receives `.css`. Its file pattern always admitted `.css` and
  its scan always read raw source text, but no config block matched a stylesheet, so ESLint never
  handed it one.
- Both P3 and W16 are `error`.

No behavioural change to any shipped component. Measured blast radius of the raise across the whole
widget tree: zero existing violations.
