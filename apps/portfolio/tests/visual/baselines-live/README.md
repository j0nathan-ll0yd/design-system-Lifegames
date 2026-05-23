# Live-site baselines (frozen)

Frozen snapshot of production `https://jonathanlloyd.me/` captured before `j0nathan-ll0yd.github.io` begins consuming `@lifegames/{tokens,web}` from this design system.

- **Captured:** 2026-05-23
- **Source SHA:** `56da36cc5402ecc8e373c0bb5cf63466892c6c6e` (`j0nathan-ll0yd.github.io@main`)
- **Viewports:** 1400×900, 1100×800, 768×1024, 600×900 (full-page)
- **Stabilization:** `serviceWorkers: 'block'`, `reducedMotion: 'reduce'`, github.io's `tests/visual/screenshot.css` injected at runtime
- **Use:** Ground-truth oracle for visual parity. Two consumers:
  1. `apps/portfolio` (in-DS preview) — diffed against these PNGs after DS package changes.
  2. `j0nathan-ll0yd.github.io` (separate repo, production deploy) — diffed against these PNGs after each migration milestone (token swap, widget swaps) to confirm pixel-identical output after replacing forked code with `@lifegames/*` imports.

Do not regenerate. These files are immutable for the duration of the cross-repo migration window.
