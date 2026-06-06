# Incubation Watchlist

Tracks design-system widgets that are shipped to the registry as `Experimental` (or otherwise present in `packages/web/src/widgets/`) but have **no production consumer** in `packages/web/src/pages/` or `packages/web/src/layouts/`. This is a tracking artifact, not an enforcement gate.

## Why this exists

Per GOVERNANCE.md P8 (Solo BDFL governance stack), the design system tolerates incubation — widgets are allowed to exist without consumers while their shape and role are being figured out. But indefinite incubation is the failure mode flagged in the design-system audit (Anti-pattern #7): widgets accumulate, become impossible to reason about as a portfolio, and silently bit-rot.

**The rule:** if an incubating widget sits on this list for **>6 months without consumer movement**, absorb it — either delete the widget, fold its capability into an existing widget, or commit a consumer in the web app. No fourth option.

## Watchlist

Today: **2026-06-06.** Hard absorb-or-ship deadline for the initial cohort: **2026-11-20** (6 months from first-incubation date 2026-05-20).

| Widget | Source path | First incubation | Consumers | Absorb deadline | Notes |
|--------|-------------|------------------|-----------|-----------------|-------|
| ActivityFeed | `packages/web/src/widgets/github/ActivityFeed.astro` | 2026-05-20 | 0 | 2026-11-20 | GitHub cluster — one of 4 dev-activity surface explorations |
| CommitLog | `packages/web/src/widgets/github/CommitLog.astro` | 2026-05-20 | 0 | 2026-11-20 | GitHub cluster — list-of-commits variant |
| CommitTimeline | `packages/web/src/widgets/github/CommitTimeline.astro` | 2026-05-20 | 0 | 2026-11-20 | GitHub cluster — timeline-of-commits variant |
| DevActivityCards | `packages/web/src/widgets/github/DevActivityCards.astro` | 2026-05-20 | 0 | 2026-11-20 | GitHub cluster — card-grid variant; competes with ActivityFeed/CommitLog/CommitTimeline for the dev-activity surface |
| DevActivityTimeline | `packages/web/src/widgets/github/DevActivityTimeline.astro` | 2026-05-20 | 0 | 2026-11-20 | GitHub cluster — timeline-only variant (no commit detail); competes with CommitTimeline |
| LanguageBars | `packages/web/src/widgets/github/LanguageBars.astro` | 2026-05-20 | 0 | 2026-11-20 | Language-mix variant — competes with LanguageStack |
| LanguageStack | `packages/web/src/widgets/github/LanguageStack.astro` | 2026-05-20 | 0 | 2026-11-20 | Language-mix variant — competes with LanguageBars |
| PinnedRepos | `packages/web/src/widgets/github/PinnedRepos.astro` | 2026-05-20 | 0 | 2026-11-20 | GitHub overview surface |
| WeeklyPulse | `packages/web/src/widgets/github/WeeklyPulse.astro` | 2026-05-20 | 0 | 2026-11-20 | Aggregated weekly-activity glance |
| ExplorationOdometerV3 | `packages/web/src/widgets/location/ExplorationOdometerV3.astro` | 2026-05-20 | 0 | 2026-11-20 | Location surface — listed in `production-widgets.json` as `status: Experimental` |
| PlaceLeaderboardV3 | `packages/web/src/widgets/location/PlaceLeaderboardV3.astro` | 2026-05-20 | 0 | 2026-11-20 | Location surface — listed in `production-widgets.json` as `status: Experimental` |
| GitHubHeatmap | `packages/web/src/widgets/other/GitHubHeatmap.astro` | 2026-05-20 | 0 | 2026-11-20 | Contribution-graph variant |

**Cohort size:** 12 widgets (the audit anti-pattern #7 estimated "~11"; on enumeration it is 12).

## Cluster observations

Five of the twelve form an obvious **dev-activity cluster**: ActivityFeed, CommitLog, CommitTimeline, DevActivityCards, DevActivityTimeline. These are variants of the same idea ("show recent code activity"), each a different visual treatment. Only one can ship to the live dashboard's dev-activity slot. The other four should be deleted at absorb time unless a concrete reason emerges to keep two for different surfaces.

Two form a **language-mix cluster**: LanguageBars and LanguageStack. Same data, two visual treatments. Same rule applies — one ships, one is absorbed.

The remaining five (PinnedRepos, WeeklyPulse, ExplorationOdometerV3, PlaceLeaderboardV3, GitHubHeatmap) are not direct duplicates of each other.

## Quarterly review

Re-evaluate this file on the first Monday of every quarter (Jan / Apr / Jul / Oct):

1. For each row, run `grep -rln <WidgetName> packages/web/src/pages packages/web/src/layouts | wc -l`. If the consumer count is now ≥1, drop the row from the watchlist.
2. For any row past its absorb deadline, open a decision: ship it (commit a consumer in the web app), absorb it into a sibling widget, or delete it. Update this file with the disposition.
3. If new widgets land in `packages/web/src/widgets/` with zero consumers, add them with today's date as the first-incubation date and a 6-month absorb deadline.

## Methodology

- Widget identification: walking `packages/web/src/widgets/**/*.astro` plus the `Experimental` entries in `Sources/LifegamesWidgets/Resources/production-widgets.json` (web rows).
- First-incubation date: `git log --follow --format='%as' -- <file> | tail -1`. All twelve trace to commit `d0f2098 feat(web): add primitives, a11y, animations, docs scaffold, and CI workflows` on 2026-05-20 — the original scaffold push.
- Consumer count: `grep -rln <WidgetName> packages/web/src/pages packages/web/src/layouts`. The narrow grep paths are intentional — Storybook stories and the design-system docs site do not count as production consumers.
