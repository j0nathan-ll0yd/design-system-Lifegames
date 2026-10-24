# @j0nathan-ll0yd/copy

## 4.3.1

### Patch Changes

- cfc7966: `llm.developers.rateLimitBody` states the `/api/v1` facade's fail-open behavior (website #395 review, finding M2). Before, the value promised the `RateLimit` field on every export response. Now:
  - `RateLimit-Policy` is on every export response.
  - `RateLimit` is on every response the counter counted.
  - When the counter is unavailable, the request is still served and `RateLimit` is absent.

  The limit (60 requests per minute per client) and `Retry-After` on a 429 are unchanged. The key name and `_meta.usage` are unchanged.

## 4.3.0

### Minor Changes

- c399c72: New `identity.organization` group: the facts for a schema.org `Organization` node for Lifegames in the website JSON-LD (owner decision 2026-10-24). The keys are `name`, `description`, `contactType`, `contactEmail`, `poBox`, `locality`, `region`, `postalCode`, and `country`. The website maps them into the node `name`, `description`, `email`, `contactPoint`, and a `PostalAddress` with `postOfficeBoxNumber` and no `streetAddress`. There is no `url` key: the node url is the site URL constant, because the mail domain does not resolve.

  `contactEmail` is a purpose-made, revocable alias. Both the Organization and the Person contact point carry it (owner ruling 2026-10-24). It is not the personal address, which stays obfuscated on `/contact` (owner ruling 2026-10-12). The agent-readiness tests hold the alias unequal to `person.email` and allow no other identity leaf to name it. `contactType` equals `person.contactType`, and a test holds the two equal. The PO Box is the business mailing address, and both the Organization and the Person `address` carry it. `person.email` no longer lists the Person contact point among its uses; its value is unchanged.

  Additive, hence minor, as for the `identity.navigation` group in 4.1.0. Swift gains `public struct IdentityOrganization` and an `Identity.organization` property, so the memberwise `Identity.init` takes one more argument. No Swift code calls it; `CopyLoader` decodes the bundled JSON.

## 4.2.0

### Minor Changes

- e975d51: Developers-page copy for the `/api/v1` facade (atlas decision 0158 follow-on, plan is-agentic-api-v1 step 1), and the landmark name for the new site footer nav.

  Added (llm, 17 leaves; the namespace grows from 203 to 220), all under `developers`:
  - `apiBaseNote`: the API base `{siteUrl}/api/v1`, and `{siteUrl}/openapi.json` as the list of its nine export paths.
  - `errorsHeading`, `errorsBody`: every 4xx and 5xx under `/api/v1`, and the 404 for any other unknown `/api` path, is an RFC 9457 problem document (`application/problem+json`) with `type`, `title`, `status`, `detail` and `instance`; the `type` URI points at a fragment of the page.
  - A Title and a Detail for each problem type: `problemNotFound*`, `problemMethodNotAllowed*`, `problemRateLimited*`, `problemFocusSuppressed*`, `problemUpstreamUnavailable*`. Each Detail is a static sentence. `problemMethodNotAllowedDetail` is method-neutral: the `/api/v1` paths (`Allow: GET, HEAD`) and the POST-only `/api/csp-report` route (`Allow: POST`) both answer it, and it points at the `Allow` header. Variable data, such as the valid paths and the retry interval, travels in RFC 9457 extension members and response headers.
  - `versioningHeading`, `versioningBody`: path versioning, additive-only change within a version, a 90-day support window with `Deprecation`, `Sunset` and `Link rel="successor-version"`, and a portal-contract major that removes or retypes an export member as the trigger.
  - `rateLimitHeading`, `rateLimitBody`: 60 requests per minute per client, `RateLimit-Policy` and `RateLimit` on every response from an export path, and `Retry-After` on a 429.

  Changed: `developers.apiBody` names the `/api/v1` base and points at the new sections. `developers.focusBody` adds the `/api/v1` answer, a 503 focus-suppressed problem document, beside the CloudFront host's 403. `developers.lastModified` is `2026-10-24`. `developers.apiSuppressedResponse` is status-neutral and channel-neutral: it now adds the `Retry-After` retry hint, and its `_meta` names the facade's 503 and the OpenAPI Suppressed response instead of the CloudFront 403.

  Added (identity, 1 leaf): `navigation.siteNavLabel` ("Site"), the accessible name of the web package's `SiteFooterNav` landmark.

  Additive, hence minor. Swift gains the matching properties on `LlmDevelopers` and `IdentityNavigation`, so their memberwise initializers take more arguments. No Swift code calls them; `CopyLoader` decodes the bundled JSON.

## 4.1.0

### Minor Changes

- d4ed055: New `identity.navigation.backLink` ("Back to dashboard"), a page-neutral back link (atlas decision 0158 step 5b). The website's text pages, `/offline` and `/500` read `identity.privacy.backLink`, a privacy-page key, as a generic link back to the dashboard. The new `identity.navigation` group gives that link a key no page owns, with the same text.

  `identity.privacy.backLink` stays, with the same value, and is deprecated: copy 5.0.0 removes it (DEPRECATION.md, "Copy Keys"). The deprecation reaches every generated artifact: `deprecated: true` in `dist/identity.flat.schema.json`, an `@deprecated` JSDoc on `Identity['privacy']['backLink']`, a `.describe()` in `dist/identity.zod.ts`, and a doc comment in Swift (no `@available` attribute: it would raise compiler warnings inside the generated code). The copy build now exits 1 on a deprecated key that does not name a live replacement in its own namespace, and on a deprecated group or object-valued leaf.

  Additive, hence minor, as for the `widgets.widgetState` group in 3.2.0. Swift gains `public struct IdentityNavigation` and an `Identity.navigation` property, so the memberwise `Identity.init` takes one more argument. No Swift code calls it; `CopyLoader` decodes the bundled JSON.

## 4.0.1

### Patch Changes

- 22e0dfe: The hosting strings name Cloudflare Workers, not Cloudflare Pages (atlas decision 0160 Step 1.7).
  - `identity.humansTxt.hosting`: "Cloudflare Pages" becomes "Cloudflare Workers".
  - `llm.txt.technologyHosting`: "- Hosting: Cloudflare Pages via GitHub Actions" becomes "- Hosting: Cloudflare Workers via GitHub Actions".
  - `llm.mcp.stackHosting`: "Cloudflare Pages via GitHub Actions" becomes "Cloudflare Workers via GitHub Actions".

  The deploy path stays GitHub Actions: the site's `deploy.yml` runs `wrangler deploy` after the move (decision 0160 Step 3.5).

  The privacy page's "Last updated" date reads October 2026 (owner decision 2026-10-14).
  - `identity.privacy.lastUpdated`: "July 2026" becomes "October 2026". Reader: website `src/pages/privacy.astro:30`.
  - `identity.privacy.lastModified`: "2026-07-30" becomes "2026-10-14", the date of this change to the page text. It is the machine form of the same date (the sitemap `<lastmod>` for `/privacy`), and the content-dates test holds `lastUpdated` to its month and year. No repository reads it yet.

  **PATCH, not minor or major.** Five string values change. No key is added, removed, or renamed, and no exported type changes. GOVERNANCE §6: patch is "no API changes". Precedent: 27dfe68 changed three `llm.txt` link values as a patch.

  **Timing.** The hosting values describe the site after it moves to Workers. Do not bump to this release before that move. The privacy date ships in the same release, so it reaches the website with that bump too:
  - Website: take it in the Workers PR (decision 0160 PR A, Step 3.1), so `humans.txt` and the WebMCP manifest change with the platform. The website pins copy exactly (3.3.0), so it does not take this release by accident. The bump also crosses the 4.0.0 major: take it only after website PR #348 (copy 4.0.0, which fills the `{astroMajor}` template in `scripts/generate-webmcp.mjs`) lands, or PR A must handle that template itself. Regenerate the committed `public/js/webmcp.js`; `pnpm check:webmcp` fails otherwise.
  - mantle-LifegamesPortal: take it only right after the production cutover (Step 8.7), in a PR that also updates `test/llm-content/__snapshots__/llms.txt` line 37. LP pins copy exactly (3.0.0), so the bump also crosses 4.0.0: LP PR #379 must merge first, because LP `main` still reads the keys 4.0.0 removed (`render.ts:185` `link('endpointHealth')`, `llms-txt.eta:24`).
  - iOS: no change. No iOS code reads these keys.

  The authored profile content left `@j0nathan-ll0yd/fixtures` in 3.3.0 (the `profile` namespace plus `identity.person`). This release does not move it again.

## 4.0.0

### Major Changes

- 6a654d1: agent readiness: add the copy for the MCP server, the about, contact, and developers pages, and the markdown 404 body. Remove the seven orphaned A2A leaves (atlas decision 0158).

  Added (identity, 29 leaves; the namespace grows from 61 to 90):
  - `person.email`, `person.contactType`, `person.addressLocality`, `person.addressRegion`, `person.addressCountry` — the Person JSON-LD `contactPoint` and `address`. The email is the `security.txt` contact. The address parts split the existing `person.location`.
  - `about.*` (10) — title, meta description, `lastModified`, and four headed sections for `/about`. The background section reuses `person.longBio`.
  - `contact.*` (13) — title, meta description, `lastModified`, intro, three channel labels and notes, and the security-report note for `/contact`.
  - `privacy.lastModified` — `2026-07-30`, the date the privacy text last changed (commit 1a23ee2, PR #148).

  Each `lastModified` is a machine-readable ISO-8601 date for the website's sitemap `<lastmod>`.

  Added (llm, 37 leaves):
  - `txt.linkSourceRepo`, `txt.whenToUseHeading`, `txt.whenToUseBody`, `txt.whenToUseMcp`, `txt.whenToUseFull`, `txt.whenToUseApi`, `txt.whenToUseDevelopers` — the llms.txt "When to use" section and the source-repository link.
  - `mcp.serverTitle`, `mcp.serverCardDescription` — the SEP-2127 server-card title and short description. A test holds the description to the SEP-2127 limit of 100 characters.
  - `developers.*` (21) — title, meta description, `lastModified`, intro, the OpenAPI description of the focus-suppression 403 (`apiSuppressedResponse`), and a heading and body for each of eight machine interfaces. The focus section names both answers an agent meets: 403 from the data host for each JSON export except `focus.json`, and 503 with `Retry-After` from the on-domain routes.
  - `mcp.coarsenedBandDesc` — the `get_data_sources` description for health, sleep, and workouts. Those entries point at llms-full.txt, not the raw exports.
  - `notFound.*` (6) — heading, paragraph, and four links for the markdown 404 body.

  Changed values (beyond the point-in-time rewording below):
  - `mcp.serverDescription` and `agentDiscovery.aiCatalogMcpDescription` now describe the real read-only MCP server at `/mcp`. The "via CloudFront" claim is gone: the CloudFront distribution answers an MCP `initialize` with an HTML 403.
  - `mcp.stackFramework` is now the template `Astro {astroMajor}.x (…)`. The website fills `{astroMajor}` from its installed `astro` version, so the value no longer goes stale. The old literal said "Astro 6.x"; the website runs Astro 7.

  Point-in-time health phrasing removed from agent-facing copy. Policy: SKILL.md decision 4 and atlas decision 0096. No raw point-in-time health value reaches an LLM channel. Health, sleep, and workouts reach agents only as the coarsened bands in llms-full.txt. No trend or multi-day window exists (atlas decision 0142 D2), so no reword asks for one.
  - `agentDiscovery.aiCatalogMcpQueries[0]`: "What is Jonathan Lloyd's current heart rate?" becomes "What range does Jonathan Lloyd's resting heart rate fall in?".
  - `mcp.toolGetDataSources`: no longer says "Fetch these URLs for real-time data".
  - `mcp.serverDescription`, `mcp.serverCardDescription`, `agentDiscovery.aiCatalogMcpDescription`, `developers.mcpBody`, and the `txt.whenToUseMcp` notes: health is coarsened bands only, never "live" data.
  - `mcp.agentSkillDescription` and `dashboard.datasetDescription`: drop "live biometric".
  - A test now fails any machine-facing llm sentence that pairs a health term with a point-in-time word, and any catalog query that asks for a health trend.

  Fixed: `privacy.lastUpdated` changes from "June 2026" to "July 2026". Commit 1a23ee2 (PR #148, 2026-07-30) removed "location check-ins" from `privacy.dataDisplayed`. Narrowing the data displayed is a material change, and `privacy.changes` promises an updated date for one. The page has shown a stale date since 2026-07-30. A test now holds every `lastUpdated` to the month and year of its section's `lastModified`.

  Removed: `agentDiscovery.agentCardDescription`, `agentDiscovery.agentCardSkillName`, `agentDiscovery.agentCardSkillDescription`, `agentDiscovery.agentCardSkillExamples`, `agentDiscovery.aiCatalogA2aName`, `agentDiscovery.aiCatalogA2aDescription`, `agentDiscovery.aiCatalogA2aQueries`. The A2A agent card is a settled decline. A grep of the website, the backend, the iOS app, and this repository outside the copy package finds no reader.

  Removed (owner decision 2026-10-12: no LLM-facing file links the raw `health.json`, `sleep.json`, or `workouts.json`; this covers MCP, WebMCP, SKILL.md, llms.txt, and llms-full.txt, while `/developers` and `/openapi.json` stay linkable): `txt.endpointHealth`, `txt.endpointSleep`, `txt.endpointWorkouts`, `full.streamHealth`, `full.streamSleep`, `full.streamWorkouts`. Their only reader is mantle-LifegamesPortal (`llms-txt.eta`, `render.ts` `buildLlmsTxtDoc`, `llms-full.eta`), and its PR #379 removes those references. The `mcp.dsHealth*`, `mcp.dsSleep*`, and `mcp.dsWorkouts*` rows stay: the website still names these sources in `/openapi.json` and `get_data_sources`.

  Reworded with the removal:
  - `full.bodyAggregateNote` no longer says "For dated raw values, see the JSON endpoints linked in the Streams section". It points to `{siteUrl}/developers` for the public data API.
  - `txt.canonicalBody` no longer calls the remaining links "these live JSON sources", as if they were the complete list. It says health, sleep, and workouts reach agents only as coarsened bands in llms-full.txt.

  A test now fails any txt or full leaf that names a raw health export. The endpoint and stream families equal each other, and the data-source family equals them plus exactly the three excluded exports.

  **MAJOR, not minor.** Three breaking changes. First, the export-surface rule compares named exports per subpath, so it sees no break: no export name is removed. Under semver-ts.org, deleting seven properties from the exported `Llm['agentDiscovery']` type breaks any consumer that reads them. Same reasoning as 3.0.0. Second, `mcp.stackFramework` changes from a literal to a template. A consumer that emits it verbatim ships the literal `{astroMajor}`. Third, six more properties leave the exported `Llm['txt']` and `Llm['full']` types (the raw health links).

  Consumer impact: one website code change and one backend change. `scripts/generate-webmcp.mjs:133` emits `mcp.stackFramework` verbatim and must substitute `{astroMajor}` when the website bumps. The website pins 3.0.0 exactly and reads none of the removed keys. The backend must drop its nine references to the six removed health keys in the same change that bumps to 4.0.0 (mantle-LifegamesPortal PR #379). `render.ts` fails typecheck on a leftover `link('endpoint…')`. A leftover `it.c('stream…')` in `llms-full.eta` makes `mf1` throw at compose time, so neither failure is silent. Each bumps in its own change. iOS needs no change: no iOS code reads `agentDiscovery`, and the new `IdentityAbout`, `IdentityContact`, `LlmDevelopers`, and `LlmNotFound` structs collide with no iOS type.

  Regenerated: `dist/identity.*`, `dist/llm.*`, `Sources/LifegamesCopy/Identity.generated.swift`, `Sources/LifegamesCopy/Llm.generated.swift`, and the bundled `Sources/LifegamesCopy/Resources/{identity,llm}.en-US.json`.

## 3.3.0

### Minor Changes

- 7390266: New `profile` namespace: the authored identity content of the dashboard's IdentityCard and
  BioTerminal that `identity` does not already hold (atlas decision 0160 Step 1.7).
  - `profile.tagline`: the identity card's subtitle.
  - `profile.terminal.{gpg, stack, uptime, philosophy, interests}`: the bio terminal's command blocks,
    in display order. Each block is its prompt line (`$ `) then its output lines (`→ `); a consumer
    adds a blank line between blocks and the closing cursor.

  The name, title, location, profile links and bio stay in `identity.person` (`name`, `jobTitle`,
  `location`, `sameAs`, `flavorBio`); `profile` does not repeat them. Every string is byte-identical
  to the `@j0nathan-ll0yd/fixtures` profile baseline it replaces. No coordinates and no avatar path:
  location data is out of scope (decision 0160 D14), and the avatar is a site asset, not copy.

  New: `profile` and its `ProfileCopy` type from the package root, `./profile.flat.json`,
  `./profile.zod` (`profileSchema`), and in Swift the `ProfileCopy` and `ProfileTerminal` structs with
  `CopyLoader.loadProfile()` and `CopyLoader.profile`.

## 3.2.0

### Minor Changes

- 7b4aecb: New `widgets.widgetState` copy keys for the honest widget states (atlas decision 0160):
  `noReading`, `unavailable`, `suppressed`, `asOf` (ICU MF1 `{time}`) and `needsJavaScript`. Web and
  Swift read them from here; no platform holds its own copy of these strings (GOVERNANCE P3.1).

  The Swift struct for the group is `WidgetStateCopy` (a group `title`): the bare key would generate
  `WidgetState`, which shadows `LifegamesComponents.WidgetState<T>`. The build now fails on a copy
  struct whose name the Swift code beside it uses: a public type declared in another design-system
  module, or a type that a module able to see `LifegamesCopy` references unqualified, framework
  types such as SwiftUI's `Color`, `Text` and `View` included. Both sets are derived from `Sources`
  and the target graph in `Package.swift`, never hand-listed.

## 3.1.0

### Minor Changes

- a026138: bookshelf: add the pending-sync strings for optimistic book edits (atlas decision 0151, Phase 2).

  Three additive keys under `app.bookshelf.pending`, consumed on iOS as
  `CopyLoader.app.bookshelf.pending.*`:
  - `rowBadge` — "Waiting to sync". Per-row badge on a book whose edit is queued locally.
  - `pill` — `{count, plural, one {# change waiting to sync} other {# changes waiting to sync}}`.
    ICU MF1 plural; the consumer renders it only while at least one write is queued, so no `=0`
    clause. Same authoring pattern as `location.placeRename.result`.
  - `stuck` — "Still waiting to sync. Check your connection, or your token in Settings."
    Escalation line once a queued edit has waited past the stuck threshold: states the fact,
    then the two things worth checking.

  Queued transient writes stay quiet states, never alerts, and the wording names the action in
  progress rather than the bare word "offline". Additive only — no existing key changed, hence
  minor. Regenerated: `dist/app.flat.json`, `dist/app.flat.schema.json`, `dist/app.ts`,
  `dist/app.zod.ts`, `Sources/LifegamesCopy/App.generated.swift`, and the bundled
  `Sources/LifegamesCopy/Resources/app.en-US.json`.

- 94e5a3d: settings: add the token-verification strings for the Settings API section (atlas decision 0153, Phase 5).

  Four additive keys under `app.settings.tokenVerification`, consumed on iOS as
  `CopyLoader.app.settings.tokenVerification.*`:
  - `verify` — "Verify". Button beside the token row; fires `GET /health/ping` with the saved
    bearer token.
  - `valid` — "Token verified." Success line; states the fact and stops.
  - `invalid` — "Token rejected. Paste a fresh one." 401: the token is wrong — permanent until
    the user acts on the token, so the line names the next action ("paste", matching
    `tokenPlaceholder` vocabulary).
  - `unreachable` — "Could not reach the server. Try again when you are online." No response:
    transport failure, token unjudged, so the wording never blames the token. "Server" not
    "backend" — app copy already says Server (`serverLabel`, `simActive`).

  A wrong token is the one failure the offline outbox can never heal — it looks exactly like
  being offline until the user can verify it. The invalid/unreachable split keeps the two
  failure classes distinct in the same result slot. Additive only — no existing key changed,
  hence minor. Regenerated: `dist/app.flat.json`, `dist/app.flat.schema.json`, `dist/app.ts`,
  `dist/app.zod.ts`, `Sources/LifegamesCopy/App.generated.swift`, and the bundled
  `Sources/LifegamesCopy/Resources/app.en-US.json`.

### Patch Changes

- a61a9d0: Repoint bookshelf pending-sync metadata to atlas decision 0153 (the 0151 number was lost to a same-day collision). Usage and description annotations only; no string values change.

## 3.0.0

### Major Changes

- 73e6eb1: llm slice: remove the four dead `location.json` copy leaves (atlas decision 0142 D1).

  Removed: `txt.endpointLocation`, `full.streamLocation`, `mcp.dsLocationName`, `mcp.dsLocationDesc`.
  The llm namespace drops from 183 leaves to 179 (txt 32 + full 102 + dashboard 3 + mcp 29 +
  agentDiscovery 13).

  Why: `location.json` does not exist at origin. `https://d1pfm520aduift.cloudfront.net/location.json`
  answers HTTP 403 AccessDenied with 111 bytes, byte-identical to the response for a deliberately
  nonexistent key, while `focus.json` answers `{"currentFocus":"None"}` — so no Focus window is
  suppressing it. This is dead copy, not a rendered-output bug: the live `llms.txt` already advertises
  exactly nine endpoints and never listed `location.json`, and the live `server-card.json` and
  `webmcp.js` carry zero occurrences of it. No consumer references any of the four keys.

  `full.profileLocation` (`- **Location**: {profileLocation}`) is KEPT. It is the human profile line,
  not an endpoint.

  **MAJOR, not minor.** The estate's export-surface rule
  (`@j0nathan-ll0yd/estate-contracts/export-surface`) compares NAMED EXPORTS per subpath, so it sees no
  break here — no export name is removed. That name-set delta is a floor, not a verdict: it
  structurally cannot see a type's internal shape. Under semver-ts.org, which that same rule cites as
  normative, deleting `Llm['txt']['endpointLocation']`, `Llm['full']['streamLocation']`,
  `Llm['mcp']['dsLocationName']`, and `Llm['mcp']['dsLocationDesc']` breaks every consumer of those
  keys at compile time and at runtime. The same reasoning classified 2.0.0.

  Also adds `packages/copy/tests/llm-artifact-sync.test.ts`, which holds the three families that
  describe the same CloudFront artifacts — `txt.endpoint*`, `full.stream*`, and `mcp.ds*Name`/`ds*Desc`
  — to one artifact set, so a future endpoint cannot be added to one family and forgotten in the
  others. Keyed on the `<name>.json` artifact, never on key spelling: `endpointStarred`,
  `streamStarred`, and `dsStarredReposName` all describe `github-starred-repos.json`.

  Corrects stale prose in `schema/llm.schema.json` (the namespace has five groups, not two; the
  Eta-template value rule covers `txt` and `full` only; the identical-`$defs` list omitted
  `errors.schema.json`) and in `schema/permissions.schema.json` (its identical-`$defs` list omitted
  `app.schema.json`).

  ***

  llm slice: stop claiming a seven-day window and a workout habit (atlas decision 0142 D2).

  Ten leaves carried claims the source data cannot support. The health export stores ONE dated value
  per metric — `mantle-LifegamesPortal/src/schemas/health.ts:78` is
  `healthQuantitySchema = z.object({type, date, value, unit})`, and `src/lib/llm-content/aggregate.ts:81`
  reads exactly one entry (`health.quantities['restingHeartRate']`) and rounds `entry.value`. There is
  no series and nothing to average across days, so "7-day aggregate" was false everywhere it appeared.
  `aggregate.ts:259` derives workout activity types from the distinct types in the latest export capped
  at three, so "Typical activity types" asserted a habit from one export.

  Reworded:
  - `full.intro`, `txt.liveBody` — body metrics come from the latest export, summarised and never
    averaged over a window.
  - `full.bodyAggregateNote` — each body metric is a single value from the latest export; values are
    summarised as ranges, shares, or goal status rather than published raw.
  - `full.cardioHeading`, `full.sleepHeading`, `full.activityHeading`, `full.workoutsHeading`,
    `full.hydrationHeading` — `(7-day aggregate)` becomes `(latest export)`. The `###` affix is
    retained: the `full` group ships rendered markdown on purpose, unlike the `txt` group.
  - `full.workoutsActivityTypes` — `Typical activity types` becomes `Activity types in this export`.
  - `mcp.dsHealthDesc` — `(7-day aggregates)` becomes `(latest export, summarised)`. This leaf was not
    on the original work list; it carried the same false claim and is published to
    `.well-known/mcp/server-card.json`.

  `(latest export)` is the canonical spelling estate-wide, set by LP PR #356 (`aggregate.ts:272` emits
  `${n} workouts (latest export)`, its docblock recording `(recent)` as the former form). Every leaf
  above uses it for this idea.

  `full.bodyAggregateNote` loses its `{bodyEndingDate}` placeholder. The reason is REDUNDANCY, not a
  false value: LP binds the same `view.body.dataAsOf` to `bodyDataAsOf`, and `full.bodyDataAsOf` already
  publishes it one line earlier as `**Data as of:** {bodyDataAsOf}`. The note was restating a date the
  document states directly above it. LP's `bodyEndingDate` binding is now unreferenced by copy;
  retiring it is LP's cleanup, not this package's, and it rides the copy-bump PR rather than this one.

  The leaf count is unchanged at 179 — these are value edits, not removals. `_meta.lastReviewed` is
  bumped to 2026-09-22 on exactly the ten edited leaves, per VOICE.md.

  Also adds `packages/copy/tests/llm-claim-honesty.test.ts`, which asserts the PROPERTY rather than the
  replacement sentence: no llm leaf may name a multi-day span (`N-day`, `weekly`, `per week`,
  `multi-day`) or assert a habit (`typical`, `usually`, `habitual`, `on most days`). The nouns "window",
  "average", and "aggregate" stay legal on their own, because honest copy has to be able to DENY a
  window and a denial contains the noun it denies.

  ***

  identity: add `person.rolePhrase`; llm: bind it from `full.systemFraming`.

  `full.systemFraming` hardcoded "an engineering director and backend engineer" — identity facts
  restated inside llm copy, which drifts the moment identity changes.

  New leaf `identity.person.rolePhrase` = `engineering director and backend engineer`. Lowercase on
  purpose: its only consumer drops it mid-sentence, where title case reads "an Engineering Director".
  `full.systemFraming` now binds `{profileRolePhrase}`; nothing else in that sentence changed.

  `identity.person.jobTitle` is unchanged and remains the canonical short title for the Person JSON-LD
  and the profile line. `{profileTitle}` was rejected as the binding on two counts: it is title case,
  and it names only one of the two roles, so binding it would silently drop "and backend engineer" from
  the published framing. `person.longBio` opens with the same two roles but as a capitalised full
  sentence, so it cannot be spliced mid-sentence either — hence a dedicated field.

  **Consumer action required before adopting this version.** `mantle-LifegamesPortal` must bind
  `profileRolePhrase` from `identity.person.rolePhrase` in `src/lib/llm-content/profile.ts`, `view.ts`,
  and `render.ts`. Until it does, MF1 renders the literal `{profileRolePhrase}` into the published
  `llms-full.txt` and `/index.md`.

  `identity` goes from 60 leaves to 61 (person 20 → 21). `llm` stays at 179 — `systemFraming` is a value
  edit, not a leaf addition.

  Adds `packages/copy/tests/llm-identity-binding.test.ts`: the role phrase must be lowercase, every
  `full.systemFraming` placeholder must resolve to an `identity.person` leaf under the `profile<Field>`
  convention, substituting the value must render `— an <phrase>.`, and no llm leaf may restate any
  substantial `identity.person` value verbatim.

## 2.0.0

### Major Changes

- eb951fb: llm slice: ship link and heading fields, not rendered markdown (atlas decision 0128 P3a).

  The `txt` group's 18 link leaves change shape from a rendered markdown bullet
  (`"- [Site]({siteUrl})"`) to `{label, url, notes?}`, and its 7 heading leaves drop the `#` / `##`
  affix and ship the bare section name. The words are byte-identical: every migrated leaf re-renders
  to its previous string exactly. Only the container moved.

  Why the round trip existed: `mantle-LifegamesPortal`'s llms.txt codec models the document
  structurally and re-adds every affix, so `render.ts` regex-parsed each rendered leaf back into
  `{label, url, notes}` and stripped each heading affix before use. The fields were always the
  information and the markdown always a projection. Copy now ships the fields.

  Scope: the `full` group is deliberately untouched. Its consumer renders it through Eta verbatim and
  never re-parses it, so its markdown affixes are the copy, not a projection of it.

  Also adds the `./package.json` export subpath, letting a consumer resolve the package manifest
  directly instead of anchoring on a data file.

  **MAJOR, not minor.** The estate's export-surface rule
  (`@j0nathan-ll0yd/estate-contracts/export-surface`) compares NAMED EXPORTS per subpath. It measures
  this change as `minor` — `pnpm check:package-drift` reports `export added: ./package.json` and
  `surface bump: requires minor` — because no export name is removed and no `value` degrades to a
  `type`. That name-set delta is a floor, not a verdict: it structurally cannot see a type's internal
  shape. Under semver-ts.org, which that same rule cites as normative, retyping
  `Llm['txt']['linkSite']` from `string` to an object is a breaking change to every consumer of those
  25 keys, at compile time and at runtime. The sole
  llm-slice consumer is `mantle-LifegamesPortal`, which adopts in lockstep once this publishes. The
  `full`, `dashboard`, `mcp`, and `agentDiscovery` groups and every other namespace are unchanged.

## 1.1.0

### Minor Changes

- 021d1dc: Add `app.bookshelf.alerts.kindleEditionRejected` — the message the Life Portal bookshelf shows when the ASIN detected in the Amazon browser is a Kindle edition.

  A Kindle ASIN has no ISBN and no Open Library record, so metadata enrichment can never succeed for it: the book lands in the catalog with its ASIN as the title, `Unknown` as the author, and no cover. The string names the recovery step (switch the format to a print edition) rather than the failure.

## 1.0.2

### Patch Changes

- 27dfe68: Author the llms.txt About-section links as markdown links, not bare URLs.

  `llm.txt.linkSite`, `llm.txt.linkGithub`, and `llm.txt.linkLinkedin` emitted
  `- Site: {siteUrl}` style list items. llms.txt requires link list items, so the
  served artifact failed its own structural rule — a producer contract test in
  mantle-LifegamesPortal caught it. The new form matches the conforming siblings
  in the same namespace (`liveFullDump`, `endpointHealth`, and the rest):
  - `- Site: {siteUrl}` -> `- [Site]({siteUrl})`
  - `- GitHub: {profileGithub}` -> `- [GitHub]({profileGithub})`
  - `- LinkedIn: {profileLinkedin}` -> `- [LinkedIn]({profileLinkedin})`

  Blast radius: the only consumer of these three `txt`-namespace keys is
  `src/lib/llm-content/templates/llms-txt.eta:9-11` in mantle-LifegamesPortal. A
  sweep of design-system-Lifegames, j0nathan-ll0yd.github.io, ios-LifegamesPortal
  and mantle found no other reader. The identically-named keys in the `full`
  namespace feed `llms-full.eta` under a different heading and a different
  structural rule set; they are unchanged.

  Values only — no key, type, or export-surface change, so patch.

## 1.0.1

### Patch Changes

- 514314a: Adopt repo-wide Prettier formatting with a blocking CI `format:check` gate (issue #54). Generated artifacts (`packages/copy/dist/*.zod.ts`, schemas `dist` types, `fixture-map.json`, widget schemas, DTCG audit) are now formatted in-generator so they are readable and diff-friendly. This is a formatting-only change — no token values, schema shapes, copy strings, or public APIs change.
