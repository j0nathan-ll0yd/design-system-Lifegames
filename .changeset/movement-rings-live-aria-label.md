---
'@j0nathan-ll0yd/web': patch
---

Keep the MovementRings ring-group name true on live data, not merely present.

`updateMovementRings` repaints the three rings and the centre `%` on every poll but never
rewrote the `aria-label` that names them. The consuming site is `output: 'static'`, so that name
is frozen at BUILD time while the rings underneath it are live — a screen reader announced
build-time percentages over current rings. That is a confidently-wrong announcement, and worse
than the missing name it replaced.

The poll path now recomposes the `a11y.movement.rings` template from the same three percentages
the rings draw, and sets it on the same `svg[role="img"]` element the name moved to. Rounding is
unclamped to match the SSR composition exactly: the centre readout clamps to 100% because a ring
cannot overdraw, but the announced value must stay truthful at 107%.

Completes the fix started in the previous release. That one gave the ring group a name; this one
keeps the name tracking the visual. No prop, copy, or export-surface change.
