---
'@j0nathan-ll0yd/schemas': patch
---

The generated `focus-overlay` and `dnd-overlay` widget schemas describe the `now` prop as unused (atlas decision 0164 D5): the overlays render the `--:--:--` clock placeholder and the browser writes the time. Description text only; the schema shape and validation are unchanged.
