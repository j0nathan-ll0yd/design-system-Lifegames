---
'@j0nathan-ll0yd/copy': major
---

llm slice: remove the four dead `location.json` copy leaves (atlas decision 0142 D1).

Removed: `txt.endpointLocation`, `full.streamLocation`, `mcp.dsLocationName`, `mcp.dsLocationDesc`.
The llm namespace drops from 183 leaves to 179 (txt 32 + full 102 + dashboard 3 + mcp 29 +
agentDiscovery 13).

Why: `location.json` does not exist at origin. `https://d1pfm520aduift.cloudfront.net/location.json`
answers HTTP 403 AccessDenied with 111 bytes, byte-identical to the response for a deliberately
nonexistent key, while `focus.json` answers `{"currentFocus":"None"}` — so no Focus window is
suppressing it. This is dead copy, not a rendered-output bug: the live `llms.txt` already advertises
exactly nine endpoints and never listed `location.json`, and the live `server-card.json` and
`webmcp.js` carry zero occurrences of it. No consumer references any of the four keys.

`full.profileLocation` (`- **Location**: {profileLocation}`) is KEPT. It is the human profile line,
not an endpoint.

**MAJOR, not minor.** The estate's export-surface rule
(`@j0nathan-ll0yd/estate-contracts/export-surface`) compares NAMED EXPORTS per subpath, so it sees no
break here — no export name is removed. That name-set delta is a floor, not a verdict: it
structurally cannot see a type's internal shape. Under semver-ts.org, which that same rule cites as
normative, deleting `Llm['txt']['endpointLocation']`, `Llm['full']['streamLocation']`,
`Llm['mcp']['dsLocationName']`, and `Llm['mcp']['dsLocationDesc']` breaks every consumer of those
keys at compile time and at runtime. The same reasoning classified 2.0.0.

Also adds `packages/copy/tests/llm-artifact-sync.test.ts`, which holds the three families that
describe the same CloudFront artifacts — `txt.endpoint*`, `full.stream*`, and `mcp.ds*Name`/`ds*Desc`
— to one artifact set, so a future endpoint cannot be added to one family and forgotten in the
others. Keyed on the `<name>.json` artifact, never on key spelling: `endpointStarred`,
`streamStarred`, and `dsStarredReposName` all describe `github-starred-repos.json`.

Corrects stale prose in `schema/llm.schema.json` (the namespace has five groups, not two; the
Eta-template value rule covers `txt` and `full` only; the identical-`$defs` list omitted
`errors.schema.json`) and in `schema/permissions.schema.json` (its identical-`$defs` list omitted
`app.schema.json`).
