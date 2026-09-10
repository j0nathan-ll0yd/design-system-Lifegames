---
'@j0nathan-ll0yd/copy': major
---

llm slice: ship link and heading fields, not rendered markdown (atlas decision 0128 P3a).

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
