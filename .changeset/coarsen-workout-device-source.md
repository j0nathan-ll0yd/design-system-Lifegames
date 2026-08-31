---
'@j0nathan-ll0yd/fixtures': minor
---

Coarsen the workout `source` field to the generic device class `Apple Watch`.

The LP health export now coarsens the HealthKit device name before serving public
`workouts.json` (mantle-LifegamesPortal #270, decision 0096 HF8). The DS workout
fixtures hardcoded the owner's personal device name, which no longer matches what
the export serves.

Changed at the generator source — `DEFAULT_WORKOUT` in `src/factories/workouts.ts`
and the explicit per-entry overrides in the `full` variation — then regenerated
`src/generated/workouts/*.json`. The field stays a required string, so the contract
schema and the full-coverage walker are unaffected.
