---
'@j0nathan-ll0yd/web': minor
---

Add `TextPage` and `TextPageSection` (atlas decision 0158), exported from `@j0nathan-ll0yd/web/components` and the package root. They carry the text-page card styles of the website's `/about`, `/contact`, `/developers`, and `/privacy` pages, moved out of the website's `InfoPage.astro`. The styles live in `primitives.css` and restore document scrolling where the dashboard layout locks it at 1100px and up. Additive: no existing export changes.
