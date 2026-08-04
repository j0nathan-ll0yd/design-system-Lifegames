# Design System Governance — Constitution

**Repo:** `design-system-Lifegames` | **Model:** Solo BDFL | **Status:** Authoritative

---

## 1. Purpose & Scope

Constitution for `design-system-Lifegames`. Defines what belongs in the DS versus consuming applications across both platforms (read-only Astro web dashboard; interactive iOS/watchOS app). Establishes eight numbered principles (P1–P8), a 3-question intake triage, an enforcement map, versioning policy, and an ADR convention. Governance model: **BDFL** — maintainer is sole decision-maker, process is minimum viable overhead consistent with correctness. _(EightShapes "Solitary"; Open Source Guides BDFL.)_

---

## 2. The Core Reconciliation

**Apparent inconsistency:** iOS operated on a "primitives only" rule, yet the DS ships ~55 pre-composed Astro widgets for web — a seeming double standard.

**Resolution:** Every major cross-platform DS (Polaris, Material 3, Spotify Encore, Airbnb DLS, Fluent 2) shares _design tokens_ as the single source of truth and _reimplements component code natively per platform_. Shared code is never the contract; spec/token parity is. Astro + SwiftUI widgets coexisting is correct, not duplication.

**The two genuine inconsistencies to remediate:**

1. **iOS consumption is non-uniform.** The iOS app _consumes_ DS Health widgets in a real product surface (`HealthFeatureView.swift` imports `LifegamesWidgets`, renders `HeartRateView`, `MovementRingsView`, `NightSummaryView`) but _duplicates_ DS Location widgets locally (`TopPlacesCard.swift`, `HeatMapCard.swift`). Needs resolution per-widget.

2. **Speculative promotion confirmed by census.** An empirical census (2026-05-29) found 0 of ~110 widgets meet a strict "≥2 shipping product surfaces" bar: the web dashboard is single-page (every web widget has exactly 1 consumer route); on iOS only the 3 Health widgets have even 1 product-surface consumer. Only ~16 web + 3 Swift widgets have any product-surface consumer at all. The remaining bulk is in **demote-or-justify** status. The maintainer's response is the **relaxed P4 rule** (≥1 surface now + credible 2nd surface planned), detailed below.

---

## 3. Principles

### P1 — Tokens are the only cross-platform contract, and they are tiered

Source of truth: `tokens/*.tokens.json` (W3C DTCG) → Style Dictionary → `packages/tokens/dist/` (web) and `Sources/LifegamesTokens/` (Swift). Components are not shared as code; they are reimplemented natively per platform.

**Three-tier token model:**

| Tier | Name          | Example                                      | Rule                                                                             |
| ---- | ------------- | -------------------------------------------- | -------------------------------------------------------------------------------- |
| 1    | **Primitive** | `color.neon.pink = #ff006e`                  | Raw values. Not consumed directly by components.                                 |
| 2    | **Semantic**  | `color.accent.primary`, `color.surface.card` | Role-named; references primitives. **This tier is the cross-platform contract.** |
| 3    | **Component** | `tri-card.border.color`                      | Component-scoped; references semantic tokens.                                    |

Semantic token names and roles must be identical across web and iOS. Values may differ intentionally per platform, but any divergence requires a divergence ADR (§7, P2). Component code references semantic or component tokens only — never Tier-1 primitives or raw hex. Neon colors must resolve to identical hex values on both platforms.

**Enforcement:** `eslint-local-rules/no-deprecated-tokens.js` (existing); W2 token-only CSS; Swift `LifegamesTokens` constants rule; extend `scripts/validate-dtcg.mjs` to flag Tier-1 direct references in component code; `scripts/check-token-parity.mjs` (diffs web dist vs Swift values at the semantic tier) → `governance-gates` CI job. text-primary parity is reconciled (no exceptions); see `docs/adr/0006-text-primary-token-parity.md`.

_(Cite: Polaris / Material 3 / Spotify Encore / Airbnb DLS / Fluent 2 universal token model; W3C DTCG primitive → semantic → component tiering.)_

---

### P2 — Native reimplementation per platform is correct, not duplication

An Astro widget and its SwiftUI counterpart must share functional/spec parity (same name, states, anatomy, token consumption); they do not share code or guarantee pixel-identical visuals. **Intentional divergence is allowed but must be traced:** record a one-paragraph divergence ADR in `docs/adr/` (§7 format) whenever one platform ships a widget variant the other does not. The ADR is what distinguishes a deliberate decision from silent drift.

Now **CI-enforced** by `scripts/widget-compliance.mjs` in the `governance-gates` job: `production-widgets.json` is complete (43 entries) and the compliance script validates each registry entry against its Astro/fixture/manifest artifacts, so it no longer produces the false greens an incomplete registry once risked. R7 (complete the registry) is **done**.

**Enforcement:** `scripts/widget-compliance.mjs` in the `governance-gates` CI job (registry ↔ Astro/fixture/manifest); agent-review checklist for spec-parity judgment; mandatory divergence ADR in `docs/adr/`.

_(Cite: dbanks.design — divergence must be intentional, not drift; Spotify Encore cross-platform spec parity; Airbnb DLS native reimplementation.)_

---

### P3 — Presentational-purity boundary

A DS component must satisfy all of the following: no data fetching; no app/domain state (local UI state — hover, animation, toggle — is fine); no navigation; no imports of app-only modules (`SharedModels`, `ComposableArchitecture`, `HealthKit`, `APIClient`, `CoreLocation`, or any module not living in the DS itself). Whole composed widgets are allowed if they surface interactions via callbacks/actions only — data in, events out.

This boundary extends to the web runtime: the data/transport/orchestration layer (fetch, polling, WebSocket, service-worker update nudges) and the runtime connection-status updater are **consumer-owned**, not part of the DS. The DS ships only the presentational domain hydration that consumes it (the `updaters*` DOM patchers, `adapters` transforms, `*-init` island entrypoints). Shared contract types are owned upstream — `ResourceKey` in `@j0nathan-ll0yd/portal-contract`, `PollStatus` with the web app's poll engine. See ADR `0005`.

**Enforcement:** `eslint-local-rules/no-app-module-imports.js` (web — bans data-fetch and app module imports; currently `warn`); `scripts/check-swift-widget-purity.mjs` (greps `Sources/LifegamesWidgets/**` for forbidden imports: `TCA`, `HealthKit`, `APIClient`, `SharedModels`, `CoreLocation`, plus F-015 raw-color/UIKit detection over `Sources/LifegamesComponents{,Core}/**`) in the `governance-gates` CI job. Judgment residue (local vs domain state) → agent-review checklist.

_(Cite: Abramov/Taivara presentational/container pattern; Martin Fowler headless component; TCA View/Reducer split; Ousterhout deep modules.)_

---

### P3.1 — Copy is a single-source-of-truth content leaf

`@j0nathan-ll0yd/copy` (`packages/copy/`) is the single source of truth for every
customer-facing string across web, iOS, the design system, and the backend. It is a
**zero-runtime-dependency content leaf** — data in, strings out — the copy analogue of
the P3 presentational-purity boundary. Rules:

- **One home per string.** Every customer-facing string lives in exactly one copy field —
  zero duplication across the four repos. (V1 covers the identity slice; V2 mass-migrates
  widget labels, error messages, a11y breadth, email, etc.)
- **Rich authoring context.** Each string is authored as `{ value, _meta }`, where `_meta`
  carries `description`, `usage` (render sites), `register`, `audience`, `owner`,
  `lastReviewed`, and optional `constraints` (e.g. `maxChars`) + `rationale`. The build
  derives a flattened view so consumers read plain values.
- **Governed voice (register + audience).** `_meta.register` is a closed enum
  (`atom | label | factual | expressive | machine | brand | consent`) and `_meta.audience`
  is `human | machine | dual` — together they encode "one voice, flexed by register" plus the
  human↔AI arbitration rule (machine/dual surfaces stay literal/parseable). The voice
  constitution is **`packages/copy/VOICE.md`** (source of truth), surfaced into the generated
  `DESIGN.md` (`## Brand & Voice`, from `voice.summary.json`) and the docs-site Voice & Tone
  page. Enforced by Ajv (enum) at build + `packages/copy/scripts/check-copy-voice.mjs`
  (mechanics + arbitration) + `packages/copy/VOICE-REVIEW-CHECKLIST.md` (review judgment).
- **ICU MessageFormat 1.** Strings are authored in ICU MF1 syntax; static passthrough (no
  MF runtime in V1). CI parse-tests every string.
- **Generated, never hand-written.** TS, Zod, and Swift (`Identity.generated.swift`) are
  codegen from a schema-derived FLAT schema. Only `CopyLoader.swift` + `CopyError` are
  hand-written.
- **Zero-dependency boundary (enforced).** `packages/copy/src/**` must not import any
  `@j0nathan-ll0yd/*` package or UI framework, so the backend (an AWS Lambda) can import copy
  without pulling in UI/DS code. The package is self-contained: the authoring JSON Schema
  lives in `packages/copy/schema/` and is read by the build (`packages/copy/scripts/**`).

**Enforcement:** `eslint-local-rules/copy-src-no-dependencies.js` (D9 leaf boundary);
`packages/copy/tests/identity.test.ts` (Ajv rich validation + ICU MF1 parse + `maxChars` +
flat round-trip); the `copy` CI job (build + test + lint); and the freshness git-diff over
`packages/copy/dist` + `Sources/LifegamesCopy` in `packages/schemas/scripts/check-freshness.sh`.

_(Cite: single-source-of-truth content modeling; ICU MessageFormat; Ousterhout deep modules — a simple `copy.person.shortBio` interface over a rich authoring/codegen implementation.)_

---

### P3.2 — Fixtures are a single-source-of-truth content leaf

`@j0nathan-ll0yd/fixtures` (`packages/fixtures/`) is the single source of truth for the
representative dashboard content every consumer renders before live data arrives. It is
the **data analogue of P3.1's copy leaf** — factories in, deterministic fixtures out — and
of the P3 presentational-purity boundary. Live production data is _real_ but not
_comprehensive_; fixtures supply the all-states-populated (empty, sparse, full, edge)
content that an SSR shell and visual tests need. Rules:

- **One home for fixtures.** Canonical fixtures are source-of-truth in
  `@j0nathan-ll0yd/fixtures`. The factories, named variations, and their committed generated
  output (raw `src/generated/` + post-adapter `src/post-adapter/`) all live in the DS
  package. Consumers (web, iOS, future surfaces) **MUST NOT hand-bake or commit local
  fixture snapshots** — per the cross-plan Invariant I2, any consumer-side fixture is a
  smell that re-introduces the silent-staleness surface this rule exists to eliminate.
- **`baseline` is the default SSR content.** The build-time SSR shell uses the `baseline`
  post-adapter variation by default. `baseline` represents the typical state — neither
  misleadingly empty nor unrealistically full.
- **Standard variation triad: `empty` / `baseline` / `full`.** Every fixture domain MUST
  provide all three reserved keys. `empty` = data fetched but zero items / null-ish (the
  widget's empty state); `baseline` = the typical SSR default; `full` = maximally populated
  (all nullable-but-required fields non-null, all optional keys present, longest realistic
  strings, max-count arrays) to stress layout for overflow/truncation. Raw fixtures may add
  any number of domain-specific extras (e.g. `bradycardia`, `allCategories`); post-adapter
  fixtures stay **uniform** — exactly the triad — because `getDashboardFixture()` indexes
  every domain by the shared `FixtureVariation` type. A reserved domain that genuinely
  cannot honor a key is recorded in `VARIATION_EXCEPTIONS` with a rationale (none today).
- **`skeleton` is a render state, not a fixture.** Loading/skeleton is the UI shown while
  data is absent, not a data payload — a `skeleton.json` would either duplicate `empty` or
  violate `additionalProperties:false`. Visual tests exercise the loading state by
  withholding/delaying the response at the interception layer (Playwright route control,
  the analogue of MSW `delay('infinite')`), not via a fixture file.
- **Visual tests select named variations explicitly.** State-specific screenshots (`empty`,
  `baseline`, `full`, plus domain-specific edge cases like `old-timestamp`) select a named
  variation by key — type-safe, never random, never default-only.
- **Runtime polling is the live-data source — never read fixtures at runtime.** Fixtures
  are build-time only. After page load, runtime polling (PollEngine 30s fast / 120s slow)
  overwrites the SSR shell with live CloudFront data. The staleness window is the polling
  interval, not "freshness of last manual sync."
- **Deterministic, validated output.** Factories inject a stable clock so time-relative
  adapter output (e.g. "weeks ago") is reproducible; `generate` is deterministic and its
  output is committed. Raw variations validate against the backend raw-export schemas;
  post-adapter variations validate against the DS `Dashboard*` display schemas.

**Enforcement:** the consumer-side `audit:fixtures` gate (`scripts/audit-fixtures.mjs` in
each consumer, run in `prebuild` + CI — fails the build if any `data/**`,
`test/fixtures/**`, or `src/**/fixtures/**` JSON reappears, per Invariant I2); the DS
`fixtures` CI job (`pnpm -F @j0nathan-ll0yd/fixtures build`/`test`/`lint`) — where `test`
fail-closes if any domain is missing a reserved triad key (post-adapter exactly the triad,
raw at least the triad) and `build` runs the `check:full-coverage` oracle that asserts every
raw `full` fixture is maximally populated (optional keys present + nullable-but-required
fields non-null; `focus` and `health.quantities` are documented `WALKER_EXCEPTIONS`); and
the freshness git-diff over `packages/fixtures/src/generated` + `src/post-adapter` in
`packages/schemas/scripts/check-freshness.sh` (re-runs `pnpm -F @j0nathan-ll0yd/fixtures
generate` and fails on drift).

_(Cite: Plan #04 `04-fixtures-as-ssr-shell.md` — DS-owned fixtures as the SSR shell; Invariant I2 — no consumer-side fixtures; Ousterhout deep modules — a simple `getDashboardFixture()` interface over a rich factory/adapter/codegen implementation.)_

---

### P4 — The last-responsible-moment promotion test

A component earns DS placement when it is presentational (P3) **and**:

1. **≥1 real shipping product surface** consumes it today on its own platform.
2. **A credible second surface is planned or identified** — a watch target that will actually render the widget, a WidgetKit extension in development, or a second deployed web route/page.

**"Product surface" definition:**

- **Web:** a deployed Astro page, route, or layout slot in the consumer site.
- **Swift:** the iOS app target, a real WidgetKit extension, or a watch target that actually depends on `LifegamesWidgets` and renders the widget in a shipping surface.

**Explicitly excluded from the consumer count:** DesignGallery / showcase / preview targets (`DesignGalleryFeature/*Showcase.swift`); the current `LifegamesWidgetsWatch` stub (`Package.swift:26` — depends on `LifegamesComponentsWatch` only, never imports `LifegamesWidgets`).

**Loophole closure:** Adding a bare `import LifegamesWidgets` to the watch target does not satisfy this gate. The watch target must actually render the widget in a shipping surface.

**Outcomes:** 0 surfaces + no `plannedSurface` → **incubating** (valid state; widget is in active development toward its first surface — not a violation). 1 surface + no credible 2nd plan → keep local, lower priority. 1 surface + credible 2nd planned → admit at **Experimental**; advances to **Stable** only once ≥2 real product surfaces consume it (P7). The gate fails only on structural inconsistency (e.g., a consumer reference pointing to a missing file).

**Enforcement:** `scripts/check-promotion.mjs --check` in the `governance-gates` CI job — reports incubating widgets as INFO (not violations); 1-surface + `plannedSurface` surfaces as advisory. Reads `consumers: []` and `plannedSurface` fields (R6) over the complete 43-entry registry (R7 done). Showcase/stub importers excluded by name-allowlist.

_(Cite: Nathan Curtis EightShapes "I Made This. Does It Go in the System?" — 1=no, 2=discuss, 5+=probably belongs; Rule of Three; Sandi Metz — duplication cheaper than wrong abstraction; Kent Dodds AHA; Oz Nova "You Are Not Google" — scale abstraction to actual need.)_

---

### P5 — Surface-differentiated consumption policy

Reflects the monorepo invariant: **web is read-only; iOS is the control plane.**

- **Read-only display surfaces (web):** may consume whole pre-composed widgets from the DS. No reason to decompose.
- **Interactive control-planes (iOS):** compose from DS primitives; consume whole DS widgets only where the P4 admission bar is met. Interactive, stateful, and navigational UI stays in the app.

This asymmetry follows from the nature of each surface, not inconsistent rules. The shared contract remains the token layer (P1).

**Enforcement:** Agent-review checklist + §7 ADR for intentional surface divergence. Partially covered mechanically by P3 + P4.

_(Cite: dbanks.design — same intent, different implementation; Tremor/shadcn/Observable Plot for display surfaces; Atlassian/Radix primitives for control-plane surfaces.)_

---

### P6 — Organism → pattern-first rule

**Atoms and molecules** promote freely once P4 is met; apply P7 lifecycle labels on entry.

**Organisms** follow a two-stage path: (1) document as a named pattern in `docs/patterns/` (one prose paragraph + minimal code example); (2) promote as a shared component only when the organism recurs in ≥3 stable contexts (not actively being redesigned). If it appears in 1–2 contexts, keep it local.

**Enforcement:** Agent-review checklist; ADR required if an organism is promoted without the pattern-first stage.

_(Cite: Brad Frost atomic design — organisms are contested; Polaris patterns-first; Kent Dodds AHA; last responsible moment.)_

---

### P7 — Lifecycle labels

Every promoted component carries a `status` field in its registry entry:

| Status         | Meaning                                                 | Gate                                                        |
| -------------- | ------------------------------------------------------- | ----------------------------------------------------------- |
| `Experimental` | Interface may change; no stability promise.             | P4 bar met (≥1 surface + credible 2nd planned).             |
| `Beta`         | Stable enough for adoption; minor API changes possible. | Interface settling; still <2 real product surfaces.         |
| `Stable`       | Breaking changes require semver major.                  | **≥2 real shipping product surfaces** on the same platform. |
| `Deprecated`   | Scheduled for removal; consumers must migrate.          | Names replacement or "no replacement" explicitly.           |

Components may regress (Stable → Beta → Deprecated). The **Stable gate is ≥2 real product surfaces** — the original strict P4 bar, repurposed as the stability threshold.

**Enforcement:** `scripts/widget-inventory.mjs --check` (in the `governance-gates` CI job) fails if any promoted widget lacks a valid `status` field; emits advisory when a `Stable`-labeled widget has fewer than 2 product-surface consumers in the registry. Runs over the complete 43-entry registry (R7 done).

Formal deprecation annotation, survival period, migration alias requirements, tooling, and quarterly audit process are documented in [`DEPRECATION.md`](DEPRECATION.md).

_(Cite: USWDS lifecycle labels; Primer design system status model; VA.gov Experimental → Beta → Stable → Deprecated — components may regress.)_

---

### P8 — Solo BDFL governance stack

The complete governance process: (1) this constitution (P1–P8); (2) the 3-question intake triage (§4); (3) one-paragraph ADRs committed with the code (§7); (4) Changesets + semver (§6). The answer to overload is **"say no."** Target cap: ~20–40 promoted components per platform. No committees, review boards, or mandatory RFC processes.

Changesets are used for actual releases and published-package version bumps only — **not** a gate on every `packages/**` or `Sources/**` commit. Per-change changeset requirements are enterprise overhead inappropriate for a solo BDFL with no external consumer SLA.

**Enforcement:** Advisory. Changesets configured (`.changeset/config.json`). `changeset status` runs as non-blocking advisory in CI publish step only. `scripts/widget-inventory.mjs --check` surfaces per-platform count against the ~20–40 soft cap.

_(Cite: EightShapes "Solitary" team model; Open Source Guides BDFL; Practical Design Systems — last responsible moment; "design system as a product" — semver as a promise to consumers.)_

---

## 4. Decision Tree — Intake Triage

Apply to every component being considered for promotion.

```
Q1. Is it PRESENTATIONAL?
    (no data fetch · no app/domain state · no navigation ·
     no imports of: TCA, HealthKit, APIClient, SharedModels, CoreLocation)

    NO  ──► stays in the app. STOP.  [P3]
    YES ──► Q2.


Q2. Does it have ≥1 REAL SHIPPING PRODUCT SURFACE today on this platform,
    AND a credible 2nd surface planned or identified?

    Web  : ≥1 deployed Astro page / route / layout slot now + 2nd route planned
    Swift: ≥1 of {iOS app · real WidgetKit ext · watch target that ACTUALLY
           renders it} now + credible 2nd surface planned
    EXCLUDE: DesignGallery/Showcase previews; the empty LifegamesWidgetsWatch stub

    0 surfaces ──► INCUBATING: valid state — widget is developing toward its
                   first surface. No violation. Logged as INFO by gate.  [P4]

    1 surface, NO credible 2nd plan
               ──► Keep local. If ORGANISM, document as PATTERN in docs/patterns/.
                   Lower priority than 0-surface case.  STOP.  [P4, P6]

    1 surface + credible 2nd planned
               ──► Admit at Experimental. Advances to Stable only once ≥2 real
                   product surfaces consume it (P7). Continue to Q3.  [P4, P7]

    ≥2 surfaces ──► Q3. Widget may be labeled Stable once both surfaces ship. [P7]


Q3. ATOM / MOLECULE (primitive) or ORGANISM (composed widget)?

    Primitive ──► Promote now. Enter at Experimental (P7). Apply P3 check.  [P4, P7]
    Organism  ──► Document as PATTERN first (docs/patterns/ — prose + code example).
                  Promote only when organism recurs in ≥3 stable contexts.  [P6, P7]
```

---

## 5. Enforcement Map

| Principle                                       | Tier                        | Mechanism                                                                                                                                                                                                                                                                                                                                               | Hook                                                                                  |
| ----------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **P1** Tokens tiered / no raw hex               | Lint + Script (CI)          | `eslint-local-rules/no-deprecated-tokens.js`; W2 token-only CSS; Swift `LifegamesTokens` rule; extend `scripts/validate-dtcg.mjs` (Tier-1 refs); `scripts/check-token-parity.mjs` (semantic-tier web vs Swift diff)                                                                                                                                     | `check-token-parity` → CI; `validate-dtcg` → `pnpm test`                              |
| **P2** Native reimpl / spec parity / divergence | Script (CI) + agent-review  | `scripts/widget-compliance.mjs` runs in the `governance-gates` CI job over the complete 43-entry registry (R7 done) — validates each entry against its Astro/fixture/manifest artifacts. Divergence traced via mandatory ADR in `docs/adr/`.                                                                                                            | ADR presence → agent-review                                                           |
| **P3** Presentational purity                    | Lint + Script (CI)          | `eslint-local-rules/no-app-module-imports.js` (web); `scripts/check-swift-widget-purity.mjs` (greps `Sources/LifegamesWidgets/**` for TCA / HealthKit / APIClient / SharedModels / CoreLocation; F-015 color/UIKit over `Sources/LifegamesComponents{,Core}/**`). Local-vs-domain-state judgment → agent-review.                                        | `no-app-module-imports` → pre-commit; `check-swift-widget-purity` → CI                |
| **P3.2** Fixtures are a DS-owned content leaf   | Script (consumer + DS) + CI | Consumer-side `audit:fixtures` (`scripts/audit-fixtures.mjs`) bans `data/**`, `test/fixtures/**`, `src/**/fixtures/**` JSON (Invariant I2); DS `fixtures` CI job (`pnpm -F @j0nathan-ll0yd/fixtures build`/`test`/`lint`); freshness git-diff over `packages/fixtures/src/generated` + `src/post-adapter` in `check-freshness.sh` (re-runs `generate`). | `audit:fixtures` → consumer `prebuild` + CI; `fixtures` + `schemas-freshness` → DS CI |
| **P4** 1-surface-now + credible-2nd test        | Script (CI)                 | `scripts/check-promotion.mjs --check` — 0-surface/no-`plannedSurface` → **incubating** (INFO, not a violation). 1-surface + `plannedSurface` → advisory. Gate fails only on structural inconsistency. Reads `consumers: []` + `plannedSurface` fields (R6) over the complete 43-entry registry (R7 done). Showcase/stub excluded by name-allowlist.     | CI (advisory; blocking only on structural errors)                                     |
| **P5** Surface-differentiated consumption       | Agent-review + doc          | Judgment; partially covered by P3 + P4. ADR required for intentional surface divergence.                                                                                                                                                                                                                                                                | Agent-review checklist                                                                |
| **P6** Organism pattern-first                   | Agent-review + doc          | Judgment. ADR required if organism promoted without pattern-first stage.                                                                                                                                                                                                                                                                                | Agent-review checklist                                                                |
| **P7** Lifecycle labels                         | Script (existing, extended) | `scripts/widget-inventory.mjs --check`: fails on missing `status`; advisory when `Stable` but <2 consumers in registry. Runs over the complete 43-entry registry (R7 done).                                                                                                                                                                             | CI (blocking)                                                                         |
| **P8** Governance stack                         | Advisory                    | Changesets configured (`.changeset/config.json`). `changeset status` → non-blocking CI advisory on publish only. `widget-inventory --check` surfaces per-platform count vs ~20–40 cap.                                                                                                                                                                  | CI advisory only                                                                      |

**Existing checks — mapped:**

- `eslint-local-rules/no-deprecated-tokens.js` → P1
- `eslint-local-rules/widget-props-extends-schema.js` → P3
- `eslint-local-rules/copy-src-no-dependencies.js` → P3.1 (D9 copy leaf boundary)
- `scripts/audit-fixtures.mjs` (consumer-side) → P3.2 (Invariant I2 — no consumer-side fixtures)
- `packages/schemas/scripts/check-freshness.sh` → P3.1 + P3.2 + schemas (git-diff freshness over generated output)
- `scripts/widget-compliance.mjs` → P2 (CI-wired in `governance-gates`)
- `scripts/widget-inventory.mjs --check` → P7 (extend for `status` field)
- `scripts/scan-personal-data.sh` → `.husky/pre-commit` (personal data, not governance)
- `scripts/validate-dtcg.mjs` → P1 (extend for Tier-1 direct refs)
- `scripts/check-contrast.mjs` → P1 (accessibility)

**Checks shipped (was implementation backlog R5 — now live in CI/lint):**

| File                                          | Principle | npm script             | Hook       |
| --------------------------------------------- | --------- | ---------------------- | ---------- |
| `scripts/check-token-parity.mjs`              | P1        | `pnpm token:parity`    | CI         |
| `eslint-local-rules/no-app-module-imports.js` | P3        | `pnpm lint`            | pre-commit |
| `scripts/check-swift-widget-purity.mjs`       | P3        | `pnpm swift:purity`    | CI         |
| `scripts/check-promotion.mjs`                 | P4        | `pnpm promotion:check` | CI         |

---

## 6. Versioning & Release

Uses **Changesets** (`.changeset/config.json`) with **semantic versioning**.

**Semver contract:** `patch` — bug fixes, no API changes. `minor` — new components, additive token additions, backward-compatible. `major` — breaking token renames, removed components, interface changes requiring consumer code updates.

**Release workflow:** `pnpm changeset` (record) → `pnpm changeset:version` → `pnpm changeset:publish`. Not a gate on every commit (P8).

**SPM constraint:** The DS must remain a separate Git repository — SPM requires a Git remote to resolve package dependencies. The iOS `Package.swift` resolves `design-system-Lifegames` via SPM; a path-local pnpm workspace cannot satisfy this. The web consumer (`@j0nathan-ll0yd/tokens`, `@j0nathan-ll0yd/web`, `@j0nathan-ll0yd/schemas`) has no such constraint — co-locating with the web repo would eliminate the cross-repo publish step but couples web build to DS repo layout. Decision deferred; see `.omc/plans/open-questions.md` Q3.

### 6.1 Distribution — GitHub Packages

The JS packages (`@j0nathan-ll0yd/{copy,tokens,schemas,web,fixtures}`) are published to **GitHub Packages** (`npm.pkg.github.com`) at `^1.0.0`. They are **public**, so consumers install them with the built-in `GITHUB_TOKEN` in CI (or a local `read:packages` token) — no PAT beyond `packages: read` is required.

Publishing runs from `.github/workflows/publish-ds-packages.yml` (Changesets; triggered by a `ds-v*` tag or manual dispatch), and that is the repository's only publish pipeline. `@j0nathan-ll0yd/config` — the estate's dprint/tsconfig/ESLint floor — was published from here through 1.2.1; its source moved to `j0nathan-ll0yd/mantle`, which owns the other toolchain packages (`eslint-config`, `eslint-rules`) and releases it from 1.2.2 onward. This repository consumes it from the registry like every other consumer.

**Swift consumers** continue to pin to a DS Git tag (or branch) via SPM — that path is independent of the JS distribution model.

The estate reached this model by retiring an earlier local-linking mechanism (yalc) and a set of dormant `REMOTE_ENABLED`-gated workflows; the full record is atlas decision `0015-yalc-retirement-registry-migration`.

### 6.2 SPM-JS version contract

The design system has two consumer surfaces with two distribution mechanisms. To keep them coherent, they share a single source of truth: the Git tag on this repository.

| Consumer              | Pins to                                  | Source of truth                                           | Reproducibility                                                                                        |
| --------------------- | ---------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Swift (iOS / watchOS) | DS Git tag or branch via SPM             | Git tag on `design-system-Lifegames`                      | Full — SPM resolves to a commit SHA                                                                    |
| JS (web, iOS docs)    | `@j0nathan-ll0yd/*` from GitHub Packages | `packages/*/package.json` `version` field at publish time | Full — npm resolves an immutable published version pinned in the consumer's lockfile by integrity hash |

**The contract:**

1. **DS Git tags are canonical.** When DS state is worth a tag (a tokens change consumers should reference, a coordinated DS+iOS+web rollout, etc.), tag the commit on `main`: `git tag v0.1.1 && git push --tags`.
2. **`packages/tokens/package.json` `version` aligns to the Git tag.** A `v0.1.1` tag implies that `packages/tokens/package.json` reads `"version": "0.1.1"` at that commit, and similarly for `@j0nathan-ll0yd/web` and `@j0nathan-ll0yd/schemas`. Bump versions in the same commit that gets tagged.
3. **Swift consumers** add `.package(url: "...", from: "0.1.1")` (or `.branch("main")` during development). SPM resolves this to a Git SHA, fully reproducible.
4. **JS consumers** install `@j0nathan-ll0yd/*` from GitHub Packages (`npm install @j0nathan-ll0yd/tokens@^1.0.0`). The consumer's `package.json` records the semver range; the lockfile pins the exact published version plus its integrity hash — fully reproducible, on par with SPM's SHA.
5. **Semver tier meaning** (applies to both surfaces):
   - `patch` — bug fix, no token name changes, no API changes.
   - `minor` — new tokens, new components, new exported widgets; backward-compatible.
   - `major` — token rename or removal, component removal, SPM product rename, breaking type changes in `@j0nathan-ll0yd/schemas`. Requires consumer code changes.

**Why a single version stream:** Two version streams (a Git tag separate from the JS package version) would force every consumer-facing change to be reasoned about twice and would let the streams drift silently. Keeping them lockstep means "DS at v0.1.1" has the same meaning whether you are an iOS developer or a JS consumer installing `@j0nathan-ll0yd/*` from GitHub Packages.

---

## 7. ADR Convention

ADRs live in `design-system-Lifegames/docs/adr/`, committed in the same PR as the code they document. One file per decision; name it `NNNN-short-slug.md`.

**Format — three paragraphs:**

```
## Context
What situation or constraint forces this decision? Which alternatives were viable?

## Decision
What was decided, stated plainly. Include conditions or constraints that shaped it.

## Consequence
What becomes true as a result? What future work or constraints does this create?
```

**A divergence ADR is required (P2) whenever one platform ships a widget variant the other does not.** The ADR file is the mechanical record distinguishing a deliberate decision from silent drift. An agent reviewing a PR that introduces platform asymmetry must verify the ADR exists; absence is a finding. Keep ADRs under one page — their value is existence and traceability, not exhaustive analysis.
