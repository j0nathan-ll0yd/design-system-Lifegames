---
'@j0nathan-ll0yd/copy': minor
---

Deprecate `a11y.bookshelf.bookItem` with no replacement (DEPRECATION.md, "Copy Keys"). Each Bookshelf tile's title is now a real link, named by its own text, so the web template and both updater paths dropped the tile label. No Swift, iOS, website or portal source reads the key. The rich schema marks it `deprecated: true`. The TS type gains an `@deprecated` JSDoc, the Zod schema a `.describe()`, and the Swift `A11YBookshelf.bookItem` property a doc comment. The accessor stays until the next major release, and the value does not change.
