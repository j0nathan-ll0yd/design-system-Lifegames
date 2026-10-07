---
'@j0nathan-ll0yd/copy': major
---

agent readiness: add the copy for the MCP server, the about, contact, and developers pages, and the markdown 404 body. Remove the seven orphaned A2A leaves (atlas decision 0158).

Added (identity, 26 leaves; the namespace grows from 61 to 87):

- `person.email`, `person.contactType`, `person.addressLocality`, `person.addressRegion`, `person.addressCountry` — the Person JSON-LD `contactPoint` and `address`. The email is the `security.txt` contact. The address parts split the existing `person.location`.
- `about.*` (9) — title, meta description, and four headed sections for `/about`. The background section reuses `person.longBio`.
- `contact.*` (12) — title, meta description, intro, three channel labels and notes, and the security-report note for `/contact`.

Added (llm, 34 leaves):

- `txt.linkSourceRepo`, `txt.whenToUseHeading`, `txt.whenToUseBody`, `txt.whenToUseMcp`, `txt.whenToUseFull`, `txt.whenToUseApi`, `txt.whenToUseDevelopers` — the llms.txt "When to use" section and the source-repository link.
- `mcp.serverTitle`, `mcp.serverCardDescription` — the SEP-2127 server-card title and short description. A test holds the description to the SEP-2127 limit of 100 characters.
- `developers.*` (19) — title, meta description, intro, and a heading and body for each of eight machine interfaces.
- `notFound.*` (6) — heading, paragraph, and four links for the markdown 404 body.

Changed values:

- `mcp.serverDescription` and `agentDiscovery.aiCatalogMcpDescription` now describe the real read-only MCP server at `/mcp`. The "via CloudFront" claim is gone: the CloudFront distribution answers an MCP `initialize` with an HTML 403.
- `mcp.stackFramework` is now the template `Astro {astroMajor}.x (…)`. The website fills `{astroMajor}` from its installed `astro` version, so the value no longer goes stale. The old literal said "Astro 6.x"; the website runs Astro 7.

Removed: `agentDiscovery.agentCardDescription`, `agentDiscovery.agentCardSkillName`, `agentDiscovery.agentCardSkillDescription`, `agentDiscovery.agentCardSkillExamples`, `agentDiscovery.aiCatalogA2aName`, `agentDiscovery.aiCatalogA2aDescription`, `agentDiscovery.aiCatalogA2aQueries`. The A2A agent card is a settled decline. A grep of the website, the backend, the iOS app, and this repository outside the copy package finds no reader.

**MAJOR, not minor.** The export-surface rule compares named exports per subpath, so it sees no break: no export name is removed. Under semver-ts.org, deleting seven properties from the exported `Llm['agentDiscovery']` type breaks any consumer that reads them. Same reasoning as 3.0.0.

Consumer impact: none in code. The website and the backend pin 3.0.0 exactly and read none of the removed keys. Each bumps in its own change. The website must substitute `{astroMajor}` in `mcp.stackFramework` when it bumps. iOS needs no change: no iOS code reads `agentDiscovery`.

Regenerated: `dist/identity.*`, `dist/llm.*`, `Sources/LifegamesCopy/Identity.generated.swift`, `Sources/LifegamesCopy/Llm.generated.swift`, and the bundled `Sources/LifegamesCopy/Resources/{identity,llm}.en-US.json`.
