# OpenSpec — behavioral capabilities

What this repo promises, in a grammar a machine can reconcile against the tests that hold it.

Atlas decision 0102, ranked move 5. Before this tree existed, design-system was the only repo in the
estate carrying a live product surface and **zero** capabilities — 0 requirements, 0 scenarios, no
`openspec/` directory at all, while five sibling repos carried 28 capabilities between them.

## Layout

| Path                                              | Role                                                                       |
| ------------------------------------------------- | -------------------------------------------------------------------------- |
| `specs/<capability>/spec.md`                      | The capability. `### Requirement:` blocks, each with `#### Scenario:` GWT. |
| `covers-baseline.json`                            | Grandfathered untethered requirements, keyed by identity. Generated.       |
| `../audits/checks/d3-openspec-covers.mjs`         | The gate. Blocking in CI `governance-gates` and in `.husky/pre-push`.      |
| `../audits/__tests__/d3-openspec-covers.test.mjs` | The gate's known-answer suite, including its can-fail proof.               |

## Capabilities

| Capability        | Requirements | Scenarios | Tethered | Grandfathered | Tether sites |
| ----------------- | -----------: | --------: | -------: | ------------: | -----------: |
| `widget-contract` |           13 |        32 |       10 |             3 |           12 |

## The rule is not in this repo

`audits/checks/d3-openspec-covers.mjs` is a ~300-line wrapper. The rule it runs ships as
`@j0nathan-ll0yd/estate-contracts/openspec-covers`, exact-pinned at `0.6.0` in `package.json` and
resolved from the lockfile, so this repo cannot hold a divergent local copy of a cross-repo rule. The
wrapper verifies the shipped bytes against the `.sha256` sidecar shipped beside them, asserts the
format of that sidecar, and pins `EXPECTED_COVERS_SPEC_VERSION` — a rule release that moves under this
repo fails loudly here instead of silently enforcing something else.

## Writing a requirement

1. Add a `### Requirement:` block to the capability's `spec.md`. Every requirement needs at least one
   `#### Scenario:` with GIVEN, WHEN and THEN lines — that is a rule of the shipped grammar at spec
   version 4, not a house style.
2. Add a line-leading `// covers:` comment to the test that holds it, naming the capability, then `#`,
   then the requirement name **verbatim**. It may be indented; it must be its own comment line. A
   trailing comment reads as a tether to a human and is invisible to the parser, and the rule reports
   that as a near-miss rather than letting it pass.
3. Run `pnpm check:covers`.

Describe what the repo **already enforces**. A requirement is a claim about behavior that something
holds you to; a requirement with no gate behind it is a wish with a heading.

There are deliberately no `Verified by` file-and-line citations in this tree. The estate measured that
class: a hand-typed line number drifts from the tether it cites, and mantle-LP carries 19 live
citation findings for exactly that reason. The tether already holds the file and the line, machine-read.

## Which files the gate scans for tethers

The contract's default table speaks `**/*.test.ts`, `**/*.tftest.hcl` and `**/*Tests.swift`. This
repo's gate suites are also `node --test` files ending `.test.mjs` and ESLint `RuleTester` suites
ending `.test.js`, so the wrapper passes a wider `languages` table — the contract's documented consumer
knob. That is a scan-surface choice, not a rule change: `COVERS_SPEC_VERSION` does not move, and the
table's disjointness invariant is asserted at startup rather than assumed.

## The baseline

`covers-baseline.json` names requirements that describe an **enforced** rule with no known-answer test
to tether. **None today** — the file is empty. It held three (Swift widget purity, watch exclusions,
the promotion gate); `audits/__tests__/d3-swift-widget-purity.test.mjs` closed the first, and #257's
`d3-watch-exclusions.test.mjs` and `d3-promotion.test.mjs` closed the other two. An empty baseline
grandfathers nothing, which is the strictest state the gate has.

Each entry is a recorded **gap**, not a pass:

- Only `uncovered-requirement` is baseline-eligible. Every other finding type blocks unconditionally,
  however the baseline reads.
- A baseline id naming no live requirement **fails** — a stale grandfathering reads as covered.
- A graduated requirement's stale id is reported **prunable** and must be pruned in the same change.
- An absent baseline grandfathers nothing, which is stricter than the committed file. Deleting it can
  only cost a pass, never buy one. A baseline that exists but cannot be parsed is a hard red.

Re-record with `pnpm covers:update-baseline`. Never hand-edit an id.

The way to shrink this file is to write the missing known-answer suite, not to widen the list.
