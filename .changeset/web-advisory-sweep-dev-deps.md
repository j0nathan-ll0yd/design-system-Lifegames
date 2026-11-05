---
'@j0nathan-ll0yd/web': patch
---

Security, advisory sweep (atlas decision 0163). Only `devDependencies` in `packages/web/package.json` move; the published widget source does not change.

- `@vitest/browser` and `@vitest/browser-playwright`: exact pin `4.1.8` to `4.1.12`. This clears GHSA-p63j-vcc4-9vmv (critical, fixed in 4.1.10) and the `vitest` and `@vitest/mocker` advisories GHSA-82fw-gwwq-j7x9 and GHSA-qxg6-89mg-rqv8 (fixed in 4.1.11 and 4.1.12). Both packages peer `vitest` at exactly `4.1.12`, so the vitest family moves with them.
