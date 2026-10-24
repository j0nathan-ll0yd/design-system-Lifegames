---
'@j0nathan-ll0yd/copy': minor
---

Developers-page copy for the `/api/v1` facade (atlas decision 0158 follow-on, plan is-agentic-api-v1 step 1), and the landmark name for the new site footer nav.

Added (llm, 17 leaves; the namespace grows from 203 to 220), all under `developers`:

- `apiBaseNote`: the API base `{siteUrl}/api/v1`, and `{siteUrl}/openapi.json` as the list of its nine export paths.
- `errorsHeading`, `errorsBody`: every 4xx and 5xx under `/api` is an RFC 9457 problem document (`application/problem+json`) with `type`, `title`, `status`, `detail` and `instance`; the `type` URI points at a fragment of the page.
- A Title and a Detail for each problem type: `problemNotFound*`, `problemMethodNotAllowed*`, `problemRateLimited*`, `problemFocusSuppressed*`, `problemUpstreamUnavailable*`. Each Detail is a static sentence. Variable data, such as the valid paths and the retry interval, travels in RFC 9457 extension members and response headers.
- `versioningHeading`, `versioningBody`: path versioning, additive-only change within a version, a 90-day support window with `Deprecation`, `Sunset` and `Link rel="successor-version"`, and a portal-contract major as the trigger.
- `rateLimitHeading`, `rateLimitBody`: 60 requests per minute per client, `RateLimit-Policy` and `RateLimit` on every response, and `Retry-After` on a 429.

Changed: `developers.apiBody` names the `/api/v1` base and points at the new sections. `developers.focusBody` adds the `/api/v1` answer, a 503 focus-suppressed problem document, beside the CloudFront host's 403. `developers.lastModified` is `2026-10-24`.

Added (identity, 1 leaf): `navigation.siteNavLabel` ("Site"), the accessible name of the web package's `SiteFooterNav` landmark.

Additive, hence minor. Swift gains the matching properties on `LlmDevelopers` and `IdentityNavigation`, so their memberwise initializers take more arguments. No Swift code calls them; `CopyLoader` decodes the bundled JSON.
