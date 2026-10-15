---
'@j0nathan-ll0yd/copy': patch
---

The hosting strings name Cloudflare Workers, not Cloudflare Pages (atlas decision 0160 Step 1.7).

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
