---
'@j0nathan-ll0yd/fixtures': minor
---

Known-answer and sparse raw fixtures for server-render tests (atlas decision 0160).

- `ssrKnownAnswer` raw variation for health, sleep, workouts, books, githubEvents, starredRepos,
  articles, focus and theatreReviews (location is retired, decision 0012). Its distinctive values
  appear in no other fixture; `tests/ssr-known-answer.test.ts` proves the disjointness.
- `sparse` raw health variation: a schema-valid export without dietaryWater, dietaryCaffeine,
  exerciseTime, activeEnergyBurned, basalEnergyBurned and sleepScore.
- `ssrKnownAnswerFixtures` export in `./raw` with non-optional types.
- Post-adapter `starredRepos` carries `datetime` beside `starredAt` (it derives through
  `adaptStarredRepos`).
