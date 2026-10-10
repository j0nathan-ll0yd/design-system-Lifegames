# @j0nathan-ll0yd/web

## 4.1.0

### Minor Changes

- 02cdae5: The browser reaches the same card the server renders (atlas decision 0160). Website PR 0a prerenders `/` with every live card `loading`, and the browser fills each card. Five gaps in that browser path are closed. Each one now follows one rule that the server and the browser share.

  **New exports (why this is a minor).** Every existing call signature still compiles. The rendering changes below are honesty fixes.
  - `runtime/freshness`: the one live-versus-stale rule. `EXPORT_FRESHNESS` restates the registry `audit.warn` and `audit.error` ages per export: health 45 min and 3 h; sleep and workouts 12 h and 24 h; books, articles and GitHub events 7 d and 14 d; starred repositories and theatre reviews 18 h and 36 h. The module also exports `freshnessState(domain, generatedAt, nowMs)`, `isFreshnessDegraded(domain, generatedAt, nowMs)`, `exportFreshness(domain, data, nowMs?)` (returns a `Freshness`, `{state, generatedAt}`) and `exportDomainState(domain, data | null, nowMs?)`. An export is `live` up to its `audit.warn` age and `stale` beyond it. An export with a missing or invalid `generatedAt` is `stale`, and its card shows no "as of" label and no `data-generated-at`.
  - Every data updater takes an optional trailing `freshness` argument. The updaters are `updateHeartRate`, `updateHeartRateFooter`, `updateMovementRings`, `updateHydration`, `updateNightSummary`, `updateWorkouts`, `updateDevActivityLog`, `updateStarredRepos`, `updateReadingFeed`, `updateBookshelf` and `updateTheatreReviews`. With `freshness`, a stale export records `stale` and shows the absolute "as of" header that `WidgetTimestamp` renders. Without it, the card records `live` and names no timestamp, as before.
  - `revealLiveData(card, state, opts)` accepts `stale` and `opts.generatedAt`. It writes the server's header through the new shared `widgetTimestampView` (in `runtime/widget-state`) and removes the loading `<noscript>` note.
  - `renderWidgetUnavailable(card)` in `runtime/updater-empty`: after a failed first read, it leaves a `loading` card (or a card the focus gate released with `releaseSuppression`) exactly as the server renders `unavailable`. The output has the notice from the `widgets.widgetState` copy keys (`stateNoticeHtml`), the value-free scaffold hidden, no header label, `data-ssr-state="unavailable"` and no values. It returns `false` and writes nothing for a suppressed card, or for a card that shows a reading (`live`, `stale` or `empty`). A later successful read fills the card through its updater.
  - `runtime/widget-views`: `heartRateView`, `movementView`, `hydrationView` and `nightSummaryView` compute every slot of a health card from its props. The template renders the view, and the updater writes the same view. Also `toNightSummaryHealth`, `rangeBand`, `MOVEMENT_DEFAULT_GOALS` and `MOVEMENT_RING_RADII`.
  - `runtime/widget-markup`: `heartRateEmptyHtml`, `movementEmptyHtml` and `hydrationRangeHtml`, the markup that a template and an updater both write.
  - `isWatchPaused(health)` in `runtime/widget-rules`. `mirroredCoverUrl(candidate, mirrored, options?)` and `parseLocalCovers(value)` in `runtime/image-utils`.

  **The complete list of added named exports** (from `pnpm check:package-drift`; no name is removed):
  - `./runtime/freshness` (new): `EXPORT_FRESHNESS`, `exportDomainState`, `exportFreshness`, `freshnessState`, `isFreshnessDegraded`; types `Freshness`, `FreshnessDomain`, `FreshnessState`.
  - `./runtime/updater-empty`: `renderWidgetUnavailable`; type `RevealOptions`.
  - `./runtime/widget-state`: `stateNoticeHtml`, `widgetTimestampView`.
  - `./runtime/widget-rules`: `isWatchPaused`.
  - `./runtime/image-utils`: `mirroredCoverUrl`, `parseLocalCovers`.
  - `./runtime/widget-views` (new): `heartRateView`, `hydrationView`, `movementView`, `nightSummaryView`, `rangeBand`, `toNightSummaryHealth`, `MOVEMENT_DEFAULT_GOALS`, `MOVEMENT_RING_RADII`, `NIGHT_SUMMARY_EMPTY_MARK`, `SLEEP_PHASES`; types `HeartRateView`, `HydrationView`, `MovementView`, `NightSummaryView`, `RangeBand`, `RingStroke`, `SleepPhase`.
  - `./runtime/widget-markup` (new): `heartRateEmptyHtml`, `hydrationRangeHtml`, `movementEmptyHtml`.

  The package's own DOM helpers (`enterUnavailable`, `insertStateNotice`, `writeHeartRateFooter` and the header and state writers) live in `src/internal/`. No key of the exports map reaches that directory, so they are not public API.

  **Behaviour changes that consumers see.**
  - Hydration: `updateHydration` draws both target-range bands with the server's markup and positions. Before, only the server markup drew them, so a visitor with JavaScript saw no bands. The fill and the bands use the export's scale, as on the server. `initHydration` draws its bands with the same markup.
  - A paused watch (`watch.worn === false`) keeps the export's data state (`live` or `stale`) on HeartRate and MovementRings alike, on the server and in the browser. It shows the paused copy and no value. Before, a paused HeartRate card stayed `loading` in the browser while paused Movement recorded `live`. On the server, a paused export with no heart rate rendered `unavailable`, and one with no movement rendered `empty`. The HeartRate footer shows no vitals while paused, as the server renders it.
  - HeartRate in the browser follows `heartRateState`. An export with readings but no heart rate records `unavailable`. An export with no quantity at all, or a recorded 0, records `empty` with the server's empty notice. MovementRings records `empty` with its notice for no measured movement. The `.hr-empty` and `.mv-empty` styles are global, so they apply to notices that the browser writes.
  - NightSummary's browser empty state keeps the "last night" header label, as the server renders it. Before, it wrote `no data`. Its caption text is escaped.
  - MovementRings' daylight goal sits in `#mvDaylightGoal`, so the browser shows the owner's synced goal. Before, the browser kept the server default of 20 minutes.
  - `toDashboardViewModels` applies the freshness rule to a domain that the caller read without an explicit `state`. An old export renders `stale` with its "as of" time. Before, it rendered `live`. An explicit `state` still wins.
  - Bookshelf carries its `localCovers` list on the card root as `data-local-covers`, in every state, `loading` included. `updateBookshelf` reads the list from there. Before, it read per-book `data-local-cover` attributes, which a `loading` card never has, so every cover loaded from CloudFront. A cover loads from the same origin only when its exact localized path, version token included, is on the list. Nothing is stripped, decoded or guessed. Every other cover keeps its contract URL and the W6 fallback. The per-book `data-local-cover` attribute is gone. Theatre posters are unchanged.
  - `updateWorkouts` removes `is-loading` after it renders workouts.
  - `updateHeartRateFooter` writes no vitals whenever HeartRate shows no value: paused, `empty` or `unavailable` (no heart rate). Before, it wrote them in every case.
  - HeartRate's header dot takes the zone colour in the browser, as on the server. A cleared zone colour leaves no empty `style` attribute.
  - `renderWidgetEmpty` keeps the server's empty structure: the item scaffold stays, emptied and hidden, and the notice sits after the skeleton. Before, it replaced the whole `.widget-body`.
  - The loading `<noscript>` note is the only `<noscript>` a state change removes.
  - `mirroredCoverUrl` matches the contract URL's path as written. The server no longer percent-decodes the path before the match, and a same-origin absolute URL no longer matches. List mirrored covers by their URL path, percent-encoding included.
  - TheatreReviews' browser header shows the "as of" time for a stale export, as the server renders it.

## 4.0.1

### Patch Changes

- Updated dependencies [7390266]
  - @j0nathan-ll0yd/copy@3.3.0

## 4.0.0

### Major Changes

- 7b4aecb: Honest widget states and measured-versus-missing adapters (atlas decision 0160, Phase 1).

  **Breaking (why this is a major).** `adaptHealth` and `adaptSleep` no longer turn a missing
  measurement into `0`. These public output types widen from `number` to `number | null`:
  `AdaptedHealth.hydration.waterOz`, `.hydration.caffeineMg`, `.derived.totalCalories`,
  `.derived.deepPct`, `.derived.remPct`, `.derived.corePct`, `.sleepScore`, `AdaptedSleep.sleepScore`,
  `AdaptedSleep.derived.*` and `AdaptedSleep.phases.*`; `SleepPhases` fields and `formatPhase`'s input
  in `runtime/sleep` widen the same way. `quantities.exerciseTime` is absent when the export omits it.
  A missing sleep phase formats as `''` (no reading), and the phase shares are null unless the export
  carried deep, REM and core. A TypeScript
  reader of these fields must handle `null`. No compatible signature exists: keeping `number` keeps the
  fabricated zero. Known consumer impact: `j0nathan-ll0yd.github.io` passes adapter output straight to
  the design-system updaters and reads none of these fields (`src/lib/runtime/live-data.ts`).

  **Additive.** Every widget call signature from 3.x still compiles and renders as before:
  - Each live widget takes optional `state` (`live`, `stale`, `empty`, `unavailable`, `suppressed`,
    `loading`) and `generatedAt` props; the pure mapper `resolveWidgetState` serves old calls. Card roots
    carry `data-ssr-state` and `data-generated-at`; `stale` shows an absolute "as of" time.
  - New runtime modules: `runtime/widget-state`, `runtime/view-models` (`toDashboardViewModels`,
    `composeSystemLines`, `toWorkoutsList`, `toReadingArticles`). State strings come from the
    `widgets.widgetState` copy keys (`@j0nathan-ll0yd/copy` minor).
  - `revealLiveData(card, state?)` in `runtime/updater-empty`: removes notices, reveals the hidden
    scaffold, restores the header's live label and records `live` or `empty`. `renderWidgetEmpty`
    records `empty`. `theatreCardsHtml` in `runtime/updaters-theatre`.
  - `updateSystemStatus(timestamps, now?)` and `formatRelativeTime(iso, now?)` take an optional clock.
  - `runtime/widget-rules`: one state rule per widget (`heartRateState`, `movementRingsState`, …),
    called by both the templates and `toDashboardViewModels`, so a loader's reported state always
    matches `data-ssr-state`; shared formatters (`formatPositiveVital`, `formatHrv`,
    `formatTempDelta`, `formatWorkoutDuration`, `standHoursFrom`) so server and client render the
    same text. `finalize(props, rule)` in `runtime/view-models`.
  - `revealLiveData` returns `false` and writes nothing for a suppressed card unless the caller
    passes `{leaveSuppressed: true}`; `releaseSuppression(card)` and `isSuppressedCard(card)` are
    new. Every card updater skips its writes on a suppressed card. `updateSystemStatus` skips every
    System Status row the server rendered suppressed: during a hiding focus mode
    `composeSystemLines` marks each row `suppressed`, the template renders it with
    `data-ssr-state="suppressed"`, and a client update with export timestamps no longer turns it
    into ACTIVE or OFFLINE with an age. The focus gate releases a row with `releaseSuppression(row)`,
    as it does a card; the next update fills it and drops the attribute. New optional
    `SystemLine.suppressed`. The loader decides suppression page-wide, so every row is suppressed
    or none is.
  - `safeHttpsUrl` in `runtime/html-utils`.
  - Adapted events, articles and starred repos carry `datetime` (ISO) beside their relative label.

  **Behavior changes consumers see.**
  - Workouts renders visible by default.
  - Hydration renders its values in server markup; `initHydration` keeps them; the
    `data-hydration-fixture` carrier holds only hydration fields, only in `live` and `stale`.
  - Bookshelf no longer reads `node:fs`, `node:path` or `process.cwd()`. Pass `localCovers` (the
    same-origin cover paths the site mirrors) to keep same-origin covers; otherwise covers load from the
    contract URL with the W6 fallback.
  - TheatreReviews renders review cards from props; a review URL that is not `https:` renders no
    `href`.
  - DevActivityLog renders no `+0 -0` for a commit whose export lacks line counts
    (`additions`/`deletions` are optional in `DevActivityLogProps`).
  - FocusOverlay and DndOverlay take `currentFocus` and `now`; DndOverlay's five sample rows are gone.
  - MovementRings invents no sunrise, sunset or sun position when `solar` is absent.
  - SystemStatus never renders the retired Location row, in any mode.
  - Every date renders in `America/Los_Angeles`.
  - NightSummary follows the sleep export alone (owner decision Q3): its state and `generatedAt` are
    the sleep export's. The health export lends only the sleep score, and only while it is live; an
    unavailable, stale or score-less health export renders the score as `—` and never takes the card
    down. New in `runtime/widget-rules`: `nightSummaryDomain(sleep, health)` and
    `sleepScoreSource(health, healthState)` (the client path:
    `adaptSleep(sleep, sleepScoreSource(health, healthState))`).
  - NightSummary: a sleep export missing REM, deep or core has no total (`sleepDurationFormatted`
    is `''`, rendered as `—`), never a partial sum. `computeTotalSleepSeconds` returns `null` then.
  - A paused watch renders no value (the scaffold is value-free) and the paused copy renders only
    while paused.
  - The loading state shows no "live" label and a still live dot; its `<noscript>` note is visible.
  - A stale card with a missing or invalid `generatedAt` shows no label and no `data-generated-at`.
  - HeartRate renders a heart rate of 0 as `—` on server and client. Hydration's empty state shows
    the vessels with `—` and no input value.
  - StarredRepoList, DevActivityLog and Workouts render an `href` only for an https URL, on server
    and client.
  - A missing value carries no zone colour: HeartRate's BPM, zone badge and HRV render the
    no-reading mark in the default colour.
  - A stale card's "as of" time wraps onto its own header line in full; the header never sets
    `overflow: hidden`, so a focused header link's outline is never clipped.
  - The `#cardWorkouts[style*='none']` rebalance rules are removed from `layout.css`: Workouts never
    renders hidden.
  - A successful export with no items empties every collection card on the client (review M02):
    `updateWorkouts([])` shows the recovery-day state, and `updateDevActivityLog`,
    `updateStarredRepos`, `updateReadingFeed`, `updateBookshelf` and `updateTheatreReviews` show
    their empty copy. Each clears the previous items and records `empty`, from a live card or an
    unavailable one. A null or undefined result (an unreadable export) leaves every collection card
    as it is: `updateWorkouts`, `updateDevActivityLog`, `updateStarredRepos`, `updateReadingFeed`,
    `updateBookshelf` and `updateTheatreReviews` now all accept `null | undefined` and write
    nothing. Before, `updateBookshelf` and `updateTheatreReviews` threw on null, and the dev log,
    starred-repo and reading-feed updaters treated null as empty. The adapters are unchanged:
    `adaptGithubEvents`, `adaptStarredRepos` and `adaptArticles` still map a null export to `[]`.
    `renderWidgetEmpty` writes `data-state-notice="empty"`, the server's empty-notice markup.
    `updateStarredRepos` recreates its list after an empty state, so a later populated export renders.
    `updatePlaceLeaderboard` clears its rows and shows the empty copy when there are no places.
    New: `workoutsRestHtml()` in `runtime/workouts-markup`, the recovery-day markup that
    `Workouts.astro` and `updateWorkouts` share.
  - Workouts' container-query styles are global, so they also apply to cards the client renders.
  - Tinted backgrounds use `color-mix()`. NightSummary's phase pills, DevActivityCards' icons and
    DevActivityTimeline's badges appended a hex alpha to a `var()` colour, which is invalid CSS, so
    the browser dropped the tint. CommitTimeline's badge did the same to `repoColor`, which worked
    only for a 6-digit hex colour; it now works for any colour. DevActivityTimeline's badge border
    changes from the solid event colour to 25% of it (`color-mix(in srgb, <colour> 25%,
transparent)`), the alpha its `40` suffix intended.
  - DevActivityCards and DevActivityTimeline render no `+0 -0` for a commit whose export lacks line
    counts; `additions` and `deletions` are optional in their Props, as in DevActivityLog.
  - The Reading Feed client links an article title only for an https URL (`safeHttpsUrl`, as in
    the other widgets); before, a `javascript:` URL became the href.
  - TheatreReviews' header in the empty state reads `reviews` on the server and the client;
    `theatreCountLabel(totalReviews)` takes `number | null | undefined` and names a count only for
    a number. The client wrote `0 reviews` before.
  - `worstState` and `oldestGeneratedAt` are gone from `runtime/widget-state`: NightSummary no
    longer combines two exports' states, and nothing else used them.

### Patch Changes

- Updated dependencies [7b4aecb]
  - @j0nathan-ll0yd/copy@3.2.0

## 3.2.6

### Patch Changes

- Updated dependencies [a026138]
- Updated dependencies [a61a9d0]
- Updated dependencies [94e5a3d]
  - @j0nathan-ll0yd/copy@3.1.0

## 3.2.5

### Patch Changes

- Updated dependencies [73e6eb1]
  - @j0nathan-ll0yd/copy@3.0.0

## 3.2.4

### Patch Changes

- Updated dependencies [eb951fb]
  - @j0nathan-ll0yd/copy@2.0.0

## 3.2.3

### Patch Changes

- Updated dependencies [021d1dc]
  - @j0nathan-ll0yd/copy@1.1.0

## 3.2.2

### Patch Changes

- 2a91f35: Consume `@j0nathan-ll0yd/portal-contract` 2.5.0.

  The declared range moves `^2.0.0` -> `^2.5.0` in `schemas`, `fixtures` and `web`, so the
  floor is explicit rather than resolved by chance. 2.5.0 adds `minLength: 1` to eight
  identity fields across five raw export schemas (LP #297, #299) and publishes the
  WebSocket inbound envelope on a new `./websocket` subpath (LP #296).

  `packages/schemas/.contract-lock.json` is regenerated by `pnpm contract:generate`: five
  export-schema checksums and the aggregate move. The lock itself is not in the schemas
  `files[]`, so it does not ship — the regenerated `swift/WidgetModels.swift` does. That
  Swift delta is formatting only: quicktype stops merging the floored properties into
  combined `let a, b: String` declarations. Every emitted type is unchanged.

  No public export surface changed, so this is a patch on all three.

## 3.2.1

### Patch Changes

- 3b24b3a: Keep the MovementRings ring-group name true on live data, not merely present.

  `updateMovementRings` repaints the three rings and the centre `%` on every poll but never
  rewrote the `aria-label` that names them. The consuming site is `output: 'static'`, so that name
  is frozen at BUILD time while the rings underneath it are live — a screen reader announced
  build-time percentages over current rings. That is a confidently-wrong announcement, and worse
  than the missing name it replaced.

  The poll path now recomposes the `a11y.movement.rings` template from the same three percentages
  the rings draw, and sets it on the same `svg[role="img"]` element the name moved to. Rounding is
  unclamped to match the SSR composition exactly: the centre readout clamps to 100% because a ring
  cannot overdraw, but the announced value must stay truthful at 107%.

  Completes the fix started in the previous release. That one gave the ring group a name; this one
  keeps the name tracking the visual. No prop, copy, or export-surface change.

- 6af4f5f: Give the MovementRings ring group an accessible name (axe `svg-img-alt`, SERIOUS).

  `MovementRings.astro` carried `aria-label` on the `.mv-rings` wrapper while `role="img"` sat on the
  child `<svg>`. An accessible name is computed for the element that carries the role, and `aria-label`
  is prohibited on a bare `div` (implicit `role=generic`), so the rings shipped with no accessible name
  at all — a screen reader announced nothing for the widget's primary graphic. Both attributes now sit
  on the `<svg>`, matching the `.mv-sun-track` pairing in the same file.

  Rendered markup only. No prop, export-surface, or runtime change: `updateMovementRings` never read or
  wrote the label.

- f3e5abf: Widen the `@j0nathan-ll0yd/portal-contract` dependency range from `^1.0.0` to `^2.0.0`.

  Published `package.json` payload only — no source, export-surface, or rendering change. The
  widget runtime reads the `mainImage*` / `imageUrl*` URLs directly and ignores the new
  `mainImageVersion` / `imageVersion` fields.

- 1cd66ca: Make the web widget-purity lint blocking, and scan the two extensions it claimed but never received.

  `lint` now runs `eslint "src/**/*.{ts,tsx,js,jsx,astro,css}" --max-warnings 0`. Previously it was
  `{ts,tsx,js,jsx,astro}` with no `--max-warnings`, and both `no-app-module-imports` (P3) and
  `widget-props-extends-schema` (W16) were configured `warn` — so a widget importing `axios` beside a
  `.types.ts` with no schema import printed `2 problems (0 errors, 2 warnings)` and exited 0.

  Three scope gaps closed alongside the severity raise, because raising one without the others would
  have gated only part of the tree:
  - `no-app-module-imports` now matches `.astro`. A module-scope `fetch` and a data-layer import in an
    `.astro` widget's frontmatter previously produced no diagnostic at all.
  - `no-raw-hex-in-widgets` now actually receives `.css`. Its file pattern always admitted `.css` and
    its scan always read raw source text, but no config block matched a stylesheet, so ESLint never
    handed it one.
  - Both P3 and W16 are `error`.

  No behavioural change to any shipped component. Measured blast radius of the raise across the whole
  widget tree: zero existing violations.

## 3.2.0

### Minor Changes

- dc34fa3: Harden first-party cover rendering with exact URL sanitization, immutable local availability, atomic picture updates, and deterministic fallbacks.

  Move raw book-cover fixtures to a reserved non-routable host so placeholder keys cannot look like missing public CloudFront objects.

## 3.1.0

### Minor Changes

- 2b86147: Bind the image fallback to server-rendered book covers at load time.

  The SSR shell emits `data-fallback` on Bookshelf covers, but the only code that
  turned that attribute into behaviour was the live-data path (`updateBookshelf`,
  `initBookshelf`, `initTheatreReviews`). Before the live-data swap — on the
  offline PWA shell, on a slow or failing `books.json`, on any cover that 4xxs —
  the covers had no handler and stayed blank, with no placeholder.

  New export `initImageFallbacks(root = document)`: the load-time entry point for
  server-rendered covers. It arms every cover still in flight and, unlike
  `installImageFallbacks`, also recovers covers that already failed before any
  script could run — the ordering SSR always produces. It is idempotent, so the
  island, the production wrapper and a later updater may each call it.
  `Bookshelf.astro` now bundles it (fallback wiring only: no click or keyboard
  binding, so it cannot double-bind a consumer's page-level handlers).

  The same-origin refusal and the `<picture><source>` neutralization from 3.0.1
  are unchanged and apply on this path too. The live-data path is untouched.

## 3.0.1

### Patch Changes

- 79a865d: Make the first-party image fallback actually paint. 3.0.0 shipped it broken two ways, and neither could be seen by the tests that existed.

  `installImageFallbacks` set `img.src` to the placeholder but left the enclosing `<picture>`'s `<source>` candidates in place. Inside a `<picture>` the browser resolves from the first matching `<source>` and only consults `<img src>` when none matched, so a cover whose AVIF source 404s kept re-resolving to the dead source and painted a broken glyph while `img.src` silently held the correct value. `pictureWithAvif()` emits exactly that shape, which is what the Bookshelf renders. The handler now removes the sibling `<source>` elements before swapping the src.

  `src/assets/no-cover.svg` was not well-formed XML. Its comment contained `--` (in the token names `--lg-card-background` and friends), which XML forbids, so no browser could decode it -- the fallback target was itself unrenderable. The comment is reworded and now says why.

  Both were invisible to the suite. Every `installImageFallbacks` test used a bare `<img>`, never the `<picture>` markup the same module generates, and jsdom performs no `<picture>` source selection at all -- with a dead `<source>` still in the DOM it reports `img.src` as the placeholder and passes. `check-placeholder-asset.test.mjs` asserted the asset's identity and path but never that the bytes decode as an image, and a malformed SVG still serves 200 with the right Content-Type.

  Three gates close that, each verified to fail on the unfixed code:
  - `tests/browser/image-fallback.browser.test.ts` renders in real Chromium and asserts on `naturalWidth` and `currentSrc` -- the placeholder paints, the dead source does not survive. Runs in CI as the new `web-browser-runtime` job, on the playwright-labelled runner because the existing web job has no browser binaries.
  - The jsdom suite gains the `<picture>` cases it never had.
  - `check-placeholder-asset.test.mjs` rejects `--` inside an XML comment.

  No API change. Consumers on 3.0.0 need only the version bump; the `/images/no-cover.svg` copy requirement is unchanged, but re-copy the asset because its bytes changed.

## 3.0.0

### Major Changes

- d62c027: Reading widgets render book covers and theatre posters from the real export contract fields, and no image path can reach a third-party host (atlas decision 0086).

  The books export emits `mainImage`, `mainImageThumb`, `mainImageCard`, `mainImageAvif`, `mainImageThumbAvif` and `mainImageCardAvif`, all first-party CloudFront. `Bookshelf.astro` read `cover*` instead — names no export has ever emitted — so its AVIF sources were dead and every cover fell through to a hard-coded `m.media-amazon.com` ASIN URL. That hard-code is why the production site still requested images from Amazon. All four call sites are removed; a missing or broken cover now resolves to a committed same-origin placeholder.

  Breaking for consumers:
  - `BookEntry` (`widgets/reading/Bookshelf.types.ts`) and `AdaptedBookEntry` (`runtime/adapters.ts`) carry the contract's own `mainImage*` names in place of `cover*`. Pass the export fields straight through.
  - `imgFallbackAttrs(src)` takes one argument. The fallback target is always the placeholder, so the previous `originalUrl` argument is gone.
  - The `data-book` payload the Bookshelf writes uses `mainImage` / `mainImageAvif`; BookModal reads those.
  - **Consumers must serve the placeholder.** Copy `@j0nathan-ll0yd/web/assets/no-cover.svg` to `public/images/no-cover.svg`. Without it the fallback 404s. The path is `PLACEHOLDER_IMAGE_SRC` in `runtime/image-utils.ts`.

  `installImageFallbacks` now refuses a `data-fallback` that is not same-origin and substitutes the placeholder, so stale SSR markup from an older build cannot reintroduce a third-party request. `dashboard-books.schema.json` gains the six nullable image fields it previously forbade, which is what lets the SSR shell render a real cover at all.

## 2.1.1

### Patch Changes

- 6828871: Audit comment discipline in published web sources.

## 2.1.0

### Minor Changes

- f61cdf1: Fix portfolio Lighthouse regressions in the production reading widgets: keep
  bookshelf children semantic list items, mark linked theatre posters decorative,
  and attach image fallbacks at runtime without CSP-blocked inline handlers.

  Raise the web caption, metadata, and body typography floors to 0.75rem (12px)
  while retaining fluid clamps and the existing upper bounds.

### Patch Changes

- Updated dependencies [f61cdf1]
  - @j0nathan-ll0yd/tokens@2.2.1

## 2.0.4

### Patch Changes

- Updated dependencies [27dfe68]
  - @j0nathan-ll0yd/copy@1.0.2

## 2.0.3

### Patch Changes

- Updated dependencies [2506ac6]
  - @j0nathan-ll0yd/tokens@2.2.0

## 2.0.2

### Patch Changes

- 514314a: Adopt repo-wide Prettier formatting with a blocking CI `format:check` gate (issue #54). Generated artifacts (`packages/copy/dist/*.zod.ts`, schemas `dist` types, `fixture-map.json`, widget schemas, DTCG audit) are now formatted in-generator so they are readable and diff-friendly. This is a formatting-only change — no token values, schema shapes, copy strings, or public APIs change.
- Updated dependencies [514314a]
  - @j0nathan-ll0yd/copy@1.0.1
  - @j0nathan-ll0yd/tokens@2.1.1

## 2.0.1

### Patch Changes

- Updated dependencies
  - @j0nathan-ll0yd/tokens@2.1.0

## 0.1.0

### Minor Changes

- Initial release of the Lifegames Design System. Includes DTCG tokens (CSS, Swift, JSON), 56 cross-platform widgets (Astro + SwiftUI), web/iOS primitives, runtime data clients, and documentation scaffold.

### Patch Changes

- Updated dependencies
  - @j0nathan-ll0yd/tokens@0.1.0
