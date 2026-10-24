---
'@j0nathan-ll0yd/web': minor
---

New `SiteFooterNav` component: one `<nav>` landmark around a list of page links, with `aria-current="page"` on the current link and no JavaScript (atlas decision 0158 follow-on, plan is-agentic-developers-link, option A). Props: `links` (`{href, label, current?}[]`, rendered in order) and an optional `label` for the landmark's accessible name. An absent or empty label falls back to the copy key `identity.navigation.siteNavLabel` ("Site"). An empty `links` renders nothing. `SiteFooterNav` and its `SiteFooterNavLink` type export from the package root and from `./components`.

`TextPage` now renders its footer links through `SiteFooterNav`. Its `back` link and its footer wrapper stay its own. The footer nav gains its accessible name and wraps its links in a `ul`. The render is unchanged: footer screenshots before and after match byte for byte at 1400x900 and 390x844.

The nav styles move from `.lg-text-page-nav` and `.lg-text-page-nav-link` to `.lg-site-footer-nav-list`, `.lg-site-footer-nav-item` and `.lg-site-footer-nav-link` in `primitives.css`. Only `TextPage` rendered the old classes. A grep of the website (`src/`, `tests/`), the LP backend (`src/`) and this repo finds no other reference, and the website's footer selectors (`footer nav a`) are descendant selectors that survive the added `ul > li`. The website homepage mounts `SiteFooterNav` in a later website PR.
