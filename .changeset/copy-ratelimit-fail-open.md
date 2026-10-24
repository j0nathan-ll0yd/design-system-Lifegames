---
'@j0nathan-ll0yd/copy': patch
---

`llm.developers.rateLimitBody` states the `/api/v1` facade's fail-open behavior (website #395 review, finding M2). Before, the value promised the `RateLimit` field on every export response. Now:

- `RateLimit-Policy` is on every export response.
- `RateLimit` is on every response the counter counted.
- When the counter is unavailable, the request is still served and `RateLimit` is absent.

The limit (60 requests per minute per client) and `Retry-After` on a 429 are unchanged. The key name and `_meta.usage` are unchanged.
