# Quarterly Checks: Active Deprecations

The register of deprecated items that `DEPRECATION.md` ("Quarterly Audit") names. Each quarter, the BDFL reviews every row and records a decision: remove, extend or reinstate.

### Q4 2026

| Item                        | Type     | Deprecated In | Target Removal | replacedBy                     | Decision                                                                                   |
| --------------------------- | -------- | ------------- | -------------- | ------------------------------ | ------------------------------------------------------------------------------------------ |
| `identity.privacy.backLink` | copy key | copy 4.1.0    | copy 5.0.0     | `identity.navigation.backLink` | extend: the website reads the old key until its follow-up PR adopts the replacement (0158) |
