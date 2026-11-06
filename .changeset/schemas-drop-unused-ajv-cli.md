---
'@j0nathan-ll0yd/schemas': patch
---

Security, advisory sweep (atlas decision 0163). Remove the unused `ajv-cli` devDependency from `packages/schemas/package.json`. No script, workflow or hook runs it, and `scripts/validate.ts` uses the `ajv` library directly. The removal drops `fast-json-patch` (GHSA-8gh8-hqwg-xf34) and needs no cross-major override. The published schemas do not change.
