---
'@j0nathan-ll0yd/web': patch
---

The ReadingFeed rows and the Bookshelf tiles now fail visible. `.article-list-item` and `.shelf-book` had a base `opacity: 0` that only their entry animation lifted. The keyframes live outside this package: `fadeSlideRight` in `tokens/animations`, `shelfFadeIn` in `tokens/effects`. A consumer that loaded `components.css` without the matching entrypoint showed rows that never appeared. The docs showcase Reading Feed card was empty for this reason.

- `packages/web/src/styles/components.css`: both rules drop the base `opacity: 0` and use `animation-fill-mode: backwards`. The keyframes' hidden from-state applies only while the stagger delay and the animation run. Without the keyframes there is no animation and the rows show at once.
- Both rules gain their own `prefers-reduced-motion: reduce` gate (`animation: none`). The `tokens/animations` override shortens the duration but keeps the stagger delay, which the backwards fill would hold hidden.
- `.article-list` resets its own `margin` and `padding`. A consumer without `tokens/reset` indented every row by the user agent list padding.
- The keyframes stay in the tokens package, their single source. A consumer that wants the entry motion loads `tokens/animations` and `tokens/effects`, as before.

Consumers may drop their own visibility overrides once they adopt this patch, for example `.article-list-item { opacity: 1; }`. An override that sets `opacity: 1` stays compatible: the rows already show without it.
