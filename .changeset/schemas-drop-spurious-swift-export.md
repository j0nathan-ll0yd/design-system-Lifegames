---
'@j0nathan-ll0yd/schemas': major
---

Remove the spurious `./swift/*` export subpath.

The glob resolved to `swift/WidgetModels.swift` (quicktype-generated Swift
Codable structs) and a `swift/.gitkeep` placeholder. Neither is a JS module, so
the export-surface Level-2 extractor could not classify the subpath and reported
the whole package as INDETERMINATE — which is never a pass.

`WidgetModels.swift` has no Node consumer: a sweep of design-system-Lifegames,
j0nathan-ll0yd.github.io, ios-LifegamesPortal, mantle-LifegamesPortal and mantle
found zero imports of `@j0nathan-ll0yd/schemas/swift`. Its only consumer is the
Swift target `LifegamesSchemas`, which reaches it through SPM and the repo
filesystem path, never through Node's `exports` resolution.

`files` still lists `swift`, so `WidgetModels.swift` continues to ship in the
tarball unchanged. Removing an `exports` key is a surface removal regardless of
whether anything consumed it, so this is a major bump.
