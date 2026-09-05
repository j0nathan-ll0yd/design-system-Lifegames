# @j0nathan-ll0yd/copy

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
