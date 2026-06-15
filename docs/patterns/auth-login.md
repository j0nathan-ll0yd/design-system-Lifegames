# Auth / Login (iOS)

iOS-platform pattern — no web parity obligation (web is read-only).

## 1. Intent

A single branded auth shell that serves both the Launch (pre-auth splash) and Login surfaces. A centered branding zone sits above a title/subtitle; an optional primary action (e.g. Sign in with Apple) and footer (legal / alternate actions) anchor the bottom. Pure Launch omits the primary action; Login fills it.

## 2. Anatomy

- **Branding slot** — `@ViewBuilder branding` — host-supplied wordmark / backdrop / logo zone. When the host's wordmark is self-contained (custom font / gradient), it lives here and `title` is passed `nil`.
- **Title** — optional `LocalizedStringKey?` (default `nil`), prominent rounded-bold, centered. Omitted entirely when `nil` so a self-contained branding wordmark is not double-headlined.
- **Subtitle** — optional `LocalizedStringKey?`, muted, centered.
- **Background slot** — optional `@ViewBuilder background` — full-bleed backdrop behind the content (ignores safe areas). Omit it (convenience init) to get the template's default neutral surface + accent-tinted radial glow; supply it for a richer host backdrop (layered washes / gradients).
- **Primary action slot** — `@ViewBuilder primaryAction` (defaults to `EmptyView`) — host owns the control and its style/corner-radius.
- **Footer slot** — `@ViewBuilder footer` (defaults to `EmptyView`) — legal copy / alternate actions.

## 3. Props / Slots

Swift type: [`AuthTemplate`](../../Sources/LifegamesTemplates/AuthTemplate.swift)

| Field           | Type                               | Notes                                                                                                              |
| --------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `title`         | `LocalizedStringKey?`              | Optional (default `nil`). Pass `nil` when branding owns the headline.                                              |
| `subtitle`      | `LocalizedStringKey?`              | Optional secondary line.                                                                                           |
| `accent`        | `Color`                            | Default `LGColor.accentDefault`. Tints the default ambient glow.                                                   |
| `branding`      | `@ViewBuilder () -> Branding`      | Wordmark / backdrop zone.                                                                                          |
| `primaryAction` | `@ViewBuilder () -> PrimaryAction` | Defaults to `EmptyView` → Launch. Fill for Login.                                                                  |
| `footer`        | `@ViewBuilder () -> Footer`        | Defaults to `EmptyView`. Legal / alternate actions.                                                                |
| `background`    | `@ViewBuilder () -> some View`     | Full-bleed backdrop, type-erased to `AnyView` internally. Omit (convenience init) → default surface + accent glow. |

Two initializers: the designated one takes a generic `background` builder and erases it to `AnyView` (so the template caps at three type-level generics — `Branding`, `PrimaryAction`, `Footer`, under Swift's ergonomic ceiling); a convenience init omits the slot and fills `AuthTemplateDefaultBackground`. Both default `primaryAction`/`footer` to `EmptyView`. The backdrop is a static full-bleed layer, so the erasure costs nothing in practice.

## 4. States

| State  | Rendering                                                       |
| ------ | --------------------------------------------------------------- |
| Launch | `primaryAction` omitted → only branding + title/subtitle shown. |
| Login  | `primaryAction` filled with the host's auth control.            |

## 5. Variants

Launch vs Login is the only axis, expressed by presence/absence of `primaryAction`. No additional template variants.

## 6. Host-owned boundaries (Part 2)

- **The template does NOT style the auth control.** The host owns the Sign-in-with-Apple button: the HIG-locked style (`.black` / `.white` / `.whiteOutline`), the label (`.signIn` / `.signUp` / `.continue`), corner radius matching the app's token, and the `onRequest` / `onCompletion` handlers. The lock lives in the host, not the design system.
- HIG note: prefer to **delay sign-in and explain why** before presenting it; let users explore first where possible.
- Launch-storyboard / launch-screen guidance is app-local (the static launch asset is not a SwiftUI surface).

## 7. Accessibility

- Title and subtitle honor Dynamic Type.
- The primary action (host-supplied) must carry a ≥44pt touch target and an accessible label; the Sign-in-with-Apple button provides this natively.
- Footer legal copy is selectable/readable; keep contrast ≥4.5:1 against `LGColor.surfaceBase`.

## 8. References

- Template: [`Sources/LifegamesTemplates/AuthTemplate.swift`](../../Sources/LifegamesTemplates/AuthTemplate.swift)
- ADRs: [`docs/adr/0001-omd-screen-staging-strategy.md`](../adr/0001-omd-screen-staging-strategy.md), [`0003-screen-scaffold-p6-override.md`](../adr/0003-screen-scaffold-p6-override.md)

Experimental via BDFL P6 override (ADR-0003); advances to Beta/Stable per P7 as real surfaces adopt it.
