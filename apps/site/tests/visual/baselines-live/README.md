# Live-site baselines (frozen)

Frozen snapshot of production `https://jonathanlloyd.me/` captured before the absorption of `j0nathan-ll0yd.github.io` into this monorepo.

- **Captured:** 2026-05-23
- **Source SHA:** `56da36cc5402ecc8e373c0bb5cf63466892c6c6e` (`j0nathan-ll0yd.github.io@main`)
- **Viewports:** 1400×900, 1100×800, 768×1024, 600×900 (full-page)
- **Stabilization:** `serviceWorkers: 'block'`, `reducedMotion: 'reduce'`, consumer's `tests/visual/screenshot.css` injected at runtime
- **Use:** Ground-truth oracle for the §7 parity criterion ("apps/site renders identically to the live site"). The parity comparator (`scripts/compare-portfolio-site.mjs`, repointed in Step 10) diffs `apps/site` build output against these files.

Do not regenerate after Step 1. These files are immutable for the duration of the Phase-1 absorption window.
