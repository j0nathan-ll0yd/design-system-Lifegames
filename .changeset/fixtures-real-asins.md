---
'@j0nathan-ll0yd/fixtures': patch
---

Every fixture book now carries a real-shaped ASIN: exactly 10 characters, either an ISBN-10 with a valid check digit or `B0` and 8 characters of `[A-Z0-9]`. The only writer requires 10 characters, and the website's composed-page filter admits a Bookshelf link only for `[A-Z0-9]{10}`. The old 4-character ASINs made that filter refuse every fixture Bookshelf render.

- `packages/fixtures/src/variations/books.ts`: new ASINs for `allReading`, `allCompleted`, `mixedStatus`, `withProgress`, `seriesBooks`, `sixBooks`, `allFields` and `ssrKnownAnswer`. The generated raw JSON under `packages/fixtures/src/generated/books/` is regenerated.
  - `allReading`: `B001`–`B003` become `B0DSRD0001`–`B0DSRD0003`.
  - `allCompleted`: `C001`–`C005` become `1600000010`, `1600000029`, `1600000037`, `1600000045`, `1600000053`.
  - `mixedStatus`: `M001`–`M004` become `B0DSMX0001`–`B0DSMX0004`.
  - `withProgress`: `P001`–`P005` become `B0DSPG0001`–`B0DSPG0005`.
  - `seriesBooks`: `S001`–`S005` become `1600000118`, `1600000126`, `1600000134`, `1600000142`, `1600000150`.
  - `sixBooks`: `X006` becomes `1600000215`.
  - `allFields`: `F001` becomes `0123456789`, the book's own `isbn10`.
  - `ssrKnownAnswer`: `KA7731KAP1` and `KA7731KAP2` become `B0KA7731P1` and `B0KA7731P2`. They still appear in no other fixture. The `isbn10` values are unchanged.
- `packages/fixtures/src/post-adapter/books.ts`: the baseline "A Philosophy of Software Design" ASIN `173210220X` had a wrong ISBN-10 check digit. It becomes `1732102201`, the ISBN-10 of its own `isbn` `9781732102200`. `books.baseline.json` is regenerated.
- `packages/fixtures/tests/asin-shape.test.ts` is a new gate. It checks every `asin` and every `bookMeta` key in the raw variations, the generated raw JSON, the post-adapter JSON and the Swift widget fixtures. It fails on a repeated ASIN in one book list, on a `bookMeta` key that names no book, and on a book with no `bookMeta` entry. Three pre-existing gaps in Swift widget fixtures are listed by file and ASIN.

Patch: no export, type, variation or field changes. A consumer snapshot that records a fixture ASIN, an Amazon link built from one, or a `data-book` attribute changes on upgrade.
