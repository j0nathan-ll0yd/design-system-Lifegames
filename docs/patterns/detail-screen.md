# Detail Screen (iOS)

iOS-platform pattern — no web parity obligation (web is read-only).

## 1. Intent

A brand-agnostic detail / show surface — the canonical pair to [`ListTemplate`](../../Sources/LifegamesTemplates/ListTemplate.swift) (a list picks an item; a detail shows it). The design system owns the vertical detail LAYOUT (a scrolling column of hero → metadata → description → actions over a tokenized surface); the host fills each zone with its own content. Abstracted from OMD's `FileDetail`, it carries no media semantics — the host supplies the hero media, the stat facts, the description copy, and the action buttons.

## 2. Anatomy

- **Hero slot** — `@ViewBuilder hero` — the media / image zone (a thumbnail, artwork, map, or banner). The host owns its card chrome (e.g. `.glassCard(tint:)`).
- **Metadata slot** — `@ViewBuilder metadata` (default `EmptyView`) — a compact stat / fact row, typically [`MetricContentView`](../../Sources/LifegamesComponentsCore/MetricContentView.swift) cards under `.neonCard(accent:)`, plus a title / author line.
- **Description slot** — `@ViewBuilder description` (default `EmptyView`) — an "about" / long-copy block.
- **Actions slot** — `@ViewBuilder actions` (default `EmptyView`) — the primary + secondary action row, typically [`LGButton`](../../Sources/LifegamesComponents/LGButton.swift)s.

All four zones are `@ViewBuilder` slots, so the template carries no typed title / image / stat fields — that would presume a domain (a video, a product, a profile) and break slot purity.

## 3. Props / Slots

Swift type: [`DetailTemplate`](../../Sources/LifegamesTemplates/DetailTemplate.swift)

| Field         | Type                             | Notes                                                       |
| ------------- | -------------------------------- | ----------------------------------------------------------- |
| `accent`      | `Color`                          | Default `LGColor.accentDefault`. Reserved for host theming. |
| `hero`        | `@ViewBuilder () -> Hero`        | Required. Media / image zone.                               |
| `metadata`    | `@ViewBuilder () -> Metadata`    | Defaults to `EmptyView`. Stat / fact row.                   |
| `description` | `@ViewBuilder () -> Description` | Defaults to `EmptyView`. About / long-copy block.           |
| `actions`     | `@ViewBuilder () -> Actions`     | Defaults to `EmptyView`. Primary + secondary action row.    |

Supporting elements:

| Element             | Type                                                                                 | Notes                                               |
| ------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------- |
| `MetricContentView` | [`MetricContentView`](../../Sources/LifegamesComponentsCore/MetricContentView.swift) | Unstyled stat; caller applies `.neonCard(accent:)`. |
| `LGButton`          | [`LGButton`](../../Sources/LifegamesComponents/LGButton.swift)                       | DS CTA primitive for the `actions` slot.            |

## 4. States

| State  | Rendering                                                           |
| ------ | ------------------------------------------------------------------- |
| Full   | All four slots filled (hero + metadata + description + actions).    |
| Sparse | Hero only; `metadata` / `description` / `actions` default to empty. |

## 5. Variants

None at template level — the four slots absorb all per-app variety.

## 6. Host-owned boundaries

- **Nav chrome is host-owned** — `NavigationStack`, navigation title, toolbar, and any background wash (e.g. `.gradientBackground()`) wrap the template; the template renders the scrolling content column over `LGColor.surfaceBase` only.
- Compact bespoke controls that don't read as a standard horizontal CTA (e.g. OMD's 4-up icon-tile secondary actions) stay in the host's `actions` slot, not promoted to `LGButton`.
- OMD's `FileDetail` content (hero thumbnail, neon metric cards, purple about card) is the app-supplied slot content, not a design-system component.

## 7. Accessibility

- Slot content accessibility is host-owned (each slot builder's responsibility).
- `LGButton` guarantees a ≥44pt touch target (S70); `MetricContentView` text honors Dynamic Type.
- Contrast verified ≥4.5:1 against `LGColor.surfaceBase` / `LGColor.surfaceRaised`.

## 8. References

- Template: [`Sources/LifegamesTemplates/DetailTemplate.swift`](../../Sources/LifegamesTemplates/DetailTemplate.swift)
- Elements: [`MetricContentView.swift`](../../Sources/LifegamesComponentsCore/MetricContentView.swift), [`LGButton.swift`](../../Sources/LifegamesComponents/LGButton.swift)
- ADRs: [`0001`](../adr/0001-omd-screen-staging-strategy.md), [`0003`](../adr/0003-screen-scaffold-p6-override.md), [`0004`](../adr/0004-template-naming-and-element-promotion.md)

Experimental via BDFL P6 override (ADR-0003); advances to Beta/Stable per P7 as real surfaces adopt it.
