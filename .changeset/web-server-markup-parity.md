---
'@j0nathan-ll0yd/web': minor
---

Server markup parity for the live homepage (atlas decision 0160). The server card is what a no-JS reader sees, so it now matches the browser updater:

- `ReadingFeed` links each article title (`<a class="article-list-title" target="_blank" rel="noopener noreferrer">`, https URLs only), shows the notes icon with its tooltip, and marks the list `aria-live="polite"`. `toReadingArticles` carries `url`, `hasNotes` and `noteText`, and the `Article` props type gains the three optional fields. Each row has one owner, `articleItemHtml` in `runtime/widget-markup`, which the template and `updateReadingFeed` both call. The view model caps the server list at one client page (`READING_SERVER_PAGE_SIZE`, which the updater now reads too) and the server renders no pager; the updater renders the full feed and the pager on load.
- `updateReadingFeed` marks its list and its pager `data-state-scaffold`, so a later empty read hides both in place, as the server renders `empty`.
- `Bookshelf` stars come from `ratingStarsHtml`, with no whitespace text nodes. The server stars were about 2 px wider apart than the updater's. A book rated `0` no longer prints a stray `0` on the server.
- The Bookshelf `data-book` payload the book modal reads has one owner, `bookDataJson`. The template and the two updater paths wrote it three ways (different keys, `rating` dropped when null on the server). The updater now encodes it as a double-quoted, escaped attribute: the single-quoted form decoded an `&amp;` in a title. `amazonBookUrl` in `runtime/adapters` is the one Amazon link builder.
- `updateDevActivityLog` writes `data-sa-link-event="activity_click"` on every line, as the template does.
- The book modal escapes `statusLabel`, writes `status` only as a letters-only class token, writes numeric fields only when they are finite numbers, links only an https `link`, and renders no finished date for an unparseable `finishedAt` (it threw before).
