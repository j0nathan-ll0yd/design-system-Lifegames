# Component-Contract Catalog

A machine-readable, machine-checkable record of what each design-system widget presents: its props,
its states, its accessibility surface, and whether a consumer render test holds it to that.

The data and render layers of this estate already have specs. The component layer had none. This
catalog closes that gap for the presentation layer, and it is built to resist AI drift: an agent that
changes a widget cannot leave a stale claim behind, because every claim is generated and every
generation is diffed by a gate.

Atlas decision 0060. Increment 0 pilots three widgets.

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

| File                                   | Role                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------- |
| `schema.mjs`                           | The grammar. Exports `CATALOG_SPEC_VERSION` and `validateEntry(entry)`. |
| `generate.mjs`                         | The generator. Reads the sources, writes `catalog/*.contract.json`.     |
| `catalog/*.contract.json`              | The spec. Generated. Prettier-formatted for byte stability.             |
| `component-catalog-conformance.json`   | Grammar conformance vectors. Hand-authored.                             |
| `component-catalog-conformance.sha256` | Digest pin on the vectors.                                              |
| `runner.mjs`                           | Runs the vectors against the grammar.                                   |
| `check.mjs`                            | The gate. Four checks.                                                  |
| `schema.test.mjs`                      | Unit tests. Runs under `pnpm test:scripts`.                             |

## Sources

One source per axis. Nothing is restated.

| Axis                         | Read from                                                                                                                                                                                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `props`                      | `packages/schemas/generated/widgets/<widget>.schema.json` — top-level `properties`, with `optional` = the prop is absent from `required[]`. That schema is itself generated from `packages/web/src/widgets/<group>/<Widget>.types.ts`. |
| `states`                     | `Sources/LifegamesWidgets/Resources/widgets/<group>/<widget>.<state>.json` filenames, UNION `apps/storybook/__snapshots__/production-<group>-<widget>--<state>.png`. `<widget>.json` with no infix is `default`.                       |
| `a11y`                       | The first `.accessibilityLabel(` in `Sources/LifegamesWidgets/<Group>/<Widget>View.swift`.                                                                                                                                             |
| `swiftPropsRef`              | `Sources/LifegamesWidgets/<Group>/<Widget>Props.swift`.                                                                                                                                                                                |
| `conformance.behavioralTest` | The `PILOT` table in `generate.mjs`. Cross-repo, so it cannot be discovered from here. It is a reference STRING; this repo never runs it.                                                                                              |

`group` is discovered, not declared: it is whichever category directory holds the widget's
`.types.ts`. `sources` on each entry records where the generator read each axis.

Props are TOP-LEVEL ONLY in Increment 0. Depth is the obvious next increment. A shallow catalog that
is generated beats a deep one that is typed by hand.

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
