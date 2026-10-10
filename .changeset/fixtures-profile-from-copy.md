---
'@j0nathan-ll0yd/fixtures': minor
---

The `profile` baseline is read from `@j0nathan-ll0yd/copy` (atlas decision 0160 Step 1.7): name,
title, location, the LinkedIn and GitHub links and the bio from `identity.person`, the tagline and
the terminal from the new `profile` namespace. Every string and the terminal line order are
unchanged. `@j0nathan-ll0yd/copy` moves from devDependencies to dependencies. New:
`terminalLinesFromCopy(terminal)` in `./post-adapter/profile`.

The `baseline` and `full` variations no longer carry `coordinates` (decision 0160 D14: live and
derived location data, coordinates included, is out of scope; no widget renders them). The
`Profile` schema still allows the optional field, so the type is unchanged.
