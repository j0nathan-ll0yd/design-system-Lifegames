# Account / Profile (iOS)

iOS-platform pattern — no web parity obligation (web is read-only).

## 1. Intent

A profile surface chrome: a centered identity header over a scrolling content zone. The design system owns the _layout_ (header glow + spacing + scroll); the host fills identity and body. Identity is supplied through the header slot — there are deliberately no typed `displayName` / `email` params, because that presumed a person and broke slot purity.

## 2. Anatomy

- **Header slot** — `@ViewBuilder header` — host-supplied identity zone: typically an [`InitialsAvatarView`](../../Sources/LifegamesComponents/InitialsAvatarView.swift) plus a name / email / badge. Rendered over an accent-tinted radial glow.
- **Content slot** — `@ViewBuilder content` — stats, rows, and actions (e.g. [`MetricContentView`](../../Sources/LifegamesComponentsCore/MetricContentView.swift) cards under `.neonCard(accent:)`, `SettingRowView` rows, or a sign-out button).

## 3. Props / Slots

Swift type: [`ProfileTemplate`](../../Sources/LifegamesTemplates/ProfileTemplate.swift)

| Field     | Type                         | Notes                                                        |
| --------- | ---------------------------- | ------------------------------------------------------------ |
| `accent`  | `Color`                      | Default `LGColor.accentDefault`. Tints the header glow only. |
| `header`  | `@ViewBuilder () -> Header`  | Avatar + name / email / badge. Host-owned.                   |
| `content` | `@ViewBuilder () -> Content` | Stats / rows / actions. Host-owned.                          |

Supporting molecules:

| Molecule             | Type                                                                                 | Notes                                               |
| -------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------- |
| `InitialsAvatarView` | [`InitialsAvatarView`](../../Sources/LifegamesComponents/InitialsAvatarView.swift)   | `init(initials:accent:size:)`, accent injected.     |
| `MetricContentView`  | [`MetricContentView`](../../Sources/LifegamesComponentsCore/MetricContentView.swift) | Unstyled stat; caller applies `.neonCard(accent:)`. |

## 4. States

| State         | Rendering                                                           |
| ------------- | ------------------------------------------------------------------- |
| Authenticated | Header shows avatar + identity; content shows stats / rows.         |
| Minimal       | Header may show avatar + name only; content may be a single action. |

## 5. Variants

None at template level — variety lives entirely in the two slots.

## 6. Host-owned boundaries (Part 2)

- Identity strings (name, email, badges) are host-supplied in the header slot; the template never types them.
- HIG note: account **deletion must be reachable** from the profile/settings surface (App Store requirement for accounts that can be created in-app).

## 7. Accessibility

- `InitialsAvatarView` carries an `accessibilityLabel("Avatar")` + `accessibilityValue(initials)`.
- All header/content text honors Dynamic Type; contrast verified ≥4.5:1 against `LGColor.surfaceBase`.
- Interactive content rows must meet the ≥44pt touch target.

## 8. References

- Template: [`Sources/LifegamesTemplates/ProfileTemplate.swift`](../../Sources/LifegamesTemplates/ProfileTemplate.swift)
- Molecules: [`InitialsAvatarView.swift`](../../Sources/LifegamesComponents/InitialsAvatarView.swift), [`MetricContentView.swift`](../../Sources/LifegamesComponentsCore/MetricContentView.swift)
- ADRs: [`0001`](../adr/0001-omd-screen-staging-strategy.md), [`0002`](../adr/0002-brand-agnostic-molecule-theming.md), [`0003`](../adr/0003-screen-scaffold-p6-override.md)

Experimental via BDFL P6 override (ADR-0003); advances to Beta/Stable per P7 as real surfaces adopt it.
