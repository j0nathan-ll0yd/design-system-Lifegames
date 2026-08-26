---
'@j0nathan-ll0yd/web': patch
---

Make the first-party image fallback actually paint. 3.0.0 shipped it broken two ways, and neither could be seen by the tests that existed.

`installImageFallbacks` set `img.src` to the placeholder but left the enclosing `<picture>`'s `<source>` candidates in place. Inside a `<picture>` the browser resolves from the first matching `<source>` and only consults `<img src>` when none matched, so a cover whose AVIF source 404s kept re-resolving to the dead source and painted a broken glyph while `img.src` silently held the correct value. `pictureWithAvif()` emits exactly that shape, which is what the Bookshelf renders. The handler now removes the sibling `<source>` elements before swapping the src.

`src/assets/no-cover.svg` was not well-formed XML. Its comment contained `--` (in the token names `--lg-card-background` and friends), which XML forbids, so no browser could decode it -- the fallback target was itself unrenderable. The comment is reworded and now says why.

Both were invisible to the suite. Every `installImageFallbacks` test used a bare `<img>`, never the `<picture>` markup the same module generates, and jsdom performs no `<picture>` source selection at all -- with a dead `<source>` still in the DOM it reports `img.src` as the placeholder and passes. `check-placeholder-asset.test.mjs` asserted the asset's identity and path but never that the bytes decode as an image, and a malformed SVG still serves 200 with the right Content-Type.

Three gates close that, each verified to fail on the unfixed code:

- `tests/browser/image-fallback.browser.test.ts` renders in real Chromium and asserts on `naturalWidth` and `currentSrc` -- the placeholder paints, the dead source does not survive. Runs in CI as the new `web-browser-runtime` job, on the playwright-labelled runner because the existing web job has no browser binaries.
- The jsdom suite gains the `<picture>` cases it never had.
- `check-placeholder-asset.test.mjs` rejects `--` inside an XML comment.

No API change. Consumers on 3.0.0 need only the version bump; the `/images/no-cover.svg` copy requirement is unchanged, but re-copy the asset because its bytes changed.
