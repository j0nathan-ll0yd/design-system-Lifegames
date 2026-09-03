---
'@j0nathan-ll0yd/copy': minor
---

Add `app.bookshelf.alerts.kindleEditionRejected` — the message the Life Portal bookshelf shows when the ASIN detected in the Amazon browser is a Kindle edition.

A Kindle ASIN has no ISBN and no Open Library record, so metadata enrichment can never succeed for it: the book lands in the catalog with its ASIN as the title, `Unknown` as the author, and no cover. The string names the recovery step (switch the format to a print edition) rather than the failure.
