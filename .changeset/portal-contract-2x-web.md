---
'@j0nathan-ll0yd/web': patch
---

Widen the `@j0nathan-ll0yd/portal-contract` dependency range from `^1.0.0` to `^2.0.0`.

Published `package.json` payload only — no source, export-surface, or rendering change. The
widget runtime reads the `mainImage*` / `imageUrl*` URLs directly and ignores the new
`mainImageVersion` / `imageVersion` fields.
