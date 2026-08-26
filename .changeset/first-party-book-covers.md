---
'@j0nathan-ll0yd/web': major
'@j0nathan-ll0yd/schemas': minor
'@j0nathan-ll0yd/fixtures': minor
---

Reading widgets render book covers and theatre posters from the real export contract fields, and no image path can reach a third-party host (atlas decision 0086).

The books export emits `mainImage`, `mainImageThumb`, `mainImageCard`, `mainImageAvif`, `mainImageThumbAvif` and `mainImageCardAvif`, all first-party CloudFront. `Bookshelf.astro` read `cover*` instead — names no export has ever emitted — so its AVIF sources were dead and every cover fell through to a hard-coded `m.media-amazon.com` ASIN URL. That hard-code is why the production site still requested images from Amazon. All four call sites are removed; a missing or broken cover now resolves to a committed same-origin placeholder.

Breaking for consumers:

- `BookEntry` (`widgets/reading/Bookshelf.types.ts`) and `AdaptedBookEntry` (`runtime/adapters.ts`) carry the contract's own `mainImage*` names in place of `cover*`. Pass the export fields straight through.
- `imgFallbackAttrs(src)` takes one argument. The fallback target is always the placeholder, so the previous `originalUrl` argument is gone.
- The `data-book` payload the Bookshelf writes uses `mainImage` / `mainImageAvif`; BookModal reads those.
- **Consumers must serve the placeholder.** Copy `@j0nathan-ll0yd/web/assets/no-cover.svg` to `public/images/no-cover.svg`. Without it the fallback 404s. The path is `PLACEHOLDER_IMAGE_SRC` in `runtime/image-utils.ts`.

`installImageFallbacks` now refuses a `data-fallback` that is not same-origin and substitutes the placeholder, so stale SSR markup from an older build cannot reintroduce a third-party request. `dashboard-books.schema.json` gains the six nullable image fields it previously forbade, which is what lets the SSR shell render a real cover at all.
