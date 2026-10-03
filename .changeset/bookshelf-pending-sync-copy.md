---
'@j0nathan-ll0yd/copy': minor
---

bookshelf: add the pending-sync strings for optimistic book edits (atlas decision 0151, Phase 2).

Three additive keys under `app.bookshelf.pending`, consumed on iOS as
`CopyLoader.app.bookshelf.pending.*`:

- `rowBadge` — "Waiting to sync". Per-row badge on a book whose edit is queued locally.
- `pill` — `{count, plural, one {# change waiting to sync} other {# changes waiting to sync}}`.
  ICU MF1 plural; the consumer renders it only while at least one write is queued, so no `=0`
  clause. Same authoring pattern as `location.placeRename.result`.
- `stuck` — "Still waiting to sync. Check your connection, or your token in Settings."
  Escalation line once a queued edit has waited past the stuck threshold: states the fact,
  then the two things worth checking.

Queued transient writes stay quiet states, never alerts, and the wording names the action in
progress rather than the bare word "offline". Additive only — no existing key changed, hence
minor. Regenerated: `dist/app.flat.json`, `dist/app.flat.schema.json`, `dist/app.ts`,
`dist/app.zod.ts`, `Sources/LifegamesCopy/App.generated.swift`, and the bundled
`Sources/LifegamesCopy/Resources/app.en-US.json`.
