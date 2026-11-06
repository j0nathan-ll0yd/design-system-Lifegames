---
'@j0nathan-ll0yd/copy': patch
---

llm slice: stop calling the health figures aggregates, and mark the trend columns as not measured (atlas decisions 0120 D1 and 0128 P0b, owner ruling "Omit unsupported claims").

The health exports carry one day. `mantle-LifegamesPortal/src/lib/llm-content/aggregate.ts` states that every label describes one day, and `view.ts` fills every trend cell with the unavailable marker. Four leaves still implied more.

- `txt.whenToUseBody`: `health aggregates` becomes `health summaries`, twice.
- `full.systemFraming`: `live health aggregates` becomes `health summaries from the latest export`.
- `full.cardioColumns`, `full.sleepColumns`: the `Trend` header becomes `Trend (not measured)`. The column count stays at four, so the current backend template still renders a valid table.

Consumers that embed these leaves must update their snapshots when they adopt this version. `packages/copy/tests/llm-claim-honesty.test.ts` now rejects a `health aggregate` phrase and a bare `Trend` header.
