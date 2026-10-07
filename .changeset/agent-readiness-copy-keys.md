---
'@j0nathan-ll0yd/copy': major
---

agent readiness: add the copy for the MCP server, the about, contact, and developers pages, and the markdown 404 body. Remove the seven orphaned A2A leaves (atlas decision 0158).

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

**MAJOR, not minor.** Two breaking changes. First, the export-surface rule compares named exports per subpath, so it sees no break: no export name is removed. Under semver-ts.org, deleting seven properties from the exported `Llm['agentDiscovery']` type breaks any consumer that reads them. Same reasoning as 3.0.0. Second, `mcp.stackFramework` changes from a literal to a template. A consumer that emits it verbatim ships the literal `{astroMajor}`.

Consumer impact: one website code change. `scripts/generate-webmcp.mjs:133` emits `mcp.stackFramework` verbatim and must substitute `{astroMajor}` when the website bumps. The website and the backend pin 3.0.0 exactly and read none of the removed keys. Each bumps in its own change. iOS needs no change: no iOS code reads `agentDiscovery`, and the new `IdentityAbout`, `IdentityContact`, `LlmDevelopers`, and `LlmNotFound` structs collide with no iOS type.

Regenerated: `dist/identity.*`, `dist/llm.*`, `Sources/LifegamesCopy/Identity.generated.swift`, `Sources/LifegamesCopy/Llm.generated.swift`, and the bundled `Sources/LifegamesCopy/Resources/{identity,llm}.en-US.json`.
