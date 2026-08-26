---
'@j0nathan-ll0yd/fixtures': patch
---

Strip the post-adapter book cover URLs that name CloudFront objects which do not exist, and gate their return.

The post-adapter fixtures are the SSR shell. `loadDashboardData` reads them and `Bookshelf.astro` server-renders each cover straight into `<img src>`, with no route interception in front of it — so a cover URL naming a key the books pipeline never produced is a guaranteed 403 on every page load. Four fixture-only ASINs did exactly that (`0132350882`, `0135957052`, `1449373321`, `173210220X`); an HTTP probe of the distribution confirms all six derivatives of each 403, against 200 for the five ASINs the pipeline really processed. The shell fired those requests on every render, and ORB logged each one.

`books.baseline` (all four books) and the `1449373321` entry in `books.full` now carry `null` for all six `mainImage*` fields. `DashboardBooks` already permits null there, so no schema change was needed. The five books in `books.full` with real objects keep their covers, so the fixtures still exercise a rendered cover and the placeholder side by side.

Consumer impact: the SSR shell now shows the same-origin `/images/no-cover.svg` placeholder for these four books instead of a broken cover, and requests zero non-existent covers. `@j0nathan-ll0yd/web` 3.1.0 already resolves a null cover directly to the placeholder src with no `data-fallback` round trip. The placeholders stay until the runtime swap brings in the live books payload with real covers.

New `tests/cover-integrity.test.ts` holds the line: every non-null post-adapter cover must name an ASIN in `COVERED_ASINS` (`src/cover-inventory.ts`, provenance recorded), must belong to the book carrying it, and a book must have all six derivatives or none. Raw (pre-adapter) fixtures are deliberately exempt and now say why in `src/factories/books.ts`: their `example-*` keys never leave the sandbox, because the consumer's Playwright layer intercepts `${CLOUDFRONT_BASE}/**` before any request goes out, and `scripts/check-full-coverage.ts` requires them non-null in the `full` variation.
