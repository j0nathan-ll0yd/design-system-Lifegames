---
'@j0nathan-ll0yd/copy': patch
'@j0nathan-ll0yd/schemas': patch
'@j0nathan-ll0yd/web': patch
'@j0nathan-ll0yd/tokens': patch
---

Adopt repo-wide Prettier formatting with a blocking CI `format:check` gate (issue #54). Generated artifacts (`packages/copy/dist/*.zod.ts`, schemas `dist` types, `fixture-map.json`, widget schemas, DTCG audit) are now formatted in-generator so they are readable and diff-friendly. This is a formatting-only change — no token values, schema shapes, copy strings, or public APIs change.
