---
'@j0nathan-ll0yd/web': minor
---

Relative-time labels render in the browser only (atlas decision 0164 D5, "stable bytes"). The same export data now composes to the same server bytes at any render time, so the runner can skip an unchanged Workers KV write.

Minor, not patch: the server writes a new text form and the package exports new functions. No export is removed and no signature breaks.

- The server writes each instant as absolute, locale-neutral UTC text, `YYYY-MM-DD HH:MM UTC` (`2026-03-18 12:00 UTC`), inside `<time datetime data-relative>`. A visitor without JavaScript sees this text. `datetime` keeps the ISO instant. This covers System Status ages, DevActivityLog dates, StarredRepoList dates and ReadingFeed dates. A date-only GitHub event keeps its ISO date and carries no `data-relative`, as before; a date-only `savedAt` or `starredAt` shows its date and still gets the relative label in the browser, as before. An unparseable value now shows as written instead of a `NaN` label.
- New `runtime/relative-time`: `absoluteTimeText`, `relativeTimeLabel`, `relativeAttr`, `isIsoTimestamp`, `isIsoDate`, `isRelativeStyle` and `formatAge` (moved from `runtime/view-models`, which still re-exports it). Pure and DOM-free.
- New `runtime/relative-time-fill`: `fillRelativeTimes(root = document, now = Date.now())`, the only writer of relative text. It writes the label each widget showed before (`5m ago`, `2 weeks ago`). `updateDevActivityLog`, `updateReadingFeed`, `updateStarredRepos` and `updateSystemStatus` call it on the markup they write.
- Consumer action: call `fillRelativeTimes(document)` once at load, before the cards become visible. Without it, a page whose first poll returns the server's generation keeps the absolute text: the updaters do not run for an export the page already shows.
- `adaptGithubEvents`, `adaptStarredRepos` and `adaptArticles` write the absolute text and no longer read the clock; their `now` argument is deprecated and ignored. `composeSystemLines` ignores its `now` argument the same way. Both stay for compatibility until the next major.
- `FocusOverlay` and `DndOverlay` always render the `--:--:--` clock placeholder; `updateFocusOverlay` writes the time. Their `now` prop is deprecated and ignored.
- `timeHtml` in `runtime/widget-markup` takes an optional fourth argument, the relative style.
