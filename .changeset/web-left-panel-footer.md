---
'@j0nathan-ll0yd/web': patch
---

`layout.css` places the homepage site footer: a new `.left-panel-footer` class for a footer that holds `SiteFooterNav` as the last child of `.left-panel` (atlas decision 0158, plan is-agentic-developers-link). From 1100px up the body does not scroll, so a footer after `.command-layout` sat below the viewport where no reader could reach it. The footer now closes the left column after System Status, and drops to the foot of the panel when the column has room. Below 1100px `.left-panel` is `display: contents`, and the footer takes `order: 100`, after System Status (`order: 99`), so it ends the page. Spacing uses `--lg-space-*` tokens. No existing selector changes. A new browser suite (`tests/browser/home-footer.test.ts`) checks the order and reaches the last link with a mouse wheel at 1400x900, 1400x3000, 900x1100 and 390x844.
