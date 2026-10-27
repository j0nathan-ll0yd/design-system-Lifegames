---
'@j0nathan-ll0yd/web': patch
'@j0nathan-ll0yd/tokens': patch
---

Remove the dead map styles. The website map left on 2026-02-28 (website commit `f50e4520`), and no page renders map markup or loads Leaflet (atlas decision 0157). No rendered pixel changes.

- `packages/web`: drop `.map-wrapper`, `.map-wrapper .leaflet-container`, `.map-wrapper .leaflet-control-attribution`, `.map-wrapper .leaflet-control-zoom`, `.map-overlay`, `.map-marker-pulse`, `.map-marker-dot`, `.map-marker-ring`, `.map-meta-row` and `.map-meta-value` from `src/styles/components.css`, and the three responsive `.map-wrapper` height overrides from `src/styles/layout.css`. The two stylesheets lose 1810 bytes.
- `packages/tokens`: drop `@keyframes mapRingPulse` from `src/effects.css`. Only `.map-marker-ring` used it. The file loses 179 bytes.
