# @j0nathan-ll0yd/copy

## 3.0.0

### Major Changes

- 73e6eb1: llm slice: remove the four dead `location.json` copy leaves (atlas decision 0142 D1).

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

  ***

  llm slice: stop claiming a seven-day window and a workout habit (atlas decision 0142 D2).

  Ten leaves carried claims the source data cannot support. The health export stores ONE dated value
  per metric — `mantle-LifegamesPortal/src/schemas/health.ts:78` is
  `healthQuantitySchema = z.object({type, date, value, unit})`, and `src/lib/llm-content/aggregate.ts:81`
  reads exactly one entry (`health.quantities['restingHeartRate']`) and rounds `entry.value`. There is
  no series and nothing to average across days, so "7-day aggregate" was false everywhere it appeared.
  `aggregate.ts:259` derives workout activity types from the distinct types in the latest export capped
  at three, so "Typical activity types" asserted a habit from one export.

  Reworded:
  - `full.intro`, `txt.liveBody` — body metrics come from the latest export, summarised and never
    averaged over a window.
  - `full.bodyAggregateNote` — each body metric is a single value from the latest export; values are
    summarised as ranges, shares, or goal status rather than published raw.
  - `full.cardioHeading`, `full.sleepHeading`, `full.activityHeading`, `full.workoutsHeading`,
    `full.hydrationHeading` — `(7-day aggregate)` becomes `(latest export)`. The `###` affix is
    retained: the `full` group ships rendered markdown on purpose, unlike the `txt` group.
  - `full.workoutsActivityTypes` — `Typical activity types` becomes `Activity types in this export`.
  - `mcp.dsHealthDesc` — `(7-day aggregates)` becomes `(latest export, summarised)`. This leaf was not
    on the original work list; it carried the same false claim and is published to
    `.well-known/mcp/server-card.json`.

  `(latest export)` is the canonical spelling estate-wide, set by LP PR #356 (`aggregate.ts:272` emits
  `${n} workouts (latest export)`, its docblock recording `(recent)` as the former form). Every leaf
  above uses it for this idea.

  `full.bodyAggregateNote` loses its `{bodyEndingDate}` placeholder. The reason is REDUNDANCY, not a
  false value: LP binds the same `view.body.dataAsOf` to `bodyDataAsOf`, and `full.bodyDataAsOf` already
  publishes it one line earlier as `**Data as of:** {bodyDataAsOf}`. The note was restating a date the
  document states directly above it. LP's `bodyEndingDate` binding is now unreferenced by copy;
  retiring it is LP's cleanup, not this package's, and it rides the copy-bump PR rather than this one.

  The leaf count is unchanged at 179 — these are value edits, not removals. `_meta.lastReviewed` is
  bumped to 2026-09-22 on exactly the ten edited leaves, per VOICE.md.

  Also adds `packages/copy/tests/llm-claim-honesty.test.ts`, which asserts the PROPERTY rather than the
  replacement sentence: no llm leaf may name a multi-day span (`N-day`, `weekly`, `per week`,
  `multi-day`) or assert a habit (`typical`, `usually`, `habitual`, `on most days`). The nouns "window",
  "average", and "aggregate" stay legal on their own, because honest copy has to be able to DENY a
  window and a denial contains the noun it denies.

  ***

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

## 2.0.0

### Major Changes

- eb951fb: llm slice: ship link and heading fields, not rendered markdown (atlas decision 0128 P3a).

  The `txt` group's 18 link leaves change shape from a rendered markdown bullet
  (`"- [Site]({siteUrl})"`) to `{label, url, notes?}`, and its 7 heading leaves drop the `#` / `##`
  affix and ship the bare section name. The words are byte-identical: every migrated leaf re-renders
  to its previous string exactly. Only the container moved.

  Why the round trip existed: `mantle-LifegamesPortal`'s llms.txt codec models the document
  structurally and re-adds every affix, so `render.ts` regex-parsed each rendered leaf back into
  `{label, url, notes}` and stripped each heading affix before use. The fields were always the
  information and the markdown always a projection. Copy now ships the fields.

  Scope: the `full` group is deliberately untouched. Its consumer renders it through Eta verbatim and
  never re-parses it, so its markdown affixes are the copy, not a projection of it.

  Also adds the `./package.json` export subpath, letting a consumer resolve the package manifest
  directly instead of anchoring on a data file.

  **MAJOR, not minor.** The estate's export-surface rule
  (`@j0nathan-ll0yd/estate-contracts/export-surface`) compares NAMED EXPORTS per subpath. It measures
  this change as `minor` — `pnpm check:package-drift` reports `export added: ./package.json` and
  `surface bump: requires minor` — because no export name is removed and no `value` degrades to a
  `type`. That name-set delta is a floor, not a verdict: it structurally cannot see a type's internal
  shape. Under semver-ts.org, which that same rule cites as normative, retyping
  `Llm['txt']['linkSite']` from `string` to an object is a breaking change to every consumer of those
  25 keys, at compile time and at runtime. The sole
  llm-slice consumer is `mantle-LifegamesPortal`, which adopts in lockstep once this publishes. The
  `full`, `dashboard`, `mcp`, and `agentDiscovery` groups and every other namespace are unchanged.

## 1.1.0

### Minor Changes

- 021d1dc: Add `app.bookshelf.alerts.kindleEditionRejected` — the message the Life Portal bookshelf shows when the ASIN detected in the Amazon browser is a Kindle edition.

  A Kindle ASIN has no ISBN and no Open Library record, so metadata enrichment can never succeed for it: the book lands in the catalog with its ASIN as the title, `Unknown` as the author, and no cover. The string names the recovery step (switch the format to a print edition) rather than the failure.

## 1.0.2

### Patch Changes

- 27dfe68: Author the llms.txt About-section links as markdown links, not bare URLs.

  `llm.txt.linkSite`, `llm.txt.linkGithub`, and `llm.txt.linkLinkedin` emitted
  `- Site: {siteUrl}` style list items. llms.txt requires link list items, so the
  served artifact failed its own structural rule — a producer contract test in
  mantle-LifegamesPortal caught it. The new form matches the conforming siblings
  in the same namespace (`liveFullDump`, `endpointHealth`, and the rest):
  - `- Site: {siteUrl}` -> `- [Site]({siteUrl})`
  - `- GitHub: {profileGithub}` -> `- [GitHub]({profileGithub})`
  - `- LinkedIn: {profileLinkedin}` -> `- [LinkedIn]({profileLinkedin})`

  Blast radius: the only consumer of these three `txt`-namespace keys is
  `src/lib/llm-content/templates/llms-txt.eta:9-11` in mantle-LifegamesPortal. A
  sweep of design-system-Lifegames, j0nathan-ll0yd.github.io, ios-LifegamesPortal
  and mantle found no other reader. The identically-named keys in the `full`
  namespace feed `llms-full.eta` under a different heading and a different
  structural rule set; they are unchanged.

  Values only — no key, type, or export-surface change, so patch.

## 1.0.1

### Patch Changes

- 514314a: Adopt repo-wide Prettier formatting with a blocking CI `format:check` gate (issue #54). Generated artifacts (`packages/copy/dist/*.zod.ts`, schemas `dist` types, `fixture-map.json`, widget schemas, DTCG audit) are now formatted in-generator so they are readable and diff-friendly. This is a formatting-only change — no token values, schema shapes, copy strings, or public APIs change.
