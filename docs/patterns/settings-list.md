# Settings List (iOS)

iOS-platform pattern — no web parity obligation (web is read-only).

## 1. Intent

A data-model-driven settings surface: an inset-grouped list built from a closed taxonomy of row kinds (navigation / toggle / value / destructive). The closed taxonomy is the right model for settings; a row that doesn't fit belongs in a host-rendered sibling section, not erased into the design system via an `AnyView` escape hatch.

## 2. Anatomy

- **Sections** — `SettingsScaffold.Section` — optional `title` / `footer` `LocalizedStringKey` plus `rows: [Row]`.
- **Rows** — `SettingsScaffold.Row`, a closed enum:
  - `.navigation(label:systemImage:action:)` — chevron row, renders via [`SettingRowView`](../../Sources/LifegamesComponents/SettingRowView.swift) `.chevron`.
  - `.toggle(label:systemImage:isOn:)` — `Binding<Bool>`; tinted with the injected `accent`.
  - `.value(label:systemImage:value:)` — trailing read-only `LocalizedStringKey`, renders via `SettingRowView` `.value`.
  - `.destructive(label:systemImage:action:)` — `LGColor.accentRed`-tinted destructive action.

## 3. Props / Slots

Swift type: [`SettingsScaffold`](../../Sources/LifegamesTemplates/SettingsScaffold.swift)

| Field      | Type                         | Notes                                                  |
| ---------- | ---------------------------- | ------------------------------------------------------ |
| `sections` | `[SettingsScaffold.Section]` | Required. Section = `title?`, `footer?`, `rows`.       |
| `accent`   | `Color`                      | Default `LGColor.accentDefault`. Toggle on-state tint. |

Row molecule: [`SettingRowView`](../../Sources/LifegamesComponents/SettingRowView.swift) — `init(systemImage:label:accessory:accent:)`, `SettingAccessory` ∈ `{ chevron, toggle(isOn:), value(LocalizedStringKey) }`, 44pt min target, `.accessibilityElement(children: .combine)`.

## 4. States

| State         | Rendering                                                       |
| ------------- | --------------------------------------------------------------- |
| Populated     | Each section renders its rows in order.                         |
| Toggle on/off | `.toggle` reflects its `Binding<Bool>`; on-state uses `accent`. |

## 5. Variants

Row kind is the only variant axis; it is a **closed** taxonomy. There is intentionally **no** `custom(AnyView)` row.

## 6. Host-owned boundaries (Part 2)

- A row that doesn't fit the closed taxonomy is rendered in a host-owned sibling section, not pushed into the scaffold.
- `.insetGrouped` presentation and system-appearance respect are honored; the host owns navigation chrome (title, toolbar).

## 7. Accessibility

- `SettingRowView` combines its children for VoiceOver and guarantees a ≥44pt touch target (S70).
- Toggle rows expose the native `Toggle` accessibility; destructive rows use the destructive button role.
- Contrast verified ≥4.5:1 against `LGColor.surfaceRaised` row backgrounds.

## 8. References

- Scaffold: [`Sources/LifegamesTemplates/SettingsScaffold.swift`](../../Sources/LifegamesTemplates/SettingsScaffold.swift)
- Row molecule: [`SettingRowView.swift`](../../Sources/LifegamesComponents/SettingRowView.swift)
- ADRs: [`0001`](../adr/0001-omd-screen-staging-strategy.md), [`0002`](../adr/0002-brand-agnostic-molecule-theming.md), [`0003`](../adr/0003-screen-scaffold-p6-override.md)

Experimental via BDFL P6 override (ADR-0003); advances to Beta/Stable per P7 as real surfaces adopt it.
