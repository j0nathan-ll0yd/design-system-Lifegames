---
'@j0nathan-ll0yd/web': patch
---

The ReadingFeed rows and the Bookshelf tiles now fail visible. `.article-list-item` and `.shelf-book` had a base `opacity: 0` that only their entry animation lifted. The keyframes live outside this package: `fadeSlideRight` in `tokens/animations`, `shelfFadeIn` in `tokens/effects`. A consumer that loaded `components.css` without the matching entrypoint showed rows that never appeared. The docs showcase Reading Feed card was empty for this reason.

- `packages/web/src/styles/components.css`: both rules drop the base `opacity: 0` and use `animation-fill-mode: backwards`. The keyframes' hidden from-state applies only while the stagger delay and the animation run. Without the keyframes there is no animation and the rows show at once.
- Both rules gain their own `prefers-reduced-motion: reduce` gate (`animation: none`). The `tokens/animations` override shortens the duration but keeps the stagger delay, which the backwards fill would hold hidden.
- `.article-list` resets its own `margin` and `padding`. A consumer without `tokens/reset` indented every row by the user agent list padding.
- The hover motion now works where the keyframes load. The old `forwards` fill held `transform: translateX(0)` after the entry animation, which blocked `.article-list-item:hover` (6px right) and `.shelf-book:hover` (4px up). With the `backwards` fill the hover rules apply once the animation ends. The `.shelf-row` padding below keeps the lifted tile inside the row.
- The ReadingFeed pager restarts the stagger at the top of each page. The row markup (`articleItemHtml`) staggers by position in the whole list, and showing a page clears `display: none`, which restarts each row's entry animation. A page-2 row waited 0.7 to 1.33 s (a page-3 row 1.4 s or more) before it appeared, each time its page showed. `showPage` in `packages/web/src/runtime/reading-feed-init.ts` now sets each shown row's delay from its index on the page. No export changes.
- `.shelf-row` keeps a Bookshelf tile's keyboard focus ring inside its scroll box. The ring reaches 4px past the tile, and the row, which clips at its padding edge, had no top or side padding, so the ring lost its top and left edges. The row now has 4px of padding on the top and sides, matched by a -4px margin and 4px `scroll-padding-inline`. The tiles and their snap positions do not move.
- `.shelf-book-active` drops its `opacity: 1`. It only undid the removed hidden base.
- The keyframes stay in the tokens package, their single source. A consumer that wants the entry motion loads `tokens/animations` and `tokens/effects`, as before.

Consumers may drop their own visibility overrides once they adopt this patch, for example `.article-list-item { opacity: 1; }`. An override that sets `opacity: 1` stays compatible: the rows already show without it.
