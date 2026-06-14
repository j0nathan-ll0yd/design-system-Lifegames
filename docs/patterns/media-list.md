# Media List (iOS)

iOS-platform pattern — no web parity obligation (web is read-only).

## 1. Intent

A generic list shell that renders host-supplied rows over a tokenized surface, with pull-to-refresh and an optional empty state. Abstracted from OMD's `FileList` / `SampleFiles`, it carries no media semantics — the host supplies row content (e.g. OMD's `FileRow`) and the empty-state copy.

## 2. Anatomy

- **Rows** — `@ViewBuilder row: (Item) -> Row` — host-rendered per `Identifiable` item. Swipe / selection affordances (`.swipeActions`) live here, on the host's row.
- **Empty state** — optional [`LGEmptyState`](../../Sources/LifegamesComponents/LGEmptyState.swift); `nil` → no empty rendering.
- **Pull-to-refresh** — wired when `onRefresh` is supplied (`@Sendable () async -> Void`).

## 3. Props / Slots

Swift type: [`ListScaffold`](../../Sources/LifegamesTemplates/ListScaffold.swift)

| Field        | Type                                | Notes                                                       |
| ------------ | ----------------------------------- | ----------------------------------------------------------- |
| `items`      | `[Item]` where `Item: Identifiable` | Required. Generic data.                                     |
| `accent`     | `Color`                             | Default `LGColor.accentDefault`. Reserved for host theming. |
| `emptyState` | `LGEmptyState?`                     | `nil` → no empty rendering.                                 |
| `onRefresh`  | `(@Sendable () async -> Void)?`     | `nil` → no pull-to-refresh.                                 |
| `row`        | `@ViewBuilder (Item) -> Row`        | Host-supplied row content.                                  |

Empty-state molecule: [`LGEmptyState`](../../Sources/LifegamesComponents/LGEmptyState.swift) — `init(title:systemImage:description:actionTitle:accent:action:)`, wraps `ContentUnavailableView`.

## 4. States

| State     | Rendering                                                         |
| --------- | ----------------------------------------------------------------- |
| Populated | `row(item)` for each item; pull-to-refresh if `onRefresh` set.    |
| Empty     | `emptyState` centered if `items.isEmpty` and `emptyState != nil`. |

## 5. Variants

None at scaffold level — the row builder absorbs all per-app variety.

## 6. Host-owned boundaries (Part 2)

- **Nav chrome is host-owned** — `NavigationStack`, navigation title, toolbar, and search wrap the scaffold; the scaffold renders rows + pull-to-refresh + empty state only.
- **Swipe / selection affordances** live on the host's `row` view, not on the scaffold.
- OMD's `FileRow` is the app-supplied `row` slot content, not a design-system component.

## 7. Accessibility

- Row accessibility is host-owned (the row builder's responsibility).
- `LGEmptyState` combines its children for VoiceOver; its optional CTA carries a ≥44pt target.
- Contrast verified ≥4.5:1 against `LGColor.surfaceRaised` / `LGColor.surfaceBase`.

## 8. References

- Scaffold: [`Sources/LifegamesTemplates/ListScaffold.swift`](../../Sources/LifegamesTemplates/ListScaffold.swift)
- Empty-state molecule: [`LGEmptyState.swift`](../../Sources/LifegamesComponents/LGEmptyState.swift)
- ADRs: [`0001`](../adr/0001-omd-screen-staging-strategy.md), [`0002`](../adr/0002-brand-agnostic-molecule-theming.md), [`0003`](../adr/0003-screen-scaffold-p6-override.md)

Experimental via BDFL P6 override (ADR-0003); advances to Beta/Stable per P7 as real surfaces adopt it.
