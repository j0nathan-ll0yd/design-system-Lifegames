---
'@j0nathan-ll0yd/tokens': patch
'@j0nathan-ll0yd/web': minor
---

Fix portfolio Lighthouse regressions in the production reading widgets: keep
bookshelf children semantic list items, mark linked theatre posters decorative,
and attach image fallbacks at runtime without CSP-blocked inline handlers.

Raise the web caption, metadata, and body typography floors to 0.75rem (12px)
while retaining fluid clamps and the existing upper bounds.
