---
'@j0nathan-ll0yd/web': minor
---

Server markup parity for the live homepage (atlas decision 0160). The server card is what a no-JS reader sees, so it now matches the browser updater:

- `ReadingFeed` links each article title (`<a class="article-list-title" target="_blank" rel="noopener noreferrer">`, https URLs only), shows the notes icon with its tooltip, and marks the list `aria-live="polite"`. `toReadingArticles` carries `url`, `hasNotes` and `noteText`, and the `Article` props type gains the three optional fields. The row markup has one owner, `articleRowHtml` in `runtime/widget-markup`, which the template and `updateReadingFeed` both call. The server renders the first page and no pager; the updater renders the full feed and the pager on load.
- `updateReadingFeed` marks its list `data-state-scaffold`, so a later empty read hides the list in place, as the server renders `empty`, and removes the pager.
- `Bookshelf` stars come from `ratingStarsHtml`, with no whitespace text nodes. The server stars were about 2 px wider apart than the updater's.
- `updateDevActivityLog` writes `data-sa-link-event="activity_click"` on every line, as the template does.
- The book modal escapes `statusLabel`, writes `status` only as a letters-only class token, writes numeric fields only when they are finite numbers, links only an https `link`, and renders no finished date for an unparseable `finishedAt` (it threw before).
