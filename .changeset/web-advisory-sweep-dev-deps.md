---
'@j0nathan-ll0yd/web': patch
---

Security, advisory sweep 2026-10-21 (atlas decision 0163). Only `devDependencies` in `package.json` move; the published widget source does not change.

- `@vitest/browser` and `@vitest/browser-playwright`: exact pin `4.1.8` to `4.1.10` (GHSA-p63j-vcc4-9vmv, critical). Both peer `vitest` at exactly `4.1.10`, so the vitest family moves with them.
- `astro`: `^6.4.4` to `^6.4.8` (GHSA-2pvr-wf23-7pc7, fixed in 6.4.6).
- `vite`: `^8.0.16` to `^8.3.4` (GHSA-587h-7wmj-h5pm, fixed in 8.1.6).
