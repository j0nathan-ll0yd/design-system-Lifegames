---
'@j0nathan-ll0yd/tokens': patch
---

The Bookshelf tile focus ring in `packages/tokens/src/base.css` now lies inside the tile. `.shelf-book-link:focus-visible::after` takes `outline-offset: -1px` (was `3px`). The overlay covers the tile's padding box, 1px inside its border, so the 2px ring's outer edge is the tile's border edge. The shelf row clips anything past a tile and has no top or side padding, so the old ring, which reached 4px past the tile, lost its top and left edges. Pages that load `tokens/base` without the web package's `a11y.css`, such as the docs showcase, draw this copy. It matches the web package's ring, and `scripts/shelf-ring-geometry.test.mjs` holds the copies to one geometry.
