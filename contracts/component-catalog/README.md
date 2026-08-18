# Component-Contract Catalog

A machine-readable, machine-checkable record of what each design-system widget presents: its props,
its states, its accessibility surface, and whether a consumer render test holds it to that.

The data and render layers of this estate already have specs. The component layer had none. This
catalog closes that gap for the presentation layer, and it is built to resist AI drift: an agent that
changes a widget cannot leave a stale claim behind, because every claim is generated and every
generation is diffed by a gate.

Atlas decision 0060. Increment 0 pilots three widgets. `CATALOG_SPEC_VERSION` is **2**: `props` is a
recursive tree.

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

| File                                   | Role                                                                                      |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| `schema.mjs`                           | The grammar. Exports `CATALOG_SPEC_VERSION`, `MAX_PROP_DEPTH` and `validateEntry(entry)`. |
| `generate.mjs`                         | The generator. Reads the sources, writes `catalog/*.contract.json`.                       |
| `catalog/*.contract.json`              | The spec. Generated. Prettier-formatted for byte stability.                               |
| `component-catalog-conformance.json`   | Grammar conformance vectors. Hand-authored.                                               |
| `component-catalog-conformance.sha256` | Digest pin on the vectors.                                                                |
| `runner.mjs`                           | Runs the vectors against the grammar.                                                     |
| `check.mjs`                            | The gate. Four checks.                                                                    |
| `schema.test.mjs`                      | Unit tests. Runs under `pnpm test:scripts`.                                               |

## Sources

One source per axis. Nothing is restated.

| Axis                         | Read from                                                                                                                                                                                                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `props`                      | `packages/schemas/generated/widgets/<widget>.schema.json` — the WHOLE nested shape, with `optional` = the prop is absent from its parent object's `required[]`. That schema is itself generated from `packages/web/src/widgets/<group>/<Widget>.types.ts`, with `$ref` already resolved. |
| `states`                     | `Sources/LifegamesWidgets/Resources/widgets/<group>/<widget>.<state>.json` filenames, UNION `apps/storybook/__snapshots__/production-<group>-<widget>--<state>.png`. `<widget>.json` with no infix is `default`.                                                                         |
| `a11y`                       | The first `.accessibilityLabel(` in `Sources/LifegamesWidgets/<Group>/<Widget>View.swift`.                                                                                                                                                                                               |
| `swiftPropsRef`              | `Sources/LifegamesWidgets/<Group>/<Widget>Props.swift`.                                                                                                                                                                                                                                  |
| `conformance.behavioralTest` | The `PILOT` table in `generate.mjs`. Cross-repo, so it cannot be discovered from here. It is a reference STRING; this repo never runs it.                                                                                                                                                |

`group` is discovered, not declared: it is whichever category directory holds the widget's
`.types.ts`. `sources` on each entry records where the generator read each axis.

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

Two axes may be `null`, and `null` means a gap someone should close:

- `a11y.voiceOverLabel` is `true` with a `<file>:<line>` ref, or `null`. `false` is rejected by the
  grammar: an absent label is unknown-until-audited, not a finding. Roughly 26 widgets in this repo
  have no label.
- `conformance.behavioralTest` is a path string or `null`. `null` means no consumer render test
  exists. It is not a pass.

A claimed label must cite where it lives, and a gap must cite nothing. The grammar enforces both
directions.

## The pilot three

Chosen to span the difficulty axis, so the grammar is exercised at both ends rather than on three
easy cases.

| Widget         | Group    | Why it is in the pilot                                                                                                         |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `bio-terminal` | identity | Presentation-only, no consumer render test. Conformance is honestly `null`.                                                    |
| `bookshelf`    | reading  | Has a consumer behavioral render test, so the conformance ref is populated.                                                    |
| `heart-rate`   | health   | Has a VoiceOver label in its Swift view, so the a11y axis is populated. It is the exception that shows the other widgets' gap. |

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
3. **Completeness** — every pilot widget has an entry, and every ref resolves to a file that exists.
   A contract naming a deleted view is worse than a missing contract: it reads as covered.
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

## Adding a widget

1. Add `{widget: '<slug>', behavioralTest: null}` — or the consumer test path — to `PILOT` in
   `generate.mjs`. That table is the ONLY place a widget is declared; every other axis is derived.
2. Run `node contracts/component-catalog/generate.mjs`.
3. Run `pnpm format` (the emitted JSON must pass `format:check`).
4. Run `pnpm check:component-catalog`.

The generator throws rather than emitting a null-filled entry if the slug resolves to no group, no
generated schema, no Swift view, no Swift Props file, or no fixtures.

## Adding a grammar rule

A new rule needs a vector for it, or nothing proves it fires. Add the case to
`component-catalog-conformance.json` with `expectValid: false` and an `expectErrorContains` that pins
which rule fired, regenerate the sidecar, then run the gate. `expectErrorContains` is what stops a
validator that rejects everything from passing every negative vector for the wrong reason.
