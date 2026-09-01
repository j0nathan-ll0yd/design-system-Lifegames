---
'@j0nathan-ll0yd/web': patch
---

Give the MovementRings ring group an accessible name (axe `svg-img-alt`, SERIOUS).

`MovementRings.astro` carried `aria-label` on the `.mv-rings` wrapper while `role="img"` sat on the
child `<svg>`. An accessible name is computed for the element that carries the role, and `aria-label`
is prohibited on a bare `div` (implicit `role=generic`), so the rings shipped with no accessible name
at all — a screen reader announced nothing for the widget's primary graphic. Both attributes now sit
on the `<svg>`, matching the `.mv-sun-track` pairing in the same file.

Rendered markup only. No prop, export-surface, or runtime change: `updateMovementRings` never read or
wrote the label.
