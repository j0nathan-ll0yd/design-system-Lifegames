# @j0nathan-ll0yd/copy

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
