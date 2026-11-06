---
'@j0nathan-ll0yd/web': patch
---

Fit every loading skeleton inside its card body at the website viewports. Card heights do not change.

- Dev Log, Reading Feed, Starred Repos, Bookshelf, Theatre Reviews and Workouts draw one row, centered in the body, through the new class token `skeleton-state--compact`. The Heart Rate chart placeholder goes from 60px to 44px.
- `primitives.css` scopes its skeleton rule to `.lg-card.is-loading .skeleton-state`. The bare `.is-loading .skeleton-state` selector is gone.
- With scripts off, no `.tri-card` paints a skeleton. The card shows its `<noscript>` note alone.

Consumer obligation: a consumer with a fragment class allowlist must admit `skeleton-state--compact` on `cardDevLog`, `cardReading`, `cardStarredRepos`, `cardBooks`, `cardTheatreReviews` and `cardWorkouts` before it adopts this version. On the website, this is `src/lib/composed/fragment-classes.ts`; without the change its build stops at `scripts/build-value-free.mjs`. A test that counts skeleton bars must also move: the Theatre Reviews skeleton now has 3 bars, not 9.
