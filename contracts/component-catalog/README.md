# Component-Contract Catalog

A machine-readable, machine-checkable record of what each design-system widget presents: its props,
its states, its accessibility surface, and whether a consumer render test holds it to that.

The data and render layers of this estate already have specs. The component layer had none. This
catalog closes that gap for the presentation layer, and it is built to resist AI drift: an agent that
changes a widget cannot leave a stale claim behind, because every claim is generated and every
generation is diffed by a gate.

Atlas decision 0060. `CATALOG_SPEC_VERSION` is **3**: the catalog covers the whole widget set — the
UNION of the Swift widget tree and the web widget tree — and a widget that exists on only one of them
gets a PARTIAL entry with the absent side written as `null`.

**33 widgets.** 29 on both platforms, 1 web-only (`not-found`), 3 Swift-only (`og-image`,
`sync-status`, `diagnostics-monitor`). 4 have a VoiceOver label. 2 have a consumer behavioral render
test. The other 31 conformance gaps and 29 a11y gaps are written, countable, and not passes.

## Schema versus spec

Two files, two jobs. Keeping them apart is the whole design.

|            | File                             | Hand-written?      | Says                                                        |
| ---------- | -------------------------------- | ------------------ | ----------------------------------------------------------- |
| **Schema** | `schema.mjs`                     | Yes                | What a contract entry MAY look like. The normative grammar. |
| **Spec**   | `catalog/<widget>.contract.json` | **No — generated** | What each widget IS.                                        |

Nothing under `catalog/` is typed by hand. `generate.mjs` reads sources that already exist in this
repo. A hand-authored second copy of a prop shape drifts from the first one silently, and a catalog
that drifts is worse than no catalog, because it reads as verified.

`schema.mjs` has zero dependencies. The gate that consumes it must run before any install step and
must not fail for a reason unrelated to the contract.

## Files

| File                                   | Role                                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `schema.mjs`                           | The grammar. Exports `CATALOG_SPEC_VERSION`, `MAX_PROP_DEPTH`, `KNOWN_PLATFORMS` and `validateEntry(entry)`. |
| `generate.mjs`                         | The generator. Reads the sources, writes `catalog/*.contract.json`.                                          |
| `catalog/*.contract.json`              | The spec. Generated. Prettier-formatted for byte stability.                                                  |
| `component-catalog-conformance.json`   | Grammar conformance vectors. Hand-authored.                                                                  |
| `component-catalog-conformance.sha256` | Digest pin on the vectors.                                                                                   |
| `runner.mjs`                           | Runs the vectors against the grammar.                                                                        |
| `check.mjs`                            | The gate. Four checks.                                                                                       |
| `schema.test.mjs`                      | Unit tests. Runs under `pnpm test:scripts`.                                                                  |

## The union, and how ids are normalized

The covered set is discovered on every run, never hand-listed:

- **Swift** — every `<Widget>View.swift` under the six group directories of
  `Sources/LifegamesWidgets/`, plus the flat watchOS target `Sources/LifegamesWidgetsWatch/`. The
  VIEW file is what makes a widget Swift-present, not the Props file: five widgets share a props type
  (`DevActivityEvent`, `LocationProps`) and keying on `<Widget>Props.swift` would write all five up as
  web-only, which is false.
- **Web** — every `<Widget>.types.ts` under `packages/web/src/widgets/<group>/`.

The two sets are not identical, and the two trees spell the same widget three different ways. The
canonical id is the **generated schema filename**, and the pairing runs through that schema's
`title`, because the schema directory is the one place where the kebab id and the PascalCase props
type sit side by side. Nothing is transformed, so nothing can be mis-transformed:

| Spelling                    | Example                                 | Canonical id                   |
| --------------------------- | --------------------------------------- | ------------------------------ |
| Schema filename (canonical) | `git-hub-heatmap.schema.json`           | `git-hub-heatmap`              |
| Web types file              | `other/GitHubHeatmap.types.ts`          | via title `GitHubHeatmapProps` |
| Swift view                  | `Other/GitHubHeatmapView.swift`         | via title `GitHubHeatmapProps` |
| Fixture basename            | `other/github-heatmap.json`             | via the widget manifest        |
| Storybook baseline          | `production-other-githubheatmap--*.png` | pascal, lowercased             |

Three rules do the work, and there is **no fourth guess** — an unmappable Swift view throws by name
rather than being paired approximately, because a wrong pairing writes one widget's prop tree under
another widget's slug, and that reads as verified when it is not:

1. A schema declares `<Pascal>Props` — an exact pairing.
2. Exactly one schema declares `<Pascal>V<n>Props`. The web type carries a version suffix the Swift
   view never took (`ExplorationOdometerView` against `ExplorationOdometerV3Props`), and the schema
   filename is the props source, so the **versioned id wins**. The Swift file is not lost; it is
   recorded through `swiftPropsRef` and `sources.a11y`.
3. `toKebab` (mirrored from the schema generator) is the FALLBACK, used only for a web types file
   with no generated schema. It is not the primary normalizer because it is not total: `OGImageProps`
   kebabs to `ogimage` while the committed schema is `og-image.schema.json`. `schema.test.mjs` pins
   that as the one exception, so a second one has to be looked at rather than silenced.

## Sources

One source per axis. Nothing is restated.

| Axis                         | Read from                                                                                                                                                                                                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `props`                      | `packages/schemas/generated/widgets/<widget>.schema.json` — the WHOLE nested shape, with `optional` = the prop is absent from its parent object's `required[]`. That schema is itself generated from `packages/web/src/widgets/<group>/<Widget>.types.ts`, with `$ref` already resolved. |
| `states`                     | `Sources/LifegamesWidgets/Resources/widgets/<group>/<fixtureBase>.<state>.json` filenames, UNION `apps/storybook/__snapshots__/production-<group>-<pascal lowercased>--<state>.png`. `<fixtureBase>.json` with no infix is `default`.                                                    |
| `a11y`                       | The first `.accessibilityLabel(` in the widget's Swift view.                                                                                                                                                                                                                             |
| `propsRef`                   | `packages/web/src/widgets/<group>/<Widget>.types.ts`.                                                                                                                                                                                                                                    |
| `swiftPropsRef`              | `<swift dir>/<Widget>Props.swift`.                                                                                                                                                                                                                                                       |
| `conformance.behavioralTest` | The `BEHAVIORAL_TESTS` map in `generate.mjs`. Cross-repo, so it cannot be discovered from here. It is a reference STRING; this repo never runs it.                                                                                                                                       |

`group` is discovered, not declared: it is whichever category directory holds the widget, resolved
from the web tree, the Swift tree and the widget manifest, which must agree. `sources` on each entry
records where the generator read each axis — and its ABSENCE carries information too: an entry with
no `sources.a11y` had no Swift view to read, which is a different fact from a Swift view with no label.

The fixture basename comes from `widget-manifest.json`, not from the id: `GitHubHeatmap`'s fixtures
are `other/github-heatmap.*.json` while its schema is `git-hub-heatmap`, and deriving the base from
the id would silently report that widget as having no states.

The Storybook prefix is the PascalCase name LOWERCASED with no separators, because that is how
Storybook derives a story id from `Production/Health/HeartRate`. v2 built it from the kebab slug, so
`production-health-heart-rate--` matched nothing and every multi-word widget silently reported zero
snapshot states. `schema.test.mjs` asserts that every `production-*` baseline on disk is claimed by
exactly one entry and appears in that entry's `states`, which is what keeps the derivation honest.

## The props tree

`props` is a map of prop name to NODE, and a node may hold further nodes. Every node:

```jsonc
{
  "type": "object", // a JSON-schema type name, or an array of names for a union
  "optional": false, // the prop is absent from its parent object's `required[]`
  "truncated": true, // ONLY when the walk hit MAX_PROP_DEPTH and stopped. Never written as false.
  "properties": {}, // ONLY when the type set contains `object`. A map of nodes.
  "items": {}, // ONLY when the type set contains `array`. One node, the element shape.
}
```

`type` and `optional` are always present. The other three are shape-dependent, and the grammar
rejects a node that carries one it has no business carrying — a `string` node with `properties`
hanging off it is a shape no source schema can produce and a reader would take at face value.

Rules the grammar enforces, each with a conformance vector:

- **A union is an array, not a sentence.** `["string", "null"]`, never `"string | null"`. The array
  holds two or more UNIQUE names; a one-member union collapses to a bare string. Two spellings of one
  type would make `properties`/`items` legality depend on which one a writer picked.
- **A nullable object keeps its shape.** The widget-schema generator rewrites every optional prop to
  `anyOf: [T, null]`, so an optional object arrives as the type set `["object", "null"]`. Children
  are legal because the set CONTAINS `object`. Requiring the bare string would drop the nested shape
  of most optional props in the repo.
- **Order is fixed.** Property keys are sorted at every level, so regeneration is byte-stable.
- **`items.optional` is always `false`.** An array element is not a member of its parent object's
  `required[]`, so the field has no meaning for it and is written rather than left to a coin flip.
- **A union of two object shapes requires a key only where every member that declares it requires
  it.** A key a consumer cannot rely on across both arms is not required.

### MAX_PROP_DEPTH and `truncated`

The walk stops at **8** levels. The cap lives in `schema.mjs`, not in the generator, so the two
cannot disagree: `generate.mjs` imports it, and the grammar rejects a committed tree deeper than it —
such a tree could not have been generated, so it was hand-written.

When the walk stops on a node that really has children, that node gets `truncated: true` and no
`properties`/`items`. The marker is the record of children NOT walked, which is a different fact from
an object that has no static properties, and the two must not read alike. `truncated: false` is
rejected on the same rule as `a11y.voiceOverLabel: false`: absence is the canonical way to say "not
truncated", and a second spelling of one fact is drift waiting to happen.

Without the cap a self-referential prop type would make the gate non-terminating instead of reporting
a gap. 8 is measured against the sources, not guessed: the deepest pilot tree
(`bio-terminal.profile.terminalLines[].text`) is 4 levels.

### What the tree does not capture

A `Record<string, T>` (`bookshelf.books.bookMeta`) reaches the generator as `additionalProperties`
and has no static `properties`, so its node records the `object` type and stops. That is a written
gap in the same spirit as the others: the catalog says what it read, and it read no static keys.

## Gaps are written, never faked

Five fields may be `null`, and `null` always means a gap someone should close — never a pass, and
never a placeholder the generator invented to fill a hole:

- `a11y.voiceOverLabel` is `true` with a `<file>:<line>` ref, or `null`. `false` is rejected by the
  grammar: an absent label is unknown-until-audited, not a finding. 29 of the 33 widgets have none.
- `conformance.behavioralTest` is a path string or `null`. `null` means no consumer render test
  exists. 31 of the 33 are `null`.
- `props` is `null` when no generated widget schema exists to read a tree from. Distinct from `{}`,
  which claims the widget takes no props — four widgets really do.
- `propsRef` is `null` for a widget with no web types file, `swiftPropsRef` for one with no dedicated
  Swift props file. An EMPTY STRING is rejected for both: it reads as populated and resolves nowhere.

A claimed label must cite where it lives, and a gap must cite nothing. The grammar enforces both
directions.

## Partial entries

A widget on one platform is recorded as a widget with a written absence, not left out. Leaving it out
is the failure mode this catalog exists to prevent: an absent widget reads as no gap at all.

`platforms` is the sorted, non-empty subset of `["swift", "web"]` the widget was actually found in.
It is not decoration — the grammar couples it to the refs, so a wrong value contradicts something:

- `propsRef` is non-null **if and only if** `platforms` contains `web`. `propsRef` IS the web types
  file, so the two are one fact written twice and must agree.
- `swiftPropsRef` non-null **implies** `platforms` contains `swift`. One-way on purpose: five widgets
  have a Swift view and no dedicated Props file because they share a props type, and their entries
  are legitimately `["swift", "web"]` with a null `swiftPropsRef`.

And a floor under the whole thing: an entry with **neither** a `props` tree **nor** a
`swiftPropsRef` is rejected. Admitting one-sided entries is what makes the catalog cover the whole
set; it is also the shape a broken source read produces, and such an entry holds nothing anyone could
be held to while sitting in the catalog reading as covered.

| Widget                 | Platforms          | What is null                          |
| ---------------------- | ------------------ | ------------------------------------- |
| `not-found`            | `["web"]`          | `swiftPropsRef`, a11y (no Swift view) |
| `og-image`             | `["swift"]`        | `propsRef` (no `.types.ts`)           |
| `sync-status`          | `["swift"]`        | `propsRef` (watchOS target)           |
| `diagnostics-monitor`  | `["swift"]`        | `propsRef` (watchOS target)           |
| `place-leaderboard-v3` | `["swift", "web"]` | `swiftPropsRef` (shared props type)   |

`og-image`, `sync-status` and `diagnostics-monitor` keep a populated `props` tree despite the null
`propsRef`: their schemas are hand-written in the schema generator's `MANUAL_SCHEMAS` table rather
than derived from a `.types.ts`. The two axes are separate on purpose — collapsing them would lose a
prop tree that really was read. `place-leaderboard-v3` is on both platforms and still partial, which
is why partialness is per-FIELD rather than per-platform.

## The gate

```sh
pnpm check:component-catalog
```

Four checks, in cost order:

1. **Grammar conformance** — `runner.mjs`. The sidecar matches the vectors, `CATALOG_SPEC_VERSION`
   matches the vectors' `specVersion`, every vector holds. Without this the next three checks run an
   unverified validator.
2. **Validity** — every `catalog/*.contract.json` satisfies the grammar, and its filename matches the
   widget it declares.
3. **Completeness** — the UNION is covered exactly. Every widget in the Swift/web union has an entry,
   no entry exists outside that union, every non-null ref resolves to a file that exists, and no entry
   has both refs null. Both directions matter: an uncovered widget is a hole, and a PHANTOM contract
   for a deleted view is worse than a missing one, because it reads as covered.
4. **Idempotence** — regenerate into a temp directory and compare bytes. A hand-edit to a committed
   contract, or a source change nobody regenerated for, reds here. This is the check that makes the
   catalog a spec rather than a document.

The gate runs in `.husky/pre-push`. `pnpm test:scripts` runs `schema.test.mjs`.

## CATALOG_SPEC_VERSION discipline

`CATALOG_SPEC_VERSION` in `schema.mjs`, `specVersion` in every catalog entry, and `specVersion` in
`component-catalog-conformance.json` are ONE number. Case zero of `runner.mjs` asserts the grammar
and the vectors agree on it, so a half-done bump reds immediately.

Bumping the version is one change, not three:

1. Change `CATALOG_SPEC_VERSION` in `schema.mjs` and the grammar itself.
2. Update `specVersion` and the affected cases in `component-catalog-conformance.json`.
3. Regenerate the sidecar:
   ```sh
   cd contracts/component-catalog && shasum -a 256 component-catalog-conformance.json > component-catalog-conformance.sha256
   ```
4. Regenerate the catalog: `node contracts/component-catalog/generate.mjs`
5. `pnpm format && pnpm check:component-catalog`

Any subset of those leaves the gate red.

### v1 → v2: prop depth

**What changed.** `props` went from a flat map of top-level props to a recursive tree. `type` on a
union went from a `" | "`-joined string to an array of names.

**Why.** Every pilot widget takes exactly ONE top-level prop — `bio-terminal` was
`{profile: {type: "object", optional: false}}` and that was the entire props axis. It recorded that a
widget takes an object, which no consumer can be held to. The nested shape is where the checkable
content is: `books[].title`, `quantities.restingHeartRate.value`. The source schema already carried
all of it; v1 simply stopped at the first level. Depth was deferred in Increment 0 on the reasoning
that a shallow generated catalog beats a deep hand-typed one — true, and it stopped being the choice
on offer once the walk was written.

**Compatibility.** A v1 entry is not a v2 entry: `specVersion` alone rejects it, before any shape
rule runs. There is no migration path and none is needed — every entry under `catalog/` is generated,
so the upgrade is a regeneration. The Atlas portal reads these files as JSON and does not validate
the grammar, so it is unaffected by the bump.

**Landed as one change**, per the discipline above: `CATALOG_SPEC_VERSION`, the grammar, the vectors,
the sha256 sidecar, the regenerated catalog and the tests.

### v2 → v3: the full widget set, and partial entries

**What changed.**

- The covered set went from a hand-listed `PILOT` of three widgets to the DISCOVERED union of the
  Swift and web widget trees — 33 widgets.
- New required field `platforms`: the sorted, non-empty subset of `["swift", "web"]` the widget was
  found in, coupled by the grammar to `propsRef` and `swiftPropsRef`.
- `props`, `propsRef` and `swiftPropsRef` may now be `null`, and `states` may be empty. A new
  invariant puts a floor under that: `props` and `swiftPropsRef` may not BOTH be null.
- `conformance.behavioralTest` moved from the `PILOT` table to a documented `BEHAVIORAL_TESTS` map,
  which throws if it names a widget outside the union.

**Why.** A three-widget catalog reports on three widgets. The other 30 were not recorded as gaps —
they were simply absent, and an absent widget reads as no gap at all, which is the exact failure this
catalog exists to prevent. Covering the union required admitting partial entries, because the two
trees are not the same set: one widget ships only on the web, three only on Swift, and five have a
Swift view with no dedicated Props file. v2's grammar demanded both refs on every entry, so each of
those would have had to be faked or dropped. Neither is acceptable, so the grammar changed.

**Two source-reading bugs fixed in the same change**, both found by extending the coverage:

- The Storybook snapshot prefix was built from the kebab slug, so `production-health-heart-rate--`
  matched nothing and every MULTI-WORD widget silently reported zero snapshot states. It is the
  PascalCase name lowercased. A test now asserts every baseline on disk is claimed by exactly one
  entry and appears in that entry's states, so the derivation is falsifiable rather than asserted.
- `formatJson` resolved Prettier's config from the OUTPUT path. `check.mjs` regenerates into a temp
  directory, where no `.prettierrc.mjs` is found, so the check compared bytes written at Prettier's
  default printWidth of 80 against committed bytes written at the repo's 100. It reported drift that
  was an artifact of where the check happened to write — and would equally have MISSED real drift on
  any line outside that window. The config is now resolved from the file's place in the real catalog
  directory, which is the only path that means anything.

**Compatibility.** A v2 entry is not a v3 entry: `specVersion` alone rejects it, before any shape rule
runs, and a v2 entry has no `platforms` field. There is no migration path and none is needed — every
entry under `catalog/` is generated, so the upgrade is a regeneration. The Atlas portal reads these
files as JSON and does not validate the grammar, so it is unaffected by the bump; it will see 33
files where it saw 3.

**Landed as one change**: `CATALOG_SPEC_VERSION`, the grammar, the vectors, the sha256 sidecar, the
regenerated catalog, the gate and the tests.

## Adding a widget

Nothing. A widget added to `packages/web/src/widgets/` or to a Swift widget target appears in the
catalog on the next `node contracts/component-catalog/generate.mjs`, because the union is discovered
rather than declared. The gate reds until you regenerate, which is the point.

Two things still need a human:

1. A CONSUMER behavioral render test cannot be discovered from this repo. Land the test, then add its
   path to `BEHAVIORAL_TESTS` in `generate.mjs`.
2. A Swift view whose name pairs with no generated schema throws by name rather than being paired
   approximately. Give the widget a web types file (which generates its schema) or an entry in
   `MANUAL_SCHEMAS` in `packages/schemas/scripts/generate-widget-schemas.mjs`.

After either:

1. Run `node contracts/component-catalog/generate.mjs`.
2. Run `pnpm format` (the emitted JSON must pass `format:check`).
3. Run `pnpm check:component-catalog`.

The generator THROWS rather than emitting a guess when a Swift view pairs with no schema, when two
schemas or two Swift views collide on one id, when a schema carries no `Props`-suffixed `title`, when
the web tree, the Swift tree and the manifest disagree on a widget's group, or when
`BEHAVIORAL_TESTS` names a widget outside the union. It writes `null` — never throws — for a source
that legitimately does not exist, because that is a gap, not an error.

## Adding a grammar rule

A new rule needs a vector for it, or nothing proves it fires. Add the case to
`component-catalog-conformance.json` with `expectValid: false` and an `expectErrorContains` that pins
which rule fired, regenerate the sidecar, then run the gate. `expectErrorContains` is what stops a
validator that rejects everything from passing every negative vector for the wrong reason.
