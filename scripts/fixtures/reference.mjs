/**
 * THE PER-REPO ADAPTER FOR THE VENDORED `extract.mjs`. Three re-exports and nothing else.
 *
 * `extract.mjs` is vendored BYTE-VERBATIM from atlas/contracts/export-surface/, and there it sits
 * beside the normative `reference.mjs`, which it imports three symbols from
 * (`CLASSIFICATIONS`, `readExportTargets`, `SURFACE_SPEC_VERSION`). This repo does not vendor
 * `reference.mjs`: it is one of the three ENGINES that must reproduce the contract's vectors with
 * its own implementation of the rule (atlas decision 0027 §0 — atlas imports the contract, mantle
 * and design-system are held to the generated vectors instead), and that implementation lives in
 * `../check-package-drift.mjs`.
 *
 * So this file points `extract.mjs`'s import at the engine. It is the "small adapter [that] differs
 * per repo" the vendored runner's own header allows for, and it exists for exactly one reason: so
 * the vendored extractor stays byte-identical to atlas's rather than being edited on the way in. An
 * edited vendored copy is the divergence findings X3/X7 already cost this estate once.
 *
 * DO NOT ADD AN IMPLEMENTATION HERE. A second copy of `readExportTargets` in this repo would be
 * exactly the divergence the re-export prevents: the engine's copy is the one the `tgt-*`
 * conformance vectors assert, and the extractor must resolve targets through that same copy or the
 * two can disagree about what a subpath is.
 *
 * ── THE IMPORT CYCLE IS DELIBERATE AND SAFE ─────────────────────────────────────────────────────
 *
 * `check-package-drift.mjs` -> `extract.mjs` -> this file -> `check-package-drift.mjs`. ESM
 * resolves it: `extract.mjs` reads none of these three bindings at module-evaluation time — every
 * use is inside a function body, called long after the engine has finished evaluating — so no
 * binding is ever touched in its temporal dead zone. The engine's own `--self-test` covers the
 * cycle end to end, because a mutant copy is imported the same way.
 */

export { CLASSIFICATIONS, readExportTargets, SURFACE_SPEC_VERSION } from '../check-package-drift.mjs'
