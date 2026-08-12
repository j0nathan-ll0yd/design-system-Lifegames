---
'@j0nathan-ll0yd/tokens': minor
---

Emit `dist/tokens.d.ts`, the declaration file the `.` export has always
declared but never shipped.

`package.json` has pointed the `.` export's `types` condition at
`./dist/tokens.d.ts` since 2.0.0, but the Style Dictionary build never wrote
one, so consumers got no types at all (`tsc` reported TS7016, "Could not find a
declaration file for module '@j0nathan-ll0yd/tokens'") and the export-surface
Level-2 gate read the subpath as INDETERMINATE — a declared-but-absent target
is never `NO_SURFACE`.

A new `lifegames/tokens.d.ts` Style Dictionary format generates the declarations
from the same resolved token tree that produces `dist/tokens.js`, so the two
cannot drift. Types are literal and `readonly`:
`tokens.color.pink['500']` now types as `'#ff006e'` rather than `string`. The
output is byte-gated by a golden snapshot like every other build artifact.

Additive only — no existing export changed shape.
