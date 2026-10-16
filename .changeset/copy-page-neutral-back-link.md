---
'@j0nathan-ll0yd/copy': minor
---

New `identity.navigation.backLink` ("Back to dashboard"), a page-neutral back link (atlas decision 0158 step 5b). The website's text pages, `/offline` and `/500` read `identity.privacy.backLink`, a privacy-page key, as a generic link back to the dashboard. The new `identity.navigation` group gives that link a key no page owns, with the same text.

`identity.privacy.backLink` stays, with the same value, and is deprecated: copy 5.0.0 removes it (DEPRECATION.md, "Copy keys"). The deprecation reaches every generated artifact: `deprecated: true` in `dist/identity.flat.schema.json`, an `@deprecated` JSDoc on `Identity['privacy']['backLink']`, a `.describe()` in `dist/identity.zod.ts`, and a doc comment in Swift. The copy build now fails on a deprecated key that names no live replacement in its own namespace.

Additive, hence minor, as for the `widgets.widgetState` group in 3.2.0. Swift gains `public struct Navigation` and an `Identity.navigation` property, so the memberwise `Identity.init` takes one more argument. No Swift code calls it; `CopyLoader` decodes the bundled JSON.
