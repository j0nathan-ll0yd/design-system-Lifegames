---
'@j0nathan-ll0yd/fixtures': patch
---

Record the cover inventory key by key. `src/cover-inventory.ts` now lists every cover key the distribution serves per ASIN (`COVER_KEYS`), adds `coverExists(url)`, and derives `COVERED_ASINS` as the ASINs that serve all six derivatives. A probe on 2026-11-02 found 080413717X and 1984820680 serve all six keys, and 0593128508 serves its three webp keys only. No fixture data changes; the module is not exported from the package entry points.
