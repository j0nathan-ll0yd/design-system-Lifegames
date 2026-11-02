---
'@j0nathan-ll0yd/web': patch
'@j0nathan-ll0yd/tokens': patch
---

The ReadingFeed rows and the Bookshelf tiles now fail visible. `.article-list-item` and `.shelf-book` had a base `opacity: 0` that only their entry animation lifted. The keyframes live outside this package: `fadeSlideRight` in `tokens/animations`, `shelfFadeIn` in `tokens/effects`. A consumer that loaded `components.css` without the matching entrypoint showed rows that never appeared. The docs showcase Reading Feed card was empty for this reason.

- `packages/web/src/styles/components.css`: both rules drop the base `opacity: 0` and use `animation-fill-mode: backwards`. The keyframes' hidden from-state applies only while the stagger delay and the animation run. Without the keyframes there is no animation and the rows show at once.
- Both rules gain their own `prefers-reduced-motion: reduce` gate (`animation: none`). The `tokens/animations` override shortens the duration but keeps the stagger delay, which the backwards fill would hold hidden.
- `.article-list` resets its own `margin` and `padding`. A consumer without `tokens/reset` indented every row by the user agent list padding.
- The hover motion now works where the keyframes load. The old `forwards` fill held `transform: translateX(0)` after the entry animation, which blocked `.article-list-item:hover` (6px right) and `.shelf-book:hover` (4px up). With the `backwards` fill the hover rules apply once the animation ends. A lifted tile's top 4px is its transparent border and padding, so no cover or text is cut. A tile that shows its keyboard focus ring does not lift, so the ring stays inside the row.
- The ReadingFeed pager restarts the stagger at the top of each page. The row markup (`articleItemHtml`) staggers by position in the whole list, and showing a page clears `display: none`, which restarts each row's entry animation. A page-2 row waited 0.7 to 1.33 s (a page-3 row 1.4 s or more) before it appeared, each time its page showed. `showPage` in `packages/web/src/runtime/reading-feed-init.ts` now sets each shown row's delay from its index on the page. No export changes.
- A Bookshelf tile's keyboard focus ring now lies inside the tile. The ring reached 4px past the tile, and `.shelf-row`, which clips at its padding edge, had no top or side padding, so the ring lost its top and left edges. The ring now uses `outline-offset: -1px` on the title link's overlay. Its outer edge is the tile's border edge, in the tile's own transparent border and padding. `.shelf-row` needs no padding or negative margin for it, so a list reset cannot clip it. The website loads `tokens/reset` unlayered, which zeroes `ul` padding and margin. The tiles, their snap positions and the card size do not move.
- `packages/tokens/src/base.css` carries the same ring for pages that load `tokens/base` without the web package's `a11y.css`, such as the docs showcase. It takes the same `-1px` offset.
- `.shelf-book-active` drops its `opacity: 1`. It only undid the removed hidden base.
- The keyframes stay in the tokens package, their single source. A consumer that wants the entry motion loads `tokens/animations` and `tokens/effects`, as before.

Consumers may drop their own visibility overrides once they adopt this patch, for example `.article-list-item { opacity: 1; }`. An override that sets `opacity: 1` stays compatible: the rows already show without it.
