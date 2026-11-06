---
'@j0nathan-ll0yd/tokens': minor
---

Add the `motion` entrypoint: the single definition of the 33 shared keyframes, plus `.skeleton-bar` and `.skeleton-circle`. It has no global rule.

`packages/tokens/src/animations.css` and `packages/tokens/src/effects.css` import it, so their consumers keep every keyframe name. A consumer of `effects` also gains the two skeleton classes. The global reduced-motion rule stays in both files and stays out of `motion`.

The mobile performance block in `effects` now stops `.id-avatar::after`. The block stopped `.id-avatar`, which has no animation.

Minor: this adds an entrypoint and removes none. Adopt this release together with the matching `packages/web` release.
