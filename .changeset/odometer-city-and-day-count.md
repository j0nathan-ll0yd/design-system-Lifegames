---
'@j0nathan-ll0yd/web': patch
---

Two fixes to the ExplorationOdometerV3 runtime. The widget is `dev-only`. No call signature changes.

- `updateExplorationOdometerV3` writes the current city as written. It escaped the name and then assigned it to `textContent`, so a city with `&`, `<`, `>` or `"` showed the entity text (`&amp;`). `initExplorationOdometerV3` already wrote the raw string.
- The "N days" count in `updateExplorationOdometerV3` and `initExplorationOdometerV3` starts at midnight 2 March 2026 in the owner's time zone (`America/Los_Angeles`). The start date had no offset, so it parsed in the viewer's zone and the count moved by up to a day with the host.
