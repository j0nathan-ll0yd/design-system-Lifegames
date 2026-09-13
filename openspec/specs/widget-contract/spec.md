# Widget Contract

## Purpose

What a Lifegames design-system widget promises, on both platforms, and what already holds it to that
promise.

This capability is descriptive, not aspirational. Every requirement below restates a rule this repo
**already enforces** in `governance-gates`, `test-swift`, `contract-ts` or `lint-web`. The prose was
scattered across `GOVERNANCE.md` (P2–P7, F-014, F-015), `CONTRACT.md`, `widget-consumers.json`,
`widget-purity-exceptions.json` and `contracts/component-catalog/README.md`; this file is the same
contract in a machine-checkable grammar.

A widget is a **pure presentation of props**. It renders data it is handed. It does not fetch, it
does not hold application state, it does not reach for a platform sensor, and it does not name a
color the token tier has not already named. Its props shape is generated, its fixture is real, and
its claim to be tested is checked rather than asserted.

That paragraph is the ambition. Where a requirement below is **narrower than the ambition**, it states
the narrower truth. The rule for resolving the difference is: **raise the gate, do not shrink the
requirement.** A gap in a scan is a defect in the scan, not a discovery about what the contract means.

Several gaps that this file previously recorded as `**Follow-up**` notes have since been closed by
widening the gate rather than by narrowing the prose — the Swift forbidden-import scan now covers the
component trees the constitution always named, the web purity rules block instead of warning, the
lint glob reaches `.css` and `.astro`, the exemption `reason` is parsed, and the Swift instantiation
pass runs on the gating lane. What remains narrow is narrow because widening it needs infrastructure
this repo does not have (a UIKit test destination) or a corpus that does not exist yet, and each such
requirement says which.

### How a requirement is bound to its proof

Each requirement is bound by a line-leading `// covers:` comment in the test that holds it, naming
this capability and then the requirement name verbatim. `audits/checks/d3-openspec-covers.mjs --blocking`
reconciles both directions on every PR: a requirement with no tether reds, and a tether naming no
requirement reds.

That sentence names the tether format rather than spelling it, and the reason is the rule itself: any
single line carrying `covers:` followed by the separator is a **near-miss** — a tether a human would
believe and the parser would not — and the rule reports it wherever it appears, spec file included.
The gate holds this file to its own grammar.

There are deliberately **no `Verified by` file-and-line citations** in this file. The estate has
measured that class: a hand-typed line number drifts from the tether it cites, and mantle-LP carries
19 live citation findings for exactly that reason (atlas `.omc/plans/phoenix-spec-deepdive.md` §3.4).
The `// covers:` tether already holds the file and the line, machine-read, so a second hand-synced
copy of the same fact would only be a new way to be wrong.

### Known gaps

`openspec/covers-baseline.json` is **empty**: every requirement below is tethered to a known-answer
test. An untethered requirement cannot be added without appearing in that file, and each id recorded
there is a gap, not a pass — the moment one gains a test, its id must be pruned in the same change.

It was three, then two, now none. The Swift purity gate gained
`audits/__tests__/d3-swift-widget-purity.test.mjs`; watch exclusions and the Stable-promotion bar
gained `audits/__tests__/d3-watch-exclusions.test.mjs` and `audits/__tests__/d3-promotion.test.mjs`
(#257). Each id was pruned in the change that closed it — the discipline working, not an exception
to it. An empty baseline grandfathers nothing, which is the strictest state, not an absent gate.

## Requirements

### Requirement: Every cataloged widget fixture decodes into the Props type its catalog row names

Every `(category, name)` pair the Swift fixture catalog registers SHALL resolve to a fixture on disk,
and that fixture SHALL decode into the Props type — or through the adapter — that its catalog row
declares. A fixture that loads but cannot be decoded SHALL be reported as a failure against the row
that declared it, naming the Props type, never silently skipped.

#### Scenario: A cataloged fixture is missing from the resource bundle

- **GIVEN** a catalog row naming a `(category, name)` pair and a Props type
- **WHEN** the widget test target resolves that pair through `WidgetFixtures.data(category:name:)`
- **THEN** a missing `<category>/<name>.json` SHALL fail the suite with the pair and the declared
  Props type in the message

#### Scenario: A fixture's wire shape drifts from the Props type it feeds

- **GIVEN** a fixture whose JSON no longer matches the Props type declared for it
- **WHEN** the catalog decodes every registered row
- **THEN** the decode failure SHALL be recorded against that row, and the suite SHALL NOT report a
  pass for a row it could not decode

### Requirement: Every manifest widget has a fixture on disk and instantiates without crashing

Every entry in `widget-manifest.json` SHALL name a fixture that exists in the widget resource bundle,
that fixture SHALL parse as JSON, and the manifest SHALL be decodable as a whole. The manifest is the
register the render smoke pass walks; an entry with no fixture is a widget nothing can render. This
half holds for **every** manifest entry and runs on the gating lane.

The **instantiation** half SHALL run on the gating lane and SHALL be reconciled against the manifest.
Every manifest widget whose view is built by the `LifegamesWidgets` target — 30 of the 32 — SHALL be
constructed from props by a case in the render smoke suite, and the set of widgets those cases cover
SHALL be compared against the manifest in both directions: a manifest widget with no case FAILS, and a
name covered here that the manifest does not carry FAILS as a stale claim to coverage.

Two manifest widgets, `DiagnosticsMonitor` and `SyncStatus`, SHALL be named as excluded with their
reason rather than being silently absent: their views live in `Sources/LifegamesWidgetsWatch/`, a
separate SPM target this suite does not import, so covering them needs a watch test target rather than
another case in this file. The reconciliation counts a named exclusion, so the two cannot grow to
three without someone writing down why.

**What "instantiates without crashing" means here, exactly.** It means each `init(props:)` runs without
trapping. It is **not** a render proof: SwiftUI does not evaluate `body` at construction, so a view
whose `body` calls `fatalError` constructs successfully, and every `init(props:)` in this target is
assignment plus a ternary. The requirement claims a construction-time contract check — each Props
initializer still accepts what the suite hands it — and a trap guard, and claims nothing about pixels.

This half previously claimed less and delivered less still. The cases sat under `#if canImport(UIKit)`
while the gating lane runs `swift test` on macOS (`.github/workflows/ci.yml` `test-swift`; the package
declares `.macOS(.v14)`), so **100% of them were compiled out** — `swift test list --filter RenderSmoke`
returned five identifiers, none of them an instantiation case — and the hand-listed cases covered 16 of
32 with `github` and `location` absent entirely. Nothing in them needed UIKit; deleting the guard made
the suite run on macOS in 0.010s with no simulator and no destination change.

#### Scenario: A manifest widget has no instantiation case

- **GIVEN** a widget added to `widget-manifest.json` whose view the widgets target builds
- **WHEN** the render smoke suite reconciles its covered set against the manifest
- **THEN** the suite SHALL fail naming that widget, rather than holding it to the fixture halves alone
  and leaving instantiation silently uncovered

#### Scenario: A manifest entry names a fixture that is not on disk

- **GIVEN** a `widget-manifest.json` entry carrying a `fixturePath`
- **WHEN** the render smoke suite resolves each entry's fixture from the bundle
- **THEN** an unresolvable fixture SHALL fail the suite rather than being skipped as absent

#### Scenario: The manifest gains or loses a widget without the register moving with it

- **GIVEN** the manifest is the authority for how many widgets the Swift target ships
- **WHEN** a widget is added to or removed from the manifest
- **THEN** the pinned manifest count SHALL fail until the register is moved in the same change

#### Scenario: A manifest fixture is present but is not parseable JSON

- **GIVEN** a fixture that resolves from the bundle but whose bytes are not a JSON object or array
- **WHEN** the render smoke suite reads every manifest entry's fixture
- **THEN** the suite SHALL fail naming that widget, because a present-but-unreadable fixture is a
  widget nothing can render

#### Scenario: The suite runs on the macOS gating lane

- **GIVEN** the render smoke suite and a CI lane that runs `swift test` on macOS
- **WHEN** that lane runs
- **THEN** the fixture-existence and JSON-validity cases SHALL run over every manifest entry AND the
  instantiation cases SHALL run, because none of them requires UIKit — so a crash-on-init is caught on
  the lane that gates rather than only on a platform CI never builds for

### Requirement: A web widget module imports no data layer and performs no module-scope fetch

An `.astro`, `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs` or `.cjs` module under `packages/web/src/widgets/`
SHALL NOT import an application data layer, an API client, an application store, or a third-party HTTP
or data-fetching library, and SHALL NOT call `fetch` outside a function body. Both `import` and
`require()` forms are matched. The rule matches import **specifiers** against a small, closed,
case-insensitive substring list, not identifiers, so a pure presentational helper import stays legal.

This is a **blocking** rule. It is configured `error`, the lint script carries `--max-warnings 0`, and
it runs in the required `governance-gates` status context as well as in `lint-web`.

Two things had to be true at once for it to gate, and neither was. The rule was configured `warn` and
`pnpm lint` carried no `--max-warnings`, so a widget importing `axios` printed
`1 problem (0 errors, 1 warning)` and exited 0; and the rule's file pattern omitted `.astro`, so a
module-scope `fetch` in an `.astro` widget's frontmatter produced no diagnostic at all. Raising the
severity without adding the extension would have gated half the tree, and adding the extension without
raising the severity would have gated nothing — so both landed together. Measured blast radius of the
raise across the whole widget tree: zero existing violations.

`astro-eslint-parser` exposes the `---` frontmatter as ESTree nodes, so the same `ImportDeclaration`
and `CallExpression` visitors reach it; no second implementation exists for `.astro`.

#### Scenario: An `.astro` widget fetches in its frontmatter

- **GIVEN** an `.astro` file under `packages/web/src/widgets/` whose frontmatter imports a data module
  and calls `fetch` at module scope
- **WHEN** lint runs over it
- **THEN** both SHALL be reported as errors and the lint SHALL exit non-zero, because a warning that
  cannot fail a build is a note, not a boundary

#### Scenario: A widget reaches for the application data layer

- **GIVEN** a source file inside `packages/web/src/widgets/`
- **WHEN** it imports the app data layer, a local api client, a store module, or an HTTP client
- **THEN** lint SHALL report a forbidden import naming the offending specifier

#### Scenario: A widget imports a pure presentational helper

- **GIVEN** the same widget file importing a formatter from `runtime/` or a token from
  `@j0nathan-ll0yd/tokens`
- **WHEN** lint runs over it
- **THEN** the import SHALL be allowed, because the presentational-purity boundary is about data
  acquisition, not about all imports

#### Scenario: The same forbidden import sits outside the widget tree

- **GIVEN** a file outside `packages/web/src/widgets/` importing the app data layer
- **WHEN** lint runs over it
- **THEN** the rule SHALL be inert, because the boundary it draws is the widget tree

### Requirement: A Swift widget or component source holds no unreviewed raw color literal

Both halves carry the **same scope**: the union of `Sources/LifegamesWidgets/`,
`Sources/LifegamesComponents/` and `Sources/LifegamesComponentsCore/`.

A source in that union SHALL NOT contain `Color(hex:)` or `Color(red:green:blue:)`, SHALL NOT import
`UIKit` alongside `SwiftUI`, and SHALL NOT import `ComposableArchitecture`, `HealthKit`,
`CoreLocation`, `APIClient` or `SharedModels`.

The forbidden-import half previously covered the widget tree only, so a component could import
`HealthKit` and the gate exited 0. `GOVERNANCE.md` §5 draws the ban around "a DS component", not around
the widget tree, and the gate already walked all three trees for the color detections — the import loop
simply did not use that corpus. Widening it was one loop; measured across the 34 component files at the
time, zero hits, so the wider gate went green on the same commit that widened it.

A `Color(hex:)` site whose value arrives as runtime data MAY be exempted by an entry in
`widget-purity-exceptions.json`. The gate keys an exemption on the file and the line, and the `reason`
field is **required and parsed**: an entry whose `reason` is missing, empty or not a string exempts
nothing AND is itself a blocking finding, so the exempted site is reported twice rather than suppressed
once. The exceptions file has always told its authors "Reason MUST explain why the raw color is
required"; that sentence is now enforced rather than hoped for. An unparseable exceptions file is a
blocking finding, never an empty allow-list that quietly passes.

**Still narrow, deliberately:** the gate matches `import <Module>` per line. A component that reaches
the same data through a transitive dependency, or that names an app-only _type_ without importing its
module, is not matched. Closing that needs a Swift dependency graph rather than a line scan, which is a
different tool, not a wider regex.

#### Scenario: A component reaches for a sensor or state framework

- **GIVEN** a source under `Sources/LifegamesComponents/` or `Sources/LifegamesComponentsCore/`
- **WHEN** it imports `HealthKit`, `CoreLocation`, `ComposableArchitecture`, `APIClient` or
  `SharedModels`
- **THEN** the purity gate SHALL block, because P3 bans the app-only import for a DS component and not
  merely for a widget

#### Scenario: An exemption is recorded without a reason

- **GIVEN** an entry in `widget-purity-exceptions.json` naming a real `file:line` with no non-empty
  `reason`
- **WHEN** the purity gate loads the allow-list
- **THEN** the entry SHALL exempt nothing and SHALL itself be reported as a blocking finding, because
  an unexplained exemption is a suppression wearing a record's clothes

#### Scenario: A widget names a color the token tier has not named

- **GIVEN** a Swift widget or component source
- **WHEN** it introduces a `Color(hex:)` or `Color(red:green:blue:)` site absent from
  `widget-purity-exceptions.json`
- **THEN** the purity gate SHALL exit non-zero and name the file and line

#### Scenario: A runtime-data color is exempted with a stated reason

- **GIVEN** a language-color swatch whose hex arrives from the GitHub API
- **WHEN** its exact `file:line` is listed in `widget-purity-exceptions.json` with a reason
- **THEN** the site SHALL still be reported, and SHALL NOT block, because the exemption is a
  reviewed record rather than a suppression

#### Scenario: A widget reaches for a sensor or state framework

- **GIVEN** a source under `Sources/LifegamesWidgets/`
- **WHEN** it imports `HealthKit`, `CoreLocation`, `ComposableArchitecture`, `APIClient` or
  `SharedModels`
- **THEN** the purity gate SHALL block, because the data dependency belongs to the app layer

#### Scenario: A runtime-data color is exempted with no stated reason

- **GIVEN** the same allow-list entry, this time carrying a non-empty `reason`
- **WHEN** the purity gate loads it
- **THEN** the site SHALL be reported as exempt and SHALL NOT block, because the exemption is now a
  reviewed record the gate has actually read

### Requirement: A web widget source holds no raw hex outside a token fallback argument

An `.astro`, `.css`, `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs` or `.cjs` file under
`packages/web/src/widgets/` SHALL NOT contain a CSS hex color literal — a `#` followed by exactly
three, four, six or eight hex digits. `.astro` and `.css` are scanned as raw source text, because
their style content is not exposed to the rule as string nodes; JS and TS files are scanned as raw
source text **and** at string and template-literal nodes, deduplicated by position, so the diagnostic
anchors to the node. The second argument of `var(--lg-*, FALLBACK)` is exempt, because that form is a
token reference with a declared fallback rather than a hardcoded color. An HTML numeric character
entity is not a color and SHALL NOT be reported.

The `.css` half is real rather than nominal. The rule's file pattern had always admitted `.css` and its
`Program` handler had always scanned raw text, but the lint glob was `{ts,tsx,js,jsx,astro}` and no
config block matched a stylesheet, so ESLint never handed it one — an injected `#ff006e` in
`packages/web/src/widgets/identity/NotFound.css` produced zero diagnostics. Closing it took the
extension in the glob plus a config block with a raw-text parser, because CSS has no ESTree grammar and
this rule does not need one.

#### Scenario: A widget hardcodes a hex color

- **GIVEN** a widget source under `packages/web/src/widgets/`
- **WHEN** it holds a three-, four-, six- or eight-digit hex literal in a string, a template literal
  or the raw text of an `.astro` or `.css` file
- **THEN** lint SHALL report the literal verbatim, so the review names the color it is replacing

#### Scenario: A token reference carries a hex fallback

- **GIVEN** the same file writing `var(--lg-color-accent-pink, #ff006e)`
- **WHEN** lint runs over it
- **THEN** the hex SHALL be allowed, because the authored value is the token and the hex is the
  declared fallback

#### Scenario: A glyph is written as a numeric character entity

- **GIVEN** a widget rendering `&#9733;` or `&#9474;`
- **WHEN** lint runs over it
- **THEN** the entity SHALL NOT be reported as a hex color

### Requirement: A web widget Props type extends its generated schema unless marked schema-exempt

A `<widget>/<name>.types.ts` file under `packages/web/src/widgets/` — exactly one directory level down
— SHALL import from `@j0nathan-ll0yd/schemas`. What the gate checks is the **presence of that import**,
not that the exported Props type derives from it: a file that imports the package and then hand-writes
its Props type alongside passes. Single authorship of the prop shape is the intent the import stands
for, and no gate holds it — `typecheck` checks whatever shape a file declares, and does not require
that shape to descend from a schema type. Derivation rests on review.

This is a **blocking** rule. It is configured `error` and the lint script carries `--max-warnings 0`.
It was `warn` with no `--max-warnings`, so a `.types.ts` with no schema import printed
`1 problem (0 errors, 1 warning)` and the lint exited 0 — the requirement said "lint SHALL report it"
and lint did report it, into a stream nothing read. Measured blast radius of the raise: zero existing
violations across the 30 `.types.ts` files in the tree.

A widget with no schema yet MAY opt out with a `// schema-exempt:` marker that is the **first comment
in the file**; a marker appearing after any other comment does not exempt. The gate requires only the
`schema-exempt:` text — it does not check that a reason follows, so the reason is a review convention
rather than a parsed field. Per `CONTRACT.md`, changing that marker is a minor bump on
`@j0nathan-ll0yd/web`.

**Still narrow, deliberately:** what the gate checks remains import PRESENCE, not derivation. Checking
that the exported Props type extends or intersects an imported schema type needs type information the
rule does not have — a typed lint pass, not a stricter severity — so derivation still rests on review.
Requiring reason text after `schema-exempt:` is a smaller tightening and is not done here.

#### Scenario: A Props type is authored independently of the schema

- **GIVEN** a `*.types.ts` file inside the widget tree
- **WHEN** it carries no import of `@j0nathan-ll0yd/schemas`
- **THEN** lint SHALL report it once, naming the file, because a second hand-written copy of a prop
  shape drifts silently — and it SHALL report whether or not the file exports a Props type, since the
  import is what is checked

#### Scenario: A Props type is hand-written beside a schema import

- **GIVEN** a `*.types.ts` file that imports `@j0nathan-ll0yd/schemas` and then declares its Props
  type without referencing anything from that import
- **WHEN** lint runs over it
- **THEN** the rule SHALL pass it, because the rule checks import presence rather than derivation

#### Scenario: A widget with no schema declares the exemption

- **GIVEN** the same file whose first comment is a `// schema-exempt:` marker
- **WHEN** lint runs over it
- **THEN** the file SHALL be skipped entirely, because the gap is now recorded rather than hidden

### Requirement: The widget registries reconcile with each other and with the filesystem

`production-widgets.json`, `widget-manifest.json`, `widget-consumers.json` and
`docs/widget-inventory.json` SHALL agree with each other and with what is on disk. The three spellings
of a widget name — the schema id, the `V<n>`-suffixed registry name, and the `View`-suffixed Swift
type — SHALL canonicalize to one row rather than producing a phantom widget per spelling. A registry
field that disagrees with a filesystem probe SHALL be a finding against the registry, not against the
filesystem.

#### Scenario: A shipped widget is absent from the authoritative registry

- **GIVEN** a widget present on disk as both an Astro component and a Swift view, and marked
  `production: true` in `widget-manifest.json`
- **WHEN** the matrix reconciles the manifest against `production-widgets.json`
- **THEN** it SHALL raise a HIGH finding naming that widget and the registry that has no entry for it

#### Scenario: A registry contradicts itself

- **GIVEN** `widget-consumers.json` whose `consumedWidgets` array names a widget its `widgets` array
  does not carry
- **WHEN** the matrix reads that file
- **THEN** the self-inconsistency SHALL be raised against the file that holds both arrays

#### Scenario: One widget is spelled three ways across four registries

- **GIVEN** the same widget written as `PlaceLeaderboardV3`, `PlaceLeaderboard` and
  `BioTerminalView` in different sources
- **WHEN** the matrix canonicalizes each name before merging
- **THEN** the spellings SHALL merge into one row with no spurious finding, while a genuine spelling
  mismatch SHALL still be flagged

### Requirement: The component-contract catalog is generated from source, never hand-authored

Every `contracts/component-catalog/catalog/*.contract.json` entry SHALL be produced by `generate.mjs`
from sources that already exist in the repo — props from the generated widget schema, states from
fixture and snapshot filenames, the accessibility label from the Swift view. The generator SHALL be
byte-deterministic and independent of where its output is written, every derived reference SHALL
resolve to a real file, and an unmappable Swift view SHALL stop the generator rather than being paired
by guesswork. An absent fact SHALL be written as `null`, never inferred.

#### Scenario: A contract entry is edited by hand

- **GIVEN** a committed `*.contract.json` entry
- **WHEN** the catalog is regenerated into a scratch directory and diffed against what is committed
- **THEN** the difference SHALL red the gate, because a hand-edited entry reads as verified while
  claiming something the source does not say

#### Scenario: A Swift view cannot be paired with a generated schema

- **GIVEN** a `<Widget>View.swift` whose widget maps to no generated schema title
- **WHEN** the generator walks the union of the Swift and web widget trees
- **THEN** it SHALL throw rather than emit an entry paired by guesswork

#### Scenario: A widget has no accessibility label

- **GIVEN** a Swift view carrying no `.accessibilityLabel(` call
- **WHEN** the generator records that widget's accessibility axis
- **THEN** the axis SHALL be written as `null` and SHALL NOT be filled from the widget's title or id

### Requirement: A widget conformance gap is grandfathered by identity and the grandfathered set cannot grow unjustified

A widget with no consumer behavioral test, or with no accessibility label, SHALL be named in
`contracts/component-catalog/conformance-baseline.json` or SHALL fail the gate. The baseline SHALL be
keyed by widget identity and axis, never by a count, and SHALL be compared against its own copy at the
merge base so `--update-baseline` cannot silently absorb a new gap. Growth SHALL require a
`Baseline-Raise: <axis>:<widget-id> <reason>` trailer naming that exact axis and id. A baseline id
naming no widget SHALL fail; a graduated widget's stale id SHALL be reported as prunable and SHALL NOT
block.

**The base SHALL be a real ancestor, and there SHALL be no way to make the comparison vacuous.** The
freeze resolves its base as the merge base with the target branch. Two paths made that base equal HEAD,
and a base equal to HEAD compares the baseline against itself: every growth set is empty and the check
prints `ok`, reporting itself as frozen while checking nothing.

- `CATALOG_BASELINE_BASE` took a verbatim commit-ish with no merge base, so `=HEAD` greened a branch
  that reds without it — measured, PASS 6/6, exit 0. An override resolving to HEAD or to a **descendant**
  of HEAD is now rejected outright. The known-answer suite injects its base through an explicit function
  ARGUMENT instead, because a test-only escape hatch that ships in the shipped code is not test-only.
- On the **push** lane `origin/main` IS the pushed commit, so `merge-base(origin/main, HEAD) == HEAD` and
  the freeze was vacuous for every direct push — measured, a gap absorbed straight onto main gave zero
  failures. CI now hands the freeze `github.event.before` on that lane, which is a real ancestor.

There is still no thaw switch. Growth is unlocked only by naming the axis and the id and giving a reason.

#### Scenario: The freeze is asked to compare the baseline against itself

- **GIVEN** a branch that adds a gap and re-records the baseline
- **WHEN** the freeze base is pointed at HEAD, or at a commit that descends from HEAD
- **THEN** the gate SHALL fail with an error naming the vacuous comparison, and SHALL NOT report `ok`,
  because a base that cannot contain a change this branch has not already made is not a comparison

#### Scenario: A gap is absorbed by a direct push to the target branch

- **GIVEN** a commit pushed to `main` that adds an id to a grandfathered list
- **WHEN** the push lane runs the freeze
- **THEN** the base SHALL be the commit that preceded the push rather than the pushed commit itself, so
  the added id SHALL red exactly as it would on a pull request

#### Scenario: A new widget arrives with neither a behavioral test nor an accessibility label

- **GIVEN** a widget absent from both grandfathered lists
- **WHEN** the ratchet evaluates the catalog
- **THEN** it SHALL fail on both axes and name the widget

#### Scenario: A new gap is absorbed by re-recording the baseline

- **GIVEN** a branch that adds a gap and re-records the baseline with `--update-baseline`
- **WHEN** the freeze compares the committed baseline against its copy at the merge base
- **THEN** the added id SHALL red unless a `Baseline-Raise:` trailer in that branch names the same
  axis and id and gives a reason

#### Scenario: A gap is genuinely closed

- **GIVEN** a branch that adds the missing test or label and shrinks the grandfathered set
- **WHEN** the freeze runs
- **THEN** it SHALL pass, because the freeze blocks growth and never blocks progress

### Requirement: Every component that server-renders a data-fallback cover bundles the load-time initializer

An Astro component that server-renders a cover image with a data-driven fallback SHALL bundle the
load-time fallback initializer the runtime exports, so a dead image source is replaced in a real
browser rather than painting a broken glyph. The browser half SHALL be asserted in a real browser,
because a DOM implementation that performs no `<picture>` source selection cannot tell a dead source
from a live one.

#### Scenario: A component server-renders a fallback without wiring the initializer

- **GIVEN** an `.astro` component that server-renders a data-fallback cover
- **WHEN** the gate scans every such component for the load-time init call
- **THEN** a component that omits it SHALL fail, because its covers can never fall back

#### Scenario: The primary image source is dead in a real browser

- **GIVEN** a server-rendered cover whose primary source cannot load
- **WHEN** the page runs in a real browser engine
- **THEN** the rendered image SHALL resolve to the fallback source rather than a broken glyph

### Requirement: A backend export payload adapts into widget Props without losing or inventing a field

The web runtime adapters SHALL map a backend export payload onto the shape its widget consumes,
preserving unit conversions, absent-field handling and status labelling exactly. An absent measurement
SHALL adapt to the widget's declared empty presentation rather than to a fabricated value.

#### Scenario: A complete export payload adapts to widget props

- **GIVEN** a health, sleep, workouts, books, articles, github-events or starred-repos export
- **WHEN** its adapter runs over the payload
- **THEN** every field the widget declares SHALL be produced, with conversions applied once and only
  once

#### Scenario: An export omits a measurement the widget renders

- **GIVEN** an export payload missing a quantity the widget presents
- **WHEN** the adapter runs
- **THEN** the widget SHALL receive the declared empty presentation, and the adapter SHALL NOT invent
  a placeholder value

### Requirement: The watch targets exclude the widgets that cannot run on watchOS

`Sources/LifegamesComponentsWatch/` and `Sources/LifegamesWidgetsWatch/` SHALL contain no file whose
name mentions `ECG` or `PulsingMapMarker`, and no source under those targets SHALL reference either
symbol. Both are excluded by family, not by exact name: the ECG view is sensor- and chart-heavy, and
the pulsing map marker depends on MapKit and a coordinate stream.

#### Scenario: An excluded widget lands in a watch target

- **GIVEN** a Swift file added under a watch target
- **WHEN** its filename or its source references `ECG` or `PulsingMapMarker`
- **THEN** the watch-exclusions gate SHALL exit non-zero naming the file and the symbol

#### Scenario: A watch-safe widget lands in the same target

- **GIVEN** a Swift file under a watch target referencing neither excluded symbol
- **WHEN** the gate scans it
- **THEN** it SHALL pass, because the exclusion list is closed and named rather than a general
  size heuristic

### Requirement: A widget labelled Stable has at least two real product surfaces

A widget whose lifecycle label is `Stable` SHALL have at least two consumers recorded in the registry
that carries it. This is a **blocking** rule: under `--check` the gate exits non-zero when any entry
is `Stable` with fewer than two recorded consumers. The gate's own header comment still describes the
`Stable` finding as advisory, which is stale — the exit code is the authority, and it blocks.

What the gate counts is the length of the entry's `consumers` array, as recorded. That showcase,
preview and watch-stub importers do not count as product surfaces is enforced **upstream**, in how
`production-widgets.json` and `widget-consumers.json` are curated — the registries record only real
product surfaces per the census. The gate does not classify a consumer, so a registry that recorded a
showcase importer as a consumer would be counted as a surface here.

Two non-blocking states are reported and SHALL NOT fail the gate **provided the entry's status is not
`Stable`**: a widget with no consumer and no planned surface is `incubating` — a valid state, reported
at information level — and a widget with exactly one consumer and no planned surface is reported as an
advisory note.

That guard is load-bearing and the prose used to omit it. The two reported states and the blocking arm
are evaluated independently, so an entry with one consumer, no `plannedSurface` and status `Stable`
lands in the advisory list AND in the blocking list, and the blocking list decides the exit code.
Executed: flipping `IdentityCard` to `Stable` exits 1 while still being printed as a one-surface
advisory. The scenarios below always carried the "not `Stable`" guard; the prose above them now does
too. The registry holds zero `Stable` entries today, so the blocking arm has no live subjects.

**Considered and declined — having the gate classify consumers itself.** The exclusion of showcase,
preview and watch-stub importers is enforced upstream in how the registries are curated, and moving it
into the gate was evaluated against the actual corpus rather than in principle. Across both registries
there are 75 entries and **four distinct consumer strings**: `index.astro` (29), `HealthFeatureView`
(2), `404.astro` (1). Every one is a real product surface; there is no showcase or preview importer
recorded anywhere to classify. All 75 entries are `Experimental`, so the only arm a classifier could
change has zero subjects. A classifier built now would be a filename heuristic with no corpus to
validate against, guessing at a shape that has never occurred — which is how a gate acquires false
confidence rather than reach. The exclusion stays where it is enforced, and this requirement says so
rather than promising a tightening nobody can currently test.

#### Scenario: A widget is promoted to Stable on one surface

- **GIVEN** a registry entry whose status is `Stable` and whose `consumers` array holds fewer than two
  entries
- **WHEN** the promotion gate evaluates both registries under `--check`
- **THEN** it SHALL exit non-zero, because `Stable` is the two-surface threshold and the rule blocks

#### Scenario: A widget is developing toward its first surface

- **GIVEN** a registry entry with zero consumers and no planned surface
- **WHEN** the promotion gate evaluates it
- **THEN** it SHALL be reported as incubating and SHALL NOT fail the gate

#### Scenario: A widget has reached exactly one surface

- **GIVEN** a registry entry with one consumer and no planned surface, whose status is not `Stable`
- **WHEN** the promotion gate evaluates it
- **THEN** it SHALL be reported as an advisory note and SHALL NOT fail the gate, because the blocking
  threshold belongs to the `Stable` label rather than to the surface count alone
