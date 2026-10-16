---
'@j0nathan-ll0yd/web': patch
---

`runtime/freshness`: the articles export is now re-exported daily (mantle-LifegamesPortal #388), so `EXPORT_FRESHNESS.articles` moves from warn 7 d and error 14 d to warn 3 d and error 6 d, three and six times the daily cadence. The Reading Feed card reads `stale` past 3 days, and `isFreshnessDegraded` reports it past 6 days. The ages restate `atlas/surfaces.yaml` `export-articles-json`.
