# Auth / Login (iOS)

iOS-platform pattern — no web parity obligation (web is read-only).

## 1. Intent

A single branded auth shell that serves both the Launch (pre-auth splash) and Login surfaces. A centered branding zone sits above a title/subtitle; an optional primary action (e.g. Sign in with Apple) and footer (legal / alternate actions) anchor the bottom. Pure Launch omits the primary action; Login fills it.

## 2. Anatomy

- **Branding slot** — `@ViewBuilder branding` — host-supplied wordmark / backdrop / logo zone. The design system supplies layout and an ambient accent-tinted radial glow only.
- **Title** — `LocalizedStringKey`, prominent rounded-bold, centered.
- **Subtitle** — optional `LocalizedStringKey`, muted, centered.
- **Primary action slot** — `@ViewBuilder primaryAction` (defaults to `EmptyView`) — host owns the control and its style/corner-radius.
- **Footer slot** — `@ViewBuilder footer` (defaults to `EmptyView`) — legal copy / alternate actions.

## 3. Props / Slots

Swift type: [`AuthScaffold`](../../Sources/LifegamesTemplates/AuthScaffold.swift)

| Field           | Type                               | Notes                                                         |
| --------------- | ---------------------------------- | ------------------------------------------------------------- |
| `title`         | `LocalizedStringKey`               | Required. Host-owned copy.                                    |
| `subtitle`      | `LocalizedStringKey?`              | Optional secondary line.                                      |
| `accent`        | `Color`                            | Default `LGColor.accentDefault`. Tints the ambient glow only. |
| `branding`      | `@ViewBuilder () -> Branding`      | Wordmark / backdrop zone.                                     |
| `primaryAction` | `@ViewBuilder () -> PrimaryAction` | Defaults to `EmptyView` → Launch. Fill for Login.             |
| `footer`        | `@ViewBuilder () -> Footer`        | Defaults to `EmptyView`. Legal / alternate actions.           |

## 4. States

| State  | Rendering                                                       |
| ------ | --------------------------------------------------------------- |
| Launch | `primaryAction` omitted → only branding + title/subtitle shown. |
| Login  | `primaryAction` filled with the host's auth control.            |

## 5. Variants

Launch vs Login is the only axis, expressed by presence/absence of `primaryAction`. No additional scaffold variants.

## 6. Host-owned boundaries (Part 2)

- **The scaffold does NOT style the auth control.** The host owns the Sign-in-with-Apple button: the HIG-locked style (`.black` / `.white` / `.whiteOutline`), the label (`.signIn` / `.signUp` / `.continue`), corner radius matching the app's token, and the `onRequest` / `onCompletion` handlers. The lock lives in the host, not the design system.
- HIG note: prefer to **delay sign-in and explain why** before presenting it; let users explore first where possible.
- Launch-storyboard / launch-screen guidance is app-local (the static launch asset is not a SwiftUI surface).

## 7. Accessibility

- Title and subtitle honor Dynamic Type.
- The primary action (host-supplied) must carry a ≥44pt touch target and an accessible label; the Sign-in-with-Apple button provides this natively.
- Footer legal copy is selectable/readable; keep contrast ≥4.5:1 against `LGColor.surfaceBase`.

## 8. References

- Scaffold: [`Sources/LifegamesTemplates/AuthScaffold.swift`](../../Sources/LifegamesTemplates/AuthScaffold.swift)
- ADRs: [`docs/adr/0001-omd-screen-staging-strategy.md`](../adr/0001-omd-screen-staging-strategy.md), [`0003-screen-scaffold-p6-override.md`](../adr/0003-screen-scaffold-p6-override.md)

Experimental via BDFL P6 override (ADR-0003); advances to Beta/Stable per P7 as real surfaces adopt it.
