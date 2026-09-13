# `audits/` — this repo's audit and check code

The estate audit layout (atlas decision `0111`, phase 2c). Every audit runner in this repo lives
under one root, and each runner filename carries the catalog check id that routes it, so the
ID→file mapping is spelled rather than remembered.

```text
audits/
  checks/<id>-<runner>.{mjs,sh}   # one file per check, id-prefixed
  lib/                            # repo-local data and helpers a check reads
  __tests__/<id>-<runner>.test.mjs  # known-answer suites, same id as their runner
```

`audits.yaml` in the atlas hub declares this repo's roots in its `layouts:` block. A19 reads its
lane-recognition roots from there, so a runner outside a declared root is a
`runner-outside-declared-roots` finding rather than a silent drop from the measured population.
Moving a runner without updating that block reds `check-surfaces` in atlas.

## The check ids

**`d1`** — D1, widget completeness matrix. `d1-widget-matrix.mjs`, scheduled in `audit-ds.yml`.

**`d2`** — D2, visual-baseline staleness. `d2-baseline-age.mjs`, scheduled in `audit-ds.yml`.

**`d3`** — D3, the `ci.yml#governance-gates` lane. `d3-token-parity.mjs`, `d3-contrast.mjs`,
`d3-swift-widget-purity.mjs`, `d3-watch-exclusions.mjs`, `d3-promotion.mjs`,
`d3-widget-compliance.mjs`, `d3-widget-inventory.mjs`, `d3-openspec-covers.mjs`,
`d3-validate-dtcg.mjs`, `d3-preview-scheme.sh`. Six of these carry a known-answer suite in
`__tests__/` under the same id (#257 added five; `d3-validate-dtcg` runs its own in `build-tokens`
rather than `governance-gates`, because that is the job its validator lives in).

**`d6`** — D6, fixture personal-data scan. `d6-scan-personal-data.sh`, reading
`lib/scan-allowlist.txt`. Blocking in `audit-ds.yml` and in `.husky/pre-commit`.

**`c147`** — published-package payload drift. `c147-package-drift.mjs`, run by the
`package-version-drift` CI job, `package-drift-post-publish.yml`, `drift-self-test-nightly.yml`
and `.husky/pre-push`.

D3 is ONE catalog row over nine-plus probes, so `d3-` is one-to-many by construction — the catalog
registers the governance-gates JOB as the runner. Each file still names exactly one id, which is the
direction that matters when you are holding a file and asking what registers it.

`c147` is the estate's convention id for the payload-drift defect class, the one this repo's own
workflows and `.husky/pre-push` already spell. It has no atlas `checks:` row of its own; it is
registered through A2's `gates:` manifest by way of the CI job.

## What is NOT here

`scripts/` still holds this repo's build and authoring tooling — token builds, generators,
scaffolds, the worktree provisioner, and two asset-identity suites that no registered lane runs.
A file belongs under `audits/` when a registered audit lane runs it, not because its name starts
with `check-`.

The component-contract catalog (`contracts/component-catalog/`) and the OpenSpec covers tree
(`openspec/`) are contract trees with their own homes and their own READMEs. Only the covers GATE
moved here; the specs and the baseline did not.
