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

That paragraph is the ambition. Several requirements below are **narrower than the ambition**, because
their gate is: a scan that covers one tree and not its neighbour, a rule that checks an import is
present rather than that a type derives from it, a suite half of which is compiled out on the lane that
gates. Each such requirement states the narrower truth and carries a `**Follow-up (gate widening…)**`
note naming the tightening that would let it claim more. The note is a record of a known gap, not a
commitment; widening a gate is its own change, and the requirement moves only when the gate does.

### How a requirement is bound to its proof

Each requirement is bound by a line-leading `// covers:` comment in the test that holds it, naming
this capability and then the requirement name verbatim. `scripts/openspec-covers.mjs --blocking`
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

Three requirements below describe rules this repo enforces with a **blocking gate that has no
known-answer test**. They are recorded, by identity, in `openspec/covers-baseline.json`. They are
gaps, not passes: the moment one of them gains a test, its id must be pruned from the baseline in the
same change, and a fourth untethered requirement cannot be added without appearing in that file.

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

The **instantiation** half is narrower than the heading reads, on two axes, and this requirement
claims only what the suite actually does:

- **Coverage.** The instantiation cases hand-list their widgets rather than reading the manifest. Four
  cases exist — health, reading, identity and other — and each names a subset of its category, so the
  listed categories are not covered exhaustively and the `github` and `location` categories are not
  instantiated at all. A widget added to the manifest is held to the fixture and JSON halves, and is
  not instantiated by this suite unless it is added to a case by hand.
- **Platform.** The instantiation cases are compiled under `#if canImport(UIKit)`. The gating CI lane
  runs `swift test` on macOS (`.github/workflows/ci.yml` `test-swift`, host `macOS/arm64`; the package
  declares `.macOS(.v14)`), where UIKit is not importable — so on that lane the instantiation cases
  are **compiled out and do not run**. They build and run only on a UIKit platform.

**Follow-up (gate widening, not described here):** running the instantiation pass on the CI lane —
by building it for a UIKit destination or by rewriting the cases to be platform-agnostic — and driving
it from the manifest rather than a hand-listed subset would let this requirement claim instantiation
for every manifest widget. Until then it does not.

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

- **GIVEN** the instantiation cases compiled under `#if canImport(UIKit)`
- **WHEN** the gating lane runs `swift test` on macOS, where UIKit is not importable
- **THEN** the fixture-existence and JSON-validity cases SHALL run over every manifest entry, and the
  instantiation cases SHALL be compiled out — so a crash-on-init reachable only through those cases is
  NOT caught by this lane

### Requirement: A web widget module imports no data layer and performs no module-scope fetch

A `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs` or `.cjs` module under `packages/web/src/widgets/` SHALL NOT
import an application data layer, an API client, an application store, or a third-party HTTP or
data-fetching library, and SHALL NOT call `fetch` outside a function body. Both `import` and
`require()` forms are matched. The rule matches import **specifiers** against a small, closed,
case-insensitive substring list, not identifiers, so a pure presentational helper import stays legal.

`.astro` files under the same tree are **not** scanned by this rule, so an `.astro` widget that
imports a data module is not flagged today. This is the one extension gap in the web-purity pair: the
raw-hex rule below does scan `.astro`, this one does not.

**Follow-up (gate widening, not described here):** adding `.astro` to this rule's file pattern would
close the gap. It is left out of this capability until the rule scans that extension.

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

The two halves of this requirement carry **different scopes**, because the gate scans two different
corpora.

The **color and co-import half** covers all three trees: a source under `Sources/LifegamesWidgets/`,
`Sources/LifegamesComponents/` or `Sources/LifegamesComponentsCore/` SHALL NOT contain `Color(hex:)`
or `Color(red:green:blue:)`, and SHALL NOT import `UIKit` alongside `SwiftUI`.

The **forbidden-import half** covers the widget tree only: a source under `Sources/LifegamesWidgets/`
SHALL NOT import `ComposableArchitecture`, `HealthKit`, `CoreLocation`, `APIClient` or `SharedModels`.
A component under `Sources/LifegamesComponents/` or `Sources/LifegamesComponentsCore/` is **not**
scanned for those imports, and a component that imports one of them passes the gate today.

A `Color(hex:)` site whose value arrives as runtime data MAY be exempted by an entry in
`widget-purity-exceptions.json`. The gate keys an exemption on the file and the line; the `reason`
field is a review convention the exceptions file requires of its authors and the gate does not parse,
so an exemption is a recorded decision rather than a checked one.

**Follow-up (gate widening, not described here):** extending the forbidden-import ban to
`Sources/LifegamesComponents/` and `Sources/LifegamesComponentsCore/` is a plausible tightening, as is
requiring the exemption `reason` field the exceptions file already asks its authors for. Until the
gate scans that corpus, this requirement stays at the widget tree, because a requirement wider than
its gate is a wish with a heading.

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

### Requirement: A web widget source holds no raw hex outside a token fallback argument

An `.astro`, `.css`, `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs` or `.cjs` file under
`packages/web/src/widgets/` SHALL NOT contain a CSS hex color literal — a `#` followed by exactly
three, four, six or eight hex digits. `.astro` and `.css` are scanned as raw source text, because
their style content is not exposed to the rule as string nodes; JS and TS files are scanned as raw
source text **and** at string and template-literal nodes, deduplicated by position, so the diagnostic
anchors to the node. The second argument of `var(--lg-*, FALLBACK)` is exempt, because that form is a
token reference with a declared fallback rather than a hardcoded color. An HTML numeric character
entity is not a color and SHALL NOT be reported.

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

A widget with no schema yet MAY opt out with a `// schema-exempt:` marker that is the **first comment
in the file**; a marker appearing after any other comment does not exempt. The gate requires only the
`schema-exempt:` text — it does not check that a reason follows, so the reason is a review convention
rather than a parsed field. Per `CONTRACT.md`, changing that marker is a minor bump on
`@j0nathan-ll0yd/web`.

**Follow-up (gate widening, not described here):** checking that the exported Props type actually
extends or intersects an imported schema type, and requiring non-empty reason text after the marker,
would let this requirement claim derivation instead of import presence.

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

Two non-blocking states are reported and SHALL NOT fail the gate: a widget with no consumer and no
planned surface is `incubating` — a valid state, reported at information level — and a widget with
exactly one consumer and no planned surface is reported as an advisory note.

**Follow-up (gate widening, not described here):** having the gate classify consumer entries itself,
rather than trusting registry curation, would move the showcase/preview/watch-stub exclusion into the
gate. Refreshing the stale "advisory" wording in the script header is a docs fix on the same file.

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
