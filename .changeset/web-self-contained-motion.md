---
'@j0nathan-ll0yd/web': minor
---

Make the web stylesheets self-contained for motion. `components.css` and `primitives.css` now import the `motion` entrypoint of `packages/tokens`, so a consumer gets every keyframe they name with no second entrypoint. Every animation that `components.css` names now has a `prefers-reduced-motion: reduce` gate that removes it, so it no longer depends on a global rule in another file.

Consumers see new behavior after they adopt this release:

- Elements now animate on a page that loaded none of the `tokens/animations` keyframes. From `components.css` these are `.live-dot`, `.sys-dot`, `.id-name` and the `.article-list-item` entry. From `primitives.css` these are `.lg-modal-overlay`, `.lg-modal`, `.lg-poll-dot--ok` and `.lg-skeleton-bar::after`.
- Loading skeletons now draw. `.skeleton-bar` and `.skeleton-circle` were styled only by `tokens/animations`, so a page without it showed empty boxes.

Minor rather than patch: visible behavior changes on a page that adopts it, and the release adds no breaking API change. Consumers pin this package exact, so adoption is a deliberate lockfile bump.

The `FocusOverlay` keyframe is now `focus-pulse-dot`. `ComingSoon` defines a different `pulse-dot`, and the static suite now rejects two definitions of one name.

`.id-avatar::after` still draws nothing. `IdentityCard` puts `.id-avatar` on an `<img>`, and a loaded `<img>` paints no `::after`.
