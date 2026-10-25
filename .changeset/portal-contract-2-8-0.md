---
'@j0nathan-ll0yd/fixtures': patch
'@j0nathan-ll0yd/schemas': patch
'@j0nathan-ll0yd/web': patch
---

Consume portal-contract 2.8.0 (atlas decision 0169). The dependency range moves from `^2.5.0` to `^2.8.0`.

portal-contract 2.8.0 regenerates its raw export schemas under zod 4.6.7, the release that closes GHSA-mrhx-c7xc-m3w5. The only byte change is the nullable form: `"type": ["x", "null"]` replaces `anyOf` with a `{"type": "null"}` branch. The accepted values are unchanged. No package here imports zod or the portal-contract validators.

- schemas: `generated/dashboard-health.schema.json` carries the new nullable form (5 fields). `.contract-lock.json` pins the 2.8.0 raw-schema checksums.
- fixtures: `check-full-coverage` recognizes both nullable forms. Before, the 2.8.0 schemas made it count 0 required-nullable checks and fail on 4 domains. It now counts 339 again, the same as against 2.7.0.
- web: the dependency range only.
