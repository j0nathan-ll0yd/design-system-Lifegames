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

---

llm slice: stop claiming a seven-day window and a workout habit (atlas decision 0142 D2).

Ten leaves carried claims the source data cannot support. The health export stores ONE dated value
per metric — `mantle-LifegamesPortal/src/schemas/health.ts:78` is
`healthQuantitySchema = z.object({type, date, value, unit})`, and `src/lib/llm-content/aggregate.ts:81`
reads exactly one entry (`health.quantities['restingHeartRate']`) and rounds `entry.value`. There is
no series and nothing to average across days, so "7-day aggregate" was false everywhere it appeared.
`aggregate.ts:259` derives workout activity types from the distinct types in the latest export capped
at three, so "Typical activity types" asserted a habit from one export.

Reworded:

- `full.intro`, `txt.liveBody` — body metrics are single-day values, summarised and never averaged
  over a window.
- `full.bodyAggregateNote` — each body metric is a single value from the latest export; values are
  summarised as ranges, shares, or goal status rather than published raw.
- `full.cardioHeading`, `full.sleepHeading`, `full.activityHeading`, `full.workoutsHeading`,
  `full.hydrationHeading` — `(7-day aggregate)` becomes `(latest export)`. The `###` affix is
  retained: the `full` group ships rendered markdown on purpose, unlike the `txt` group.
- `full.workoutsActivityTypes` — `Typical activity types` becomes `Activity types in this export`.
- `mcp.dsHealthDesc` — `(7-day aggregates)` becomes `(latest export, summarised)`. This leaf was not
  on the original work list; it carried the same false claim and is published to
  `.well-known/mcp/server-card.json`.

`full.bodyAggregateNote` loses its `{bodyEndingDate}` placeholder. That binding resolved to the
COMPOSE timestamp, not a data date — `view.ts:394` is `endingDate: formatDate(inputs.composedAt)` and
`types.ts:31` states "`composedAt` is a fact about the composition run itself, not about any source".
It could not honestly date the values under any wording. LP's binding at `render.ts:231` is now
unreferenced by copy; removing it is LP's cleanup, not this package's.

The leaf count is unchanged at 179 — these are value edits, not removals. `_meta.lastReviewed` is
bumped to 2026-09-22 on exactly the ten edited leaves, per VOICE.md.

Also adds `packages/copy/tests/llm-claim-honesty.test.ts`, which asserts the PROPERTY rather than the
replacement sentence: no llm leaf may name a multi-day span (`N-day`, `weekly`, `per week`,
`multi-day`) or assert a habit (`typical`, `usually`, `habitual`, `on most days`). The nouns "window",
"average", and "aggregate" stay legal on their own, because honest copy has to be able to DENY a
window and a denial contains the noun it denies.

---

identity: add `person.rolePhrase`; llm: bind it from `full.systemFraming`.

`full.systemFraming` hardcoded "an engineering director and backend engineer" — identity facts
restated inside llm copy, which drifts the moment identity changes.

New leaf `identity.person.rolePhrase` = `engineering director and backend engineer`. Lowercase on
purpose: its only consumer drops it mid-sentence, where title case reads "an Engineering Director".
`full.systemFraming` now binds `{profileRolePhrase}`; nothing else in that sentence changed.

`identity.person.jobTitle` is unchanged and remains the canonical short title for the Person JSON-LD
and the profile line. `{profileTitle}` was rejected as the binding on two counts: it is title case,
and it names only one of the two roles, so binding it would silently drop "and backend engineer" from
the published framing. `person.longBio` opens with the same two roles but as a capitalised full
sentence, so it cannot be spliced mid-sentence either — hence a dedicated field.

**Consumer action required before adopting this version.** `mantle-LifegamesPortal` must bind
`profileRolePhrase` from `identity.person.rolePhrase` in `src/lib/llm-content/profile.ts`, `view.ts`,
and `render.ts`. Until it does, MF1 renders the literal `{profileRolePhrase}` into the published
`llms-full.txt` and `/index.md`.

`identity` goes from 60 leaves to 61 (person 20 → 21). `llm` stays at 179 — `systemFraming` is a value
edit, not a leaf addition.

Adds `packages/copy/tests/llm-identity-binding.test.ts`: the role phrase must be lowercase, every
`full.systemFraming` placeholder must resolve to an `identity.person` leaf under the `profile<Field>`
convention, substituting the value must render `— an <phrase>.`, and no llm leaf may restate any
substantial `identity.person` value verbatim.
