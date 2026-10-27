---
'@j0nathan-ll0yd/web': minor
---

Give every Bookshelf tile a real link to its book (atlas decision 0160 D5). Crawlers and visitors without JavaScript now reach the book from the server markup. The book dialog is an enhancement on top of the link.

- `Bookshelf.astro`: each `li.shelf-book` wraps its content in one `<a class="shelf-book-link">` with `href`, `target="_blank"`, `rel="sponsored noopener noreferrer"` and `aria-label`. The `href` is `amazonBookUrl(asin)`: `https://www.amazon.com/dp/<ASIN>?tag=lifegames04-20&linkCode=ll2&language=en_US&ref_=as_li_ss_tl`, the same string `data-book.link` carries. The `aria-label` moves from the `<li>` to the link. The `<li>` loses `tabindex="0"`, because the link takes focus. `data-book` stays on the `<li>`.
- `initBookModal`: a plain primary click (button 0, no meta, ctrl, shift or alt key) opens the dialog and prevents the navigation. Enter on the link fires that click. Every other click keeps the browser default, so a modified or middle click opens Amazon. The tile's keydown handler is gone: Space no longer opens the dialog. A `data-book` payload that does not parse leaves the click to the browser. On close, focus returns to the link.
- `initBookshelf` (the showcase island) applies the same rule to its `book-clicked` event.
- `updateBookshelf` writes the link on a rebuild and moves each link's `href` and `aria-label` on an in-place patch.
- `components.css` adds `.shelf-book-link` (block, inherited color, no underline), so the tile renders as before. It drops the `.shelf-book-title a` rules, which matched no element. `a11y.css` moves the green focus ring from `.shelf-book:focus-visible` to `.shelf-book-link:focus-visible`.
- New export `BOOK_LINK_REL` from `runtime/widget-markup` and `isPlainPrimaryClick` from `runtime/input-modality`.

Consumer actions, before a consumer adopts this version:

- A consumer with a fragment allowlist must admit `a.shelf-book-link` with an `https://www.amazon.com/dp/<ASIN>` href (with the query string above), `target="_blank"`, `rel="sponsored noopener noreferrer"` and `aria-label`. It must also admit the class `shelf-book-link`. Otherwise the website's composed page refuses the Bookshelf fragment and falls back to its data-free state. On the website: `src/lib/composed/fragment-policy.ts` (the `rel` rule admits only `noopener` and `noreferrer` today) and `src/lib/composed/fragment-classes.ts` (the Bookshelf class list).
- A consumer test that focuses the tile must focus its link. The `<li>` no longer takes focus, and focus returns to the link when the dialog closes. On the website: `tests/behavioral/book-modal.spec.ts` tests 6, 6b and 6c, and the focus comment in `src/layouts/Dashboard.astro`.
- The green focus ring is on `.shelf-book-link:focus-visible`.
