# ADR-0002 — Brand-Agnostic Molecule & Scaffold Theming

## Context

The OMD screens express brand through `OMDPalette` — an app-domain semantic-alias layer over design-system accents (`primary = accentBlue`, `playback = accentCyan`, `complete = accentGreen`, `queued = accentAmber`, `destructive = accentPink`, `content = accentPurple`). P1 requires that components reference the design system's **semantic** token tier as the only cross-platform contract; a generic design system must not carry app-domain roles like `playback` or `queued`. For the promoted molecules (ADR-0001) and the new scaffolds (ADR-0003) to be reusable by a second app without forking, they must not hardcode `LGColor.accentBlue` / `OMDPalette` / brand copy. The viable options were a per-call injected `accent` parameter (additive, minimal) versus building an `@Environment(\.theme)` theme system now (premature for a single brand).

## Decision

Promoted molecules and scaffolds take an **injected accent color and injected text**, and reference **semantic** tokens only. The accent parameter defaults to `LGColor.accentDefault`. All static text is a host-owned `LocalizedStringKey`; all data is generic or injected. App-domain palettes such as `OMDPalette` stay app-side and are **received** through a component's `accent` slot — never imported into `LifegamesComponents`, `LifegamesComponentsCore`, or `LifegamesTemplates`. A future `@Environment(\.theme)` injection path is documented as the migration route for when a second brand appears, but **no theme system is built now**: because `accent` is already a per-call parameter, adding an environment reader later is additive, not a breaking change.

## Consequence

The molecules and scaffolds are reusable across apps without forking — each app supplies its own brand accent and copy at the call site. Multi-brand support, if ever needed, becomes a token/theme-layer change rather than a component rewrite. The design system remains free of app-domain semantics (P1 preserved), and Part 2's OMD wiring passes `OMDPalette.*` values straight into the `accent` slots with no design-system change required.
