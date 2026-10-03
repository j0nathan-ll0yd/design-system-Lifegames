---
'@j0nathan-ll0yd/copy': minor
---

settings: add the token-verification strings for the Settings API section (atlas decision 0151, Phase 5).

Four additive keys under `app.settings.tokenVerification`, consumed on iOS as
`CopyLoader.app.settings.tokenVerification.*`:

- `verify` — "Verify". Button beside the token row; fires `GET /health/ping` with the saved
  bearer token.
- `valid` — "Token verified." Success line; states the fact and stops.
- `invalid` — "Token rejected. Paste a fresh one." 401: the token is wrong — permanent until
  the user acts on the token, so the line names the next action ("paste", matching
  `tokenPlaceholder` vocabulary).
- `unreachable` — "Could not reach the server. Try again when you are online." No response:
  transport failure, token unjudged, so the wording never blames the token. "Server" not
  "backend" — app copy already says Server (`serverLabel`, `simActive`).

A wrong token is the one failure the offline outbox can never heal — it looks exactly like
being offline until the user can verify it. The invalid/unreachable split keeps the two
failure classes distinct in the same result slot. Additive only — no existing key changed,
hence minor. Regenerated: `dist/app.flat.json`, `dist/app.flat.schema.json`, `dist/app.ts`,
`dist/app.zod.ts`, `Sources/LifegamesCopy/App.generated.swift`, and the bundled
`Sources/LifegamesCopy/Resources/app.en-US.json`.
