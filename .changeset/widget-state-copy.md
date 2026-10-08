---
'@j0nathan-ll0yd/copy': minor
---

New `widgets.widgetState` copy keys for the honest widget states (atlas decision 0160):
`noReading`, `unavailable`, `suppressed`, `asOf` (ICU MF1 `{time}`) and `needsJavaScript`. Web and
Swift read them from here; no platform holds its own copy of these strings (GOVERNANCE P3.1).

The Swift struct for the group is `WidgetStateCopy` (a group `title`): the bare key would generate
`WidgetState`, which shadows `LifegamesComponents.WidgetState<T>`. The build now fails on a copy
struct that shadows a public type of another design-system Swift module.
