---
'@j0nathan-ll0yd/fixtures': minor
---

Regenerate raw fixtures against `@j0nathan-ll0yd/portal-contract` 2.x (`^1.0.0` → `^2.0.0`).

Books entries now carry `mainImageVersion` and theatre-review entries `imageVersion`, both
required-nullable in the 2.x contract. They follow the producer's own invariant: a version
is non-null exactly when the entry's optimized derivative URLs are non-null, so the `full`
variations carry one and the default factories do not. Focus `full` gains the optional
`hidingSince`, and the `focus` full-coverage walker exception is removed — its rationale
("all properties required and non-nullable") stopped being true once 2.x added that key.

New export from `./raw`: `imageVersion(seed)`, a deterministic 24-hex-character stand-in for
the producer's image `contentVersion`, so generated fixtures stay byte-reproducible.

Post-adapter (display-shape) fixtures are unchanged — the new fields are pre-adapter only.
