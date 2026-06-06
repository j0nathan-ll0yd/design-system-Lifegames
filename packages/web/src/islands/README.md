# Astro Island Wrappers

Island wrappers provide client-side hydration for interactive production widgets.
They use bundled `<script>` tags with `IntersectionObserver` for lazy hydration.

**NEVER use `client:visible` or any `client:*` directive on `.astro` components** --
these directives only work on framework components (React/Svelte/Vue/etc).

## Hydration Classification

| Widget | Hydration | Reason |
|--------|-----------|--------|
| IdentityCard | static | Props-driven, avatar image |
| BioTerminal | **hydrated** | Typewriter animation |
| SystemStatus | static | Timestamp display from props |
| HeartRate | **hydrated** | ECG canvas animation + zone colors |
| MovementRings | **hydrated** | Ring SVG animation + sun-arc circadian footer |
| Workouts | static | List rendering from props |
| Hydration | **hydrated** | Liquid-fill CSS animation |
| NightSummary | static | Sleep score + bars from props |
| DevActivityLog | static | Event list from props |
| ReadingFeed | static | Article list from props |
| StarredRepoList | static | Repo list from props |
| Bookshelf | **hydrated** | Image fallback chain + modal trigger |
| TheatreReviews | **hydrated** | Content populated by updateTheatreReviews() |

5 hydrated, 8 static. Dev-only widgets (PlaceLeaderboardV3, ExplorationOdometerV3) are static.
