---
'@j0nathan-ll0yd/web': minor
---

Bind the image fallback to server-rendered book covers at load time.

The SSR shell emits `data-fallback` on Bookshelf covers, but the only code that
turned that attribute into behaviour was the live-data path (`updateBookshelf`,
`initBookshelf`, `initTheatreReviews`). Before the live-data swap — on the
offline PWA shell, on a slow or failing `books.json`, on any cover that 4xxs —
the covers had no handler and stayed blank, with no placeholder.

New export `initImageFallbacks(root = document)`: the load-time entry point for
server-rendered covers. It arms every cover still in flight and, unlike
`installImageFallbacks`, also recovers covers that already failed before any
script could run — the ordering SSR always produces. It is idempotent, so the
island, the production wrapper and a later updater may each call it.
`Bookshelf.astro` now bundles it (fallback wiring only: no click or keyboard
binding, so it cannot double-bind a consumer's page-level handlers).

The same-origin refusal and the `<picture><source>` neutralization from 3.0.1
are unchanged and apply on this path too. The live-data path is untouched.
