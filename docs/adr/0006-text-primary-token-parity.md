# ADR-0006 — text-primary Token Parity (F-001 skip retired)

## Context

`audits/checks/d3-token-parity.mjs` (P1, GOVERNANCE.md §5) diffs the resolved hex of each semantic color role across the two platform token outputs — the web `packages/tokens/dist/tokens.css` custom properties and the Swift `Colors.xcassets/color-*.colorset` assets. The gate historically carried an in-script `HARDCODED_SKIPS` set with one entry, `text-primary`, added when the role diverged across platforms (web `zinc.300`, Swift `zinc.200`). A `TODO(F-001)` comment deferred the decision, planning to "record in `parity-exceptions.json` once ADR-0001 lands." No such ADR ever landed (the `0001` slug is taken by an unrelated OMD decision), and the divergence itself was quietly reconciled in the token source without retiring the skip — leaving a dead exception that masks the role from the gate.

The viable options were: (a) move `text-primary` into `tokens/parity-exceptions.json` (the documented data-driven path, as the F-001 TODO intended); or (b) remove the skip entirely because the divergence no longer exists.

## Decision

Retire the skip entirely (option b). Verification against the current token outputs shows `text-primary` resolves to `zinc.300` = `#f0f0f0` **identically** on all three surfaces: the web `--lg-color-text-primary` custom property, the Swift `color-text-primary` xcasset (`0.9411764706` sRGB = `#f0f0f0`), and `LGColor.textPrimary` (which reads that xcasset). The parity gate passes on `text-primary` with `match: YES` on its own merits, so no exception is required. `HARDCODED_SKIPS` becomes an empty set and `tokens/parity-exceptions.json` stays `[]`.

Option (a) is explicitly rejected: `parity-exceptions.json` is for **active** intentional divergences, and exempting a role whose values match would silently allow a future real regression on `text-primary` to pass the gate — the exact failure the parity contract exists to catch. The stale `zinc.200` note in the `color.text.primary` token `$description` (which claimed the SwiftUI layer still used `#e4e4e7`) is corrected to reflect the reconciled `#f0f0f0` state.

## Consequence

The parity gate is now purely data-driven: the only exemption mechanism is `tokens/parity-exceptions.json`, and it is empty because there are no active token-tier color divergences. Any future intentional `text-primary` (or other role) divergence must be added there in the same PR as a referencing ADR, and any _unintentional_ divergence now fails the gate instead of being masked. The `F-001` / "pending ADR-0001" references in `check-token-parity.mjs` are removed; this ADR is their resolution.
