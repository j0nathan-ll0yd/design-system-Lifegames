---
'@j0nathan-ll0yd/schemas': minor
---

Consume `@j0nathan-ll0yd/portal-contract` 2.x (`^1.0.0` → `^2.0.0`).

The caret on 1.x could not reach the published 2.x, so the schema snapshot was frozen at
its 2026-08-26 state. The regenerated emitted types now carry the producer's
content-versioned cover fields: `BooksExport.mainImageVersion` and
`TheatreReviewsExport.imageVersion` (both required-nullable), plus the optional
`FocusExport.hidingSince`. `.contract-lock.json` is regenerated against the 2.x raw
schemas; `contract:verify` passes.

All three additions are additive. No emitted type lost a member.
